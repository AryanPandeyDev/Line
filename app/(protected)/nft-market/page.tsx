"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Grid3X3, LayoutList, ChevronDown, Sparkles, Loader2, RefreshCw, Clock, Gavel, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NFTCard } from "@/components/nft/nft-card"
import { NFTDetailModal } from "@/components/nft/nft-detail-modal"
import { RefundPayoutBanner } from "@/components/nft/refund-payout-banner"
import { formatLine } from "@/lib/contracts/decimals"
import { useMarketplaceActions } from "@/hooks/useMarketplaceActions"
import { useAppSelector } from "@/lib/redux/hooks"
import { selectWallet } from "@/lib/redux/slices/wallet-slice"

/**
 * =============================================================================
 * NFT MARKET PAGE - PURE ON-CHAIN DATA
 * =============================================================================
 *
 * Displays ONLY auctions from the Marketplace contract.
 * NO mock data. If no auctions exist, shows empty state.
 *
 * UI States per auction:
 * - Active: Show countdown, bid input
 * - Ended, not finalized: Show "Auction ended", "Finalize" button
 * - Settled: Not shown (filtered by contract query)
 */

const sortOptions = ["Price: High to Low", "Price: Low to High", "Ending Soon", "Most Bids"]

// Type for serialized auction from API
interface SerializedAuction {
  auctionId: string
  nftProgramId: string
  tokenId: string
  seller: string
  startPrice: string
  highestBid: string
  highestBidder: string | null
  endTimeMs: string
  settled: boolean
  extensionWindowMs: string
  minBidIncrement: string
  isEnded: boolean
  metadata: {
    name?: string
    description?: string
    image?: string
    collection?: string
    rarity?: string
    creator?: string
    attributes?: Array<{ trait_type: string; value: string | number }>
  } | null
}

export default function NFTMarketPage() {
  // Get wallet from Redux (same as withdrawal modal)
  const wallet = useAppSelector(selectWallet)
  const walletAddress = wallet.addressRaw || wallet.address || null

  // State
  const [sortBy, setSortBy] = useState("Price: High to Low")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAuction, setSelectedAuction] = useState<SerializedAuction | null>(null)

  // Auction data from contract
  const [auctions, setAuctions] = useState<SerializedAuction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pending refund/payout (global, not per-auction)
  const [pendingRefund, setPendingRefund] = useState<bigint>(0n)
  const [pendingPayout, setPendingPayout] = useState<bigint>(0n)
  const [isClaiming, setIsClaiming] = useState(false)

  // User's on-chain LINE balance for bid validation
  const [lineBalance, setLineBalance] = useState<bigint>(0n)

  // Marketplace actions hook for signing transactions
  const {
    finalizeAuction,
    placeBid,
    approveLineForMarketplace,
    claimRefund,
    claimPayout,
    state: actionState,
    reset: resetActionState
  } = useMarketplaceActions(walletAddress, () => {
    // Refresh data after successful transaction
    fetchAuctions()
    fetchPending()
  })

  // Fetch auctions from on-chain via API
  const fetchAuctions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auctions')
      const data = await response.json()

      if (data.success) {
        setAuctions(data.auctions || [])
      } else {
        setAuctions([])
        if (data.error) {
          setError(data.error)
        }
      }
    } catch (err) {
      console.error('Failed to fetch auctions:', err)
      setAuctions([]) // Empty on error, not mock data
      setError('Failed to connect to contract')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch pending refund/payout and LINE balance for connected wallet
  const fetchPending = useCallback(async () => {
    if (!walletAddress) {
      setPendingRefund(0n)
      setPendingPayout(0n)
      setLineBalance(0n)
      return
    }

    try {
      // Fetch refund
      const refundRes = await fetch(`/api/user/pending?type=refund&address=${walletAddress}`)
      if (refundRes.ok) {
        const data = await refundRes.json()
        if (data.success) {
          setPendingRefund(BigInt(data.amount || '0'))
        }
      }

      // Fetch payout
      const payoutRes = await fetch(`/api/user/pending?type=payout&address=${walletAddress}`)
      if (payoutRes.ok) {
        const data = await payoutRes.json()
        if (data.success) {
          setPendingPayout(BigInt(data.amount || '0'))
        }
      }

      // Fetch on-chain LINE balance
      const balanceRes = await fetch(`/api/wallet/state?addressRaw=${walletAddress}`)
      if (balanceRes.ok) {
        const data = await balanceRes.json()
        if (data.lineRaw) {
          setLineBalance(BigInt(data.lineRaw))
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending items:', err)
      // Keep existing values on error
    }
  }, [walletAddress])

  // Initial fetch
  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  // Fetch pending when wallet changes
  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAuctions()
      if (walletAddress) fetchPending()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchAuctions, fetchPending, walletAddress])

  // Handle claim via useMarketplaceActions hook
  const handleClaim = async (type: 'refund' | 'payout') => {
    setIsClaiming(true)
    try {
      let success = false
      if (type === 'refund') {
        success = await claimRefund()
      } else {
        success = await claimPayout()
      }

      if (success) {
        // Refresh pending amounts after successful claim
        await fetchPending()
      }
    } finally {
      setIsClaiming(false)
    }
  }

  // Filter by search
  const filteredAuctions = auctions.filter((auction) => {
    const name = auction.metadata?.name || `NFT #${auction.tokenId}`
    const creator = auction.metadata?.creator || auction.seller
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Sort
  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    const bidA = BigInt(a.highestBid || '0')
    const bidB = BigInt(b.highestBid || '0')
    const endA = BigInt(a.endTimeMs)
    const endB = BigInt(b.endTimeMs)

    if (sortBy === 'Price: High to Low') return bidB > bidA ? 1 : -1
    if (sortBy === 'Price: Low to High') return bidA > bidB ? 1 : -1
    if (sortBy === 'Ending Soon') return Number(endA - endB)
    return 0 // Default
  })

  // Separate active vs ended-but-not-finalized
  const activeAuctions = sortedAuctions.filter(a => !a.isEnded)
  const endedAuctions = sortedAuctions.filter(a => a.isEnded)

  // Convert auction to NFTCard format
  const toNftCardFormat = (auction: SerializedAuction) => ({
    id: auction.auctionId,
    name: auction.metadata?.name || `NFT #${auction.tokenId}`,
    creator: auction.metadata?.creator || `${auction.seller.slice(0, 8)}...`,
    image: auction.metadata?.image || '/placeholder.svg',
    description: auction.metadata?.description || '',
    collection: auction.metadata?.collection || 'LINE Genesis',
    currentBid: auction.highestBid,
    startPrice: auction.startPrice,
    minBidIncrement: auction.minBidIncrement,
    endTimeMs: Number(auction.endTimeMs),
    highestBidder: auction.highestBidder,
    likes: 0,
    rarity: auction.metadata?.rarity || 'Common',
    attributes: auction.metadata?.attributes || [],
    isAuction: true,
    isEnded: auction.isEnded,
  })

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("/images/nfts-20-281-29.jpeg")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 px-8 py-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              FANTASY
            </span>
            <span className="block text-foreground mt-2">NFT MARKET</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Live on-chain auctions powered by LINE tokens. All data from blockchain - no mocks.
          </p>
        </div>
      </div>

      {/* Global Pending Refund/Payout Banner */}
      {(pendingRefund > 0n || pendingPayout > 0n) && (
        <div className="px-4 mb-6">
          <RefundPayoutBanner
            pendingRefund={pendingRefund}
            pendingPayout={pendingPayout}
            onClaimRefund={() => handleClaim('refund')}
            onClaimPayout={() => handleClaim('payout')}
            isClaimingRefund={isClaiming}
            isClaimingPayout={isClaiming}
          />
        </div>
      )}

      {/* Transaction Status Banner */}
      {actionState.status === 'error' && actionState.error && (
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Transaction Failed</p>
              <p className="text-sm opacity-90">{actionState.error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetActionState}
              className="text-destructive hover:text-destructive"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {actionState.status === 'signing' && (
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
            <div>
              <p className="font-semibold">Signing Transaction...</p>
              <p className="text-sm opacity-90">Please confirm in SubWallet</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="px-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center w-full">
            <div className="relative flex-1 lg:flex-none lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50 focus:border-primary"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-card/50 border-border/50">
                  {sortBy}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                {sortOptions.map((option) => (
                  <DropdownMenuItem key={option} onClick={() => setSortBy(option)}>
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchAuctions}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
              title="Refresh from blockchain"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <div className="flex gap-1 bg-card/50 rounded-lg p-1 border border-border/50 ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && auctions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading from blockchain...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && auctions.length === 0 && (
        <div className="text-center py-16 px-4">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Auctions</h3>
          <p className="text-muted-foreground mb-4">
            {error
              ? `Error: ${error}`
              : "There are currently no auctions on the marketplace contract."}
          </p>
          <Button onClick={fetchAuctions} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}

      {/* Active Auctions Section */}
      {activeAuctions.length > 0 && (
        <div className="px-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">Active Auctions ({activeAuctions.length})</h2>
          </div>
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {activeAuctions.map((auction) => (
              <NFTCard
                key={auction.auctionId}
                nft={toNftCardFormat(auction)}
                viewMode={viewMode}
                onSelect={() => setSelectedAuction(auction)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ended But Not Finalized Section */}
      {endedAuctions.length > 0 && (
        <div className="px-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Awaiting Finalization ({endedAuctions.length})</h2>
          </div>
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {endedAuctions.map((auction) => (
              <NFTCard
                key={auction.auctionId}
                nft={toNftCardFormat(auction)}
                viewMode={viewMode}
                onSelect={() => setSelectedAuction(auction)}
              />
            ))}
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedAuction && (
        <NFTDetailModal
          nft={toNftCardFormat(selectedAuction)}
          onClose={() => {
            setSelectedAuction(null)
            resetActionState()
          }}
          walletAddress={walletAddress}
          lineBalance={lineBalance}
          onFinalizeAuction={async (auctionId: string) => {
            const success = await finalizeAuction(auctionId)
            if (success) {
              setSelectedAuction(null)
            }
            return success
          }}
          onPlaceBid={async (auctionId: string, amount: bigint) => {
            const success = await placeBid(auctionId, amount)
            if (success) {
              setSelectedAuction(null)
            }
            return success
          }}
          onApprove={async (amount: bigint) => {
            const success = await approveLineForMarketplace(amount)
            return success
          }}
        />
      )}
    </div>
  )
}
