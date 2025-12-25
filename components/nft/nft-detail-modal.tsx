"use client"

import { X, Heart, Share2, ExternalLink, Clock, User, Tag, TrendingUp, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback } from "react"
import { formatLine, parseLine, parseLineRaw } from "@/lib/contracts/decimals"
import { ApprovalModal, type ApprovalStatus } from "./approval-modal"

/**
 * =============================================================================
 * NFT DETAIL MODAL
 * =============================================================================
 *
 * Full auction detail view with bidding functionality.
 *
 * FEATURES:
 * - Live countdown timer
 * - LINE token bidding (not ETH)
 * - Allowance check before bid
 * - Approval modal flow
 * - Transaction status feedback
 */

// Legacy interface for backward compatibility
interface LegacyNFT {
  id: string
  name: string
  creator: string
  image: string
  currentBid: number
  timeLeft: string
  likes: number
  rarity: string
}

// Extended interface for auction data
interface AuctionNFT {
  id: string
  name: string
  creator: string
  image: string
  description?: string
  collection?: string
  currentBid: string // BigInt as string
  highestBidder?: string | null
  startPrice?: string
  minBidIncrement?: string
  endTimeMs?: number
  tokenId?: string
  likes: number
  rarity: string
  attributes?: Array<{ trait_type: string; value: string | number }>
  isAuction?: boolean
  isEnded?: boolean
}

type NFTData = LegacyNFT | AuctionNFT

interface NFTDetailModalProps {
  nft: NFTData
  onClose: () => void
  walletAddress?: string | null
  lineBalance?: bigint
  lineAllowance?: bigint
  onPlaceBid?: (auctionId: string, amount: bigint) => Promise<boolean>
  onApprove?: (amount: bigint) => Promise<boolean>
  onFinalizeAuction?: (auctionId: string) => Promise<boolean>
}

const rarityColors: Record<string, string> = {
  Common: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
  Rare: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  Epic: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  Legendary: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  Mythic: "bg-pink-500/20 text-pink-400 border-pink-500/50",
}

// Calculate time left from timestamp
function calculateTimeLeft(endTimeMs: number | undefined): string {
  if (!endTimeMs) return "No end time"

  const now = Date.now()
  const diff = endTimeMs - now

  if (diff <= 0) return "Ended"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

// Format bid for display
function formatBidDisplay(bid: number | string): string {
  if (typeof bid === "number") return `${bid} LINE`

  try {
    return `${formatLine(BigInt(bid))} LINE`
  } catch {
    return `${bid} LINE`
  }
}

// Calculate minimum next bid
function calculateMinBid(nft: NFTData): bigint {
  if ("highestBidder" in nft && nft.highestBidder) {
    // Has existing bids - min is highest + increment
    const highestBid = parseLineRaw(nft.currentBid as string)
    const increment = parseLineRaw(nft.minBidIncrement || "1000000000") // Default 1 LINE
    return highestBid + increment
  } else if ("startPrice" in nft) {
    // No bids yet - use start price
    return parseLineRaw(nft.startPrice || "0")
  } else {
    // Legacy data - currentBid is number type
    const numericBid = typeof nft.currentBid === 'number'
      ? nft.currentBid
      : parseFloat(String(nft.currentBid)) || 0
    return parseLine(String(numericBid + 0.1))
  }
}

export function NFTDetailModal({
  nft,
  onClose,
  walletAddress,
  lineBalance = 0n,
  lineAllowance = 0n,
  onPlaceBid,
  onApprove,
  onFinalizeAuction,
}: NFTDetailModalProps) {
  const [bidAmount, setBidAmount] = useState("")
  const [liked, setLiked] = useState(false)
  const [timeLeft, setTimeLeft] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("idle")

  // Get auction-specific data
  const endTimeMs = "endTimeMs" in nft ? nft.endTimeMs : undefined
  const legacyTimeLeft = "timeLeft" in nft ? nft.timeLeft : undefined
  const tokenId = "tokenId" in nft ? nft.tokenId : nft.id
  const isAuction = "isAuction" in nft && nft.isAuction
  const isEnded = endTimeMs !== undefined && endTimeMs < Date.now()

  const minBid = calculateMinBid(nft)
  const minBidDisplay = formatLine(minBid)

  // Update time left every second
  useEffect(() => {
    if (!endTimeMs) {
      setTimeLeft(legacyTimeLeft || "No active listing")
      return
    }

    const updateTime = () => {
      setTimeLeft(calculateTimeLeft(endTimeMs))
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [endTimeMs, legacyTimeLeft])

  // Validate bid input
  const validateBid = useCallback(() => {
    if (!bidAmount) return "Enter a bid amount"

    try {
      const bidValue = parseLine(bidAmount)

      if (bidValue < minBid) {
        return `Bid must be at least ${minBidDisplay} LINE`
      }

      if (bidValue > lineBalance) {
        return `Insufficient balance (${formatLine(lineBalance)} LINE available)`
      }

      return null
    } catch {
      return "Invalid bid amount"
    }
  }, [bidAmount, minBid, minBidDisplay, lineBalance])

  const bidError = validateBid()
  const bidValue = bidAmount ? parseLine(bidAmount) : 0n
  const needsApproval = bidValue > lineAllowance

  // Handle bid submission
  const handlePlaceBid = async () => {
    setError(null)

    if (!walletAddress) {
      setError("Please connect your wallet first")
      return
    }

    if (bidError) {
      setError(bidError)
      return
    }

    const bidValue = parseLine(bidAmount)

    // Check if approval needed
    if (bidValue > lineAllowance) {
      setShowApprovalModal(true)
      return
    }

    // Execute bid
    await executeBid(bidValue)
  }

  // Execute bid transaction
  const executeBid = async (amount: bigint) => {
    if (!onPlaceBid) {
      // Fallback for legacy mode
      alert(`Would place bid of ${formatLine(amount)} LINE on ${nft.name}`)
      onClose()
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onPlaceBid(nft.id, amount)
      if (success) {
        onClose()
      } else {
        setError("Bid failed. Please try again.")
      }
    } catch (e) {
      console.error("Bid error:", e)
      setError(e instanceof Error ? e.message : "Bid failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle approval
  const handleApprove = async (): Promise<boolean> => {
    if (!onApprove) {
      setShowApprovalModal(false)
      return false
    }

    setApprovalStatus("approving")
    setError(null)

    try {
      const success = await onApprove(bidValue)
      if (success) {
        setApprovalStatus("approved")
        return true
      } else {
        setApprovalStatus("error")
        setError("Approval failed")
        return false
      }
    } catch (e) {
      console.error("Approval error:", e)
      setApprovalStatus("error")
      setError(e instanceof Error ? e.message : "Approval failed")
      return false
    }
  }

  // After approval success, proceed to bid
  const handleApprovalSuccess = () => {
    setShowApprovalModal(false)
    setApprovalStatus("idle")
    executeBid(bidValue)
  }

  // Handle finalize auction
  const handleFinalizeAuction = async () => {
    console.log('[NFTDetailModal] handleFinalizeAuction called', {
      hasOnFinalizeAuction: !!onFinalizeAuction,
      nftId: nft.id,
      isEnded
    })

    if (!onFinalizeAuction) {
      console.log('[NFTDetailModal] onFinalizeAuction not provided')
      return
    }

    setIsFinalizing(true)
    setError(null)

    try {
      console.log('[NFTDetailModal] Calling onFinalizeAuction with id:', nft.id)
      const success = await onFinalizeAuction(nft.id)
      console.log('[NFTDetailModal] onFinalizeAuction result:', success)
      if (success) {
        onClose()
      } else {
        setError("Failed to finalize auction")
      }
    } catch (e) {
      console.error("[NFTDetailModal] Finalize error:", e)
      setError(e instanceof Error ? e.message : "Finalization failed")
    } finally {
      setIsFinalizing(false)
    }
  }

  // No bid history from contract (would need event indexing)
  // Just show current highest bidder if exists
  const highestBidder = "highestBidder" in nft ? nft.highestBidder : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative aspect-square md:aspect-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
            <img src={nft.image || "/placeholder.svg"} alt={nft.name} className="w-full h-full object-cover" />

            {/* Overlay Actions */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <Badge className={`${rarityColors[nft.rarity] || rarityColors.Common} text-sm`}>{nft.rarity}</Badge>
              <div className="flex gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2 rounded-full backdrop-blur-sm transition-all ${liked ? "bg-red-500/20 text-red-500" : "bg-black/40 text-white hover:text-red-500"
                    }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                </button>
                <button className="p-2 rounded-full bg-black/40 text-white hover:text-primary transition-colors backdrop-blur-sm">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full bg-black/40 text-white hover:text-primary transition-colors backdrop-blur-sm">
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">{nft.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Created by</span>
                <span className="text-primary font-medium">{nft.creator}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Heart className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <p className="text-lg font-bold">{nft.likes}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-lg font-bold">{highestBidder ? "1+" : "0"}</p>
                <p className="text-xs text-muted-foreground">Bids</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Tag className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">#{tokenId}</p>
                <p className="text-xs text-muted-foreground">Token ID</p>
              </div>
            </div>

            {/* Collection & Description */}
            {"collection" in nft && nft.collection && (
              <div className="mb-4">
                <span className="text-xs font-medium text-muted-foreground">COLLECTION</span>
                <p className="text-sm font-semibold text-primary">{nft.collection}</p>
              </div>
            )}

            {"description" in nft && nft.description && (
              <div className="mb-6">
                <span className="text-xs font-medium text-muted-foreground">DESCRIPTION</span>
                <p className="text-sm text-foreground/80 mt-1">{nft.description}</p>
              </div>
            )}

            {/* Attributes Grid */}
            {"attributes" in nft && nft.attributes && nft.attributes.length > 0 && (
              <div className="mb-6">
                <span className="text-xs font-medium text-muted-foreground mb-2 block">ATTRIBUTES</span>
                <div className="grid grid-cols-2 gap-2">
                  {nft.attributes.map((attr, index) => (
                    <div
                      key={index}
                      className="bg-background/50 border border-border/50 rounded-lg p-2 text-center"
                    >
                      <p className="text-[10px] uppercase text-muted-foreground">{attr.trait_type}</p>
                      <p className="text-sm font-medium truncate">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Bid */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-6 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Bid</p>
                  <p className="text-3xl font-bold text-primary">{formatBidDisplay(nft.currentBid)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Time Left</span>
                  </div>
                  <p className={`font-bold text-lg ${isEnded ? "text-red-500" : ""}`}>{timeLeft}</p>
                </div>
              </div>
            </div>

            {/* Place Bid */}
            {!isEnded && (
              <div className="mb-6">
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Bid (LINE) - Minimum: {minBidDisplay}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={`Min: ${minBidDisplay} LINE`}
                    value={bidAmount}
                    onChange={(e) => {
                      const val = e.target.value
                      // Prevent negative values
                      if (val === '' || parseFloat(val) >= 0) {
                        setBidAmount(val)
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-background/50 border-border/50 focus:border-primary"
                  />
                  <Button
                    onClick={handlePlaceBid}
                    disabled={isSubmitting || !bidAmount || !!bidError}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bidding...
                      </>
                    ) : needsApproval && bidAmount ? (
                      "Approve & Bid"
                    ) : (
                      "Place Bid"
                    )}
                  </Button>
                </div>
                {bidError && bidAmount && (
                  <p className="text-sm text-red-500 mt-1">{bidError}</p>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {isEnded && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-500 font-semibold text-center mb-3">This auction has ended</p>
                {onFinalizeAuction && (
                  <Button
                    onClick={() => handleFinalizeAuction()}
                    disabled={isFinalizing}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
                  >
                    {isFinalizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finalizing...
                      </>
                    ) : (
                      "Finalize Auction"
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Highest Bidder */}
            <div className="flex-1">
              <h3 className="font-semibold mb-3">Current Highest Bidder</h3>
              <div className="space-y-2">
                {highestBidder ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div>
                      <p className="font-medium">{highestBidder.slice(0, 8)}...{highestBidder.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">Leading bidder</p>
                    </div>
                    <p className="font-bold text-primary">{formatBidDisplay(nft.currentBid)}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No bids yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false)
          setApprovalStatus("idle")
        }}
        onApprove={handleApprove}
        onApproveSuccess={handleApprovalSuccess}
        requiredAmount={bidValue}
        currentAllowance={lineAllowance}
        status={approvalStatus}
        error={error || undefined}
      />
    </div>
  )
}
