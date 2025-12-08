"use client"

import { X, Heart, Share2, ExternalLink, Clock, User, Tag, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface NFT {
  id: string
  name: string
  creator: string
  image: string
  currentBid: number
  timeLeft: string
  likes: number
  rarity: string
}

interface NFTDetailModalProps {
  nft: NFT
  onClose: () => void
}

const rarityColors: Record<string, string> = {
  Common: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
  Rare: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  Epic: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  Legendary: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  Mythic: "bg-pink-500/20 text-pink-400 border-pink-500/50",
}

const bidHistory = [
  { bidder: "0x1a2b...3c4d", amount: 15.6, time: "2 hours ago" },
  { bidder: "0x5e6f...7g8h", amount: 14.2, time: "5 hours ago" },
  { bidder: "0x9i0j...1k2l", amount: 12.8, time: "1 day ago" },
]

export function NFTDetailModal({ nft, onClose }: NFTDetailModalProps) {
  const [bidAmount, setBidAmount] = useState("")
  const [liked, setLiked] = useState(false)

  const handlePlaceBid = () => {
    if (!bidAmount || Number.parseFloat(bidAmount) <= nft.currentBid) {
      alert("Please enter a bid higher than the current bid")
      return
    }
    alert(`Bid of ${bidAmount} ETH placed successfully!`)
    onClose()
  }

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
              <Badge className={`${rarityColors[nft.rarity]} text-sm`}>{nft.rarity}</Badge>
              <div className="flex gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                    liked ? "bg-red-500/20 text-red-500" : "bg-black/40 text-white hover:text-red-500"
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
                <p className="text-lg font-bold">12</p>
                <p className="text-xs text-muted-foreground">Bids</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <Tag className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">#2451</p>
                <p className="text-xs text-muted-foreground">Token ID</p>
              </div>
            </div>

            {/* Current Bid */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-6 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Bid</p>
                  <p className="text-3xl font-bold text-primary">{nft.currentBid} ETH</p>
                  <p className="text-sm text-muted-foreground">≈ ${(nft.currentBid * 2150).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Time Left</span>
                  </div>
                  <p className="font-bold text-lg">{nft.timeLeft}</p>
                </div>
              </div>
            </div>

            {/* Place Bid */}
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">Your Bid (ETH)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min={nft.currentBid + 0.1}
                  placeholder={`Min: ${(nft.currentBid + 0.1).toFixed(1)} ETH`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary"
                />
                <Button
                  onClick={handlePlaceBid}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 px-8"
                >
                  Place Bid
                </Button>
              </div>
            </div>

            {/* Bid History */}
            <div className="flex-1">
              <h3 className="font-semibold mb-3">Bid History</h3>
              <div className="space-y-2">
                {bidHistory.map((bid, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div>
                      <p className="font-medium">{bid.bidder}</p>
                      <p className="text-xs text-muted-foreground">{bid.time}</p>
                    </div>
                    <p className="font-bold text-primary">{bid.amount} ETH</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
