"use client"

import Image from "next/image"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Diamond } from "lucide-react"
import { NeonCard } from "@/components/ui/neon-card"
import { NeonButton } from "@/components/ui/neon-button"
import { cn } from "@/lib/utils"

const nfts = [
  {
    id: 1,
    name: "Cyber Wolf",
    rarity: "Epic",
    price: 1200,
    image: "/cyberpunk-wolf-with-neon-blue-eyes-and-chrome-armo.jpg",
  },
  {
    id: 2,
    name: "Neon Samurai",
    rarity: "Legendary",
    price: 5000,
    image: "/neon-samurai-warrior-with-glowing-katana-cyberpunk.jpg",
  },
  {
    id: 3,
    name: "Chrome Dragon",
    rarity: "Legendary",
    price: 8500,
    image: "/chrome-mechanical-dragon-with-glowing-purple-eyes-.jpg",
  },
  {
    id: 4,
    name: "Void Fox",
    rarity: "Epic",
    price: 1800,
    image: "/ethereal-fox-made-of-dark-matter-with-magenta-ener.jpg",
  },
  {
    id: 5,
    name: "Holo Mask",
    rarity: "Rare",
    price: 450,
    image: "/holographic-cyber-mask-with-shifting-colors-futuri.jpg",
  },
  {
    id: 6,
    name: "Synth Ranger",
    rarity: "Common",
    price: 120,
    image: "/synthwave-ranger-with-visor-and-cyber-bow-neon-col.jpg",
  },
]

const rarityColors: Record<string, string> = {
  Common: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  Rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  Epic: "text-neon-purple border-neon-purple/30 bg-neon-purple/10",
  Legendary: "text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10",
}

export function LandingNFTShowcase() {
  const [activeIndex, setActiveIndex] = useState(1)

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % nfts.length)
  }

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + nfts.length) % nfts.length)
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
              <span className="text-neon-magenta">FANTASY</span>
              <span className="block text-2xl sm:text-3xl mt-1">NFT COLLECTION</span>
            </h2>
            <p className="text-muted-foreground max-w-md">
              Discover exclusive digital collectibles. Buy, sell, and showcase unique art.
            </p>
          </div>

          {/* Navigation arrows */}
          <div className="flex gap-2">
            <button
              onClick={prevSlide}
              className="w-12 h-12 rounded-xl border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              aria-label="Previous NFT"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="w-12 h-12 rounded-xl border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              aria-label="Next NFT"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* NFT Carousel */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {nfts.map((nft, index) => (
              <NeonCard
                key={nft.id}
                glowColor={nft.rarity === "Legendary" ? "magenta" : nft.rarity === "Epic" ? "purple" : "cyan"}
                className={cn(
                  "flex-shrink-0 w-64 sm:w-72 snap-center transition-all duration-300",
                  index === activeIndex ? "scale-105 z-10" : "scale-100 opacity-70",
                )}
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden rounded-t-xl">
                  <Image
                    src={nft.image || "/placeholder.svg"}
                    alt={nft.name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-110"
                  />

                  {/* Rarity badge */}
                  <div
                    className={cn(
                      "absolute top-3 left-3 px-3 py-1 rounded-full border text-xs font-medium",
                      rarityColors[nft.rarity],
                    )}
                  >
                    {nft.rarity}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{nft.name}</h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Bid</p>
                      <div className="flex items-center gap-1">
                        <Diamond className="w-4 h-4 text-primary" />
                        <span className="font-bold text-primary">{nft.price.toLocaleString()} LINE</span>
                      </div>
                    </div>

                    <NeonButton variant="outline" size="sm">
                      Place Bid
                    </NeonButton>
                  </div>
                </div>
              </NeonCard>
            ))}
          </div>
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <NeonButton variant="secondary" size="lg">
            Explore All NFTs
          </NeonButton>
        </div>
      </div>
    </section>
  )
}
