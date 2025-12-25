"use client"

import type React from "react"
import { Heart, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useCallback } from "react"

/**
 * =============================================================================
 * NFT CARD COMPONENT
 * =============================================================================
 * 
 * Displays NFT auction card with:
 * - Live countdown timer (updates every second when < 1 hour)
 * - LINE token amounts (not ETH)
 * - Support for both legacy mock data and new auction data
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
  currentBid: string // BigInt as string for LINE
  endTimeMs?: number // Auction end timestamp
  likes: number
  rarity: string
  isAuction?: boolean // Flag to indicate this is real auction data
}

type NFTData = LegacyNFT | AuctionNFT

interface NFTCardProps {
  nft: NFTData
  viewMode: "grid" | "list"
  onSelect: () => void
}

const rarityColors: Record<string, string> = {
  Common: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
  Rare: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  Epic: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  Legendary: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  Mythic: "bg-pink-500/20 text-pink-400 border-pink-500/50",
}

/**
 * Calculate time left from end timestamp
 */
function calculateTimeLeft(endTimeMs: number): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isEnded: boolean
  totalMs: number
} {
  const now = Date.now()
  const diff = endTimeMs - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true, totalMs: 0 }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isEnded: false,
    totalMs: diff,
  }
}

/**
 * Format time left for display
 */
function formatTimeLeftDisplay(endTimeMs: number | undefined, legacyTimeLeft?: string): string {
  // Use legacy timeLeft if no endTimeMs
  if (endTimeMs === undefined) {
    return legacyTimeLeft || "No active listing"
  }

  const { days, hours, minutes, seconds, isEnded } = calculateTimeLeft(endTimeMs)

  if (isEnded) return "Ended"

  // Show seconds when less than 1 hour
  if (days === 0 && hours === 0) {
    return `${minutes}m ${seconds}s`
  }

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  return `${hours}h ${minutes}m`
}

/**
 * Format bid amount for display
 */
function formatBidDisplay(bid: number | string): string {
  // If it's a number (legacy), display as-is
  if (typeof bid === "number") {
    return `${bid} LINE`
  }

  // If it's a BigInt string, convert to human readable
  try {
    const bigIntValue = BigInt(bid)
    const LINE_DECIMALS = 9n
    const BASE = 10n ** LINE_DECIMALS

    const intPart = bigIntValue / BASE
    const fracPart = bigIntValue % BASE

    if (fracPart === 0n) {
      return `${intPart.toString()} LINE`
    }

    const fracStr = fracPart.toString().padStart(9, "0").replace(/0+$/, "").slice(0, 2)
    return `${intPart}.${fracStr} LINE`
  } catch {
    return `${bid} LINE`
  }
}

/**
 * Live countdown hook
 */
function useCountdown(endTimeMs: number | undefined) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  const updateTime = useCallback(() => {
    setTimeLeft(formatTimeLeftDisplay(endTimeMs))
  }, [endTimeMs])

  useEffect(() => {
    if (endTimeMs === undefined) return

    // Initial update
    updateTime()

    // Calculate interval based on time remaining
    const remaining = endTimeMs - Date.now()
    // Update every second if less than 1 hour, otherwise every minute
    const interval = remaining < 60 * 60 * 1000 ? 1000 : 60000

    const timer = setInterval(updateTime, interval)
    return () => clearInterval(timer)
  }, [endTimeMs, updateTime])

  return timeLeft
}

export function NFTCard({ nft, viewMode, onSelect }: NFTCardProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(nft.likes)

  // Get endTimeMs if available (auction data)
  const endTimeMs = "endTimeMs" in nft ? nft.endTimeMs : undefined
  const legacyTimeLeft = "timeLeft" in nft ? nft.timeLeft : undefined

  // Use live countdown for auction data
  const displayTimeLeft = useCountdown(endTimeMs) || formatTimeLeftDisplay(endTimeMs, legacyTimeLeft)
  const displayBid = formatBidDisplay(nft.currentBid)

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiked(!liked)
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))
  }

  // Check if auction has ended
  const isEnded = endTimeMs !== undefined && endTimeMs < Date.now()

  if (viewMode === "list") {
    return (
      <div
        onClick={onSelect}
        className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
      >
        <div className="flex items-center gap-6 p-4">
          {/* Image */}
          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
            <img src={nft.image || "/placeholder.svg"} alt={nft.name} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{nft.name}</h3>
              <Badge className={`text-xs ${rarityColors[nft.rarity] || rarityColors.Common}`}>{nft.rarity}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">by {nft.creator}</p>
          </div>

          {/* Bid Info */}
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Bid</p>
            <p className="text-xl font-bold text-primary">{displayBid}</p>
          </div>

          {/* Time Left */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className={`text-sm ${isEnded ? "text-red-500" : ""}`}>{displayTimeLeft}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
              <span className="text-sm">{likeCount}</span>
            </button>
            <Button
              className="bg-primary hover:bg-primary/80"
              disabled={isEnded}
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
            >
              {isEnded ? "Ended" : "Place Bid"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onSelect}
      className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all" />

      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        <img
          src={nft.image || "/placeholder.svg"}
          alt={nft.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Rarity Badge */}
        <Badge className={`absolute top-3 left-3 ${rarityColors[nft.rarity] || rarityColors.Common}`}>{nft.rarity}</Badge>

        {/* Ended Badge */}
        {isEnded && (
          <Badge className="absolute top-3 right-12 bg-red-500/80 text-white border-red-500">Ended</Badge>
        )}

        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${liked ? "bg-red-500/20 text-red-500" : "bg-black/40 text-white/70 hover:text-red-500"
            }`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
        </button>

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{nft.name}</h3>
            <p className="text-sm text-muted-foreground">by {nft.creator}</p>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{likeCount}</span>
          </div>
        </div>

        {/* Bid Info */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-background/50">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="font-bold text-primary">{displayBid}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time Left
            </p>
            <p className={`font-medium text-sm ${isEnded ? "text-red-500" : ""}`}>{displayTimeLeft}</p>
          </div>
        </div>

        {/* Place Bid Button */}
        <Button
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          disabled={isEnded}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          {isEnded ? "Auction Ended" : "Place Bid"}
        </Button>
      </div>

      {/* Border glow on hover */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/50 group-hover:shadow-neon-primary transition-all pointer-events-none" />
    </div>
  )
}
