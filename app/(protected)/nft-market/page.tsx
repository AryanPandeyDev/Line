"use client"

import { useState } from "react"
import { Search, Grid3X3, LayoutList, ChevronDown, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NFTCard } from "@/components/nft/nft-card"
import { NFTDetailModal } from "@/components/nft/nft-detail-modal"

const categories = ["All", "New Drops", "Most Viewed", "Bids", "Relisted"]
const sortOptions = ["Price: High to Low", "Price: Low to High", "Recently Listed", "Most Popular"]

const mockNFTs = [
  {
    id: "1",
    name: "Cyber Phantom",
    creator: "NeonArtist",
    image: "/cyberpunk-phantom-warrior-neon-purple.jpg",
    currentBid: 15.6,
    timeLeft: "2d 10hrs 45min",
    likes: 234,
    rarity: "Legendary",
  },
  {
    id: "2",
    name: "Digital Dragon",
    creator: "CryptoMaster",
    image: "/digital-dragon-creature-neon-scales.jpg",
    currentBid: 8.2,
    timeLeft: "1d 5hrs 20min",
    likes: 189,
    rarity: "Epic",
  },
  {
    id: "3",
    name: "Neon Samurai",
    creator: "ArtBlock79",
    image: "/neon-samurai-warrior-cyberpunk-helmet.jpg",
    currentBid: 66.4,
    timeLeft: "4d 12hrs 8min",
    likes: 567,
    rarity: "Mythic",
  },
  {
    id: "4",
    name: "Ghost Protocol",
    creator: "PunkGFX",
    image: "/ghost-mask-scream-horror-neon.jpg",
    currentBid: 4.8,
    timeLeft: "12hrs 30min",
    likes: 98,
    rarity: "Rare",
  },
  {
    id: "5",
    name: "Eye Killer",
    creator: "MaxHe@Ble",
    image: "/robotic-skull-red-eyes-cyberpunk.jpg",
    currentBid: 12.1,
    timeLeft: "3d 8hrs 15min",
    likes: 312,
    rarity: "Epic",
  },
  {
    id: "6",
    name: "Don Miguelio",
    creator: "NFT@Art79",
    image: "/mysterious-hooded-figure-orange-glow.jpg",
    currentBid: 66.4,
    timeLeft: "4d 12hrs 43min",
    likes: 445,
    rarity: "Legendary",
  },
  {
    id: "7",
    name: "Mecha Beast",
    creator: "RoboArt",
    image: "/mechanical-beast-dinosaur-neon-blue.jpg",
    currentBid: 23.5,
    timeLeft: "2d 3hrs 10min",
    likes: 278,
    rarity: "Epic",
  },
  {
    id: "8",
    name: "Void Walker",
    creator: "DarkVision",
    image: "/dark-figure-walking-void-purple-portal.jpg",
    currentBid: 31.2,
    timeLeft: "5d 14hrs 22min",
    likes: 389,
    rarity: "Mythic",
  },
]

export default function NFTMarketPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Price: High to Low")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNFT, setSelectedNFT] = useState<(typeof mockNFTs)[0] | null>(null)

  const filteredNFTs = mockNFTs.filter(
    (nft) =>
      nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.creator.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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
            The world's first and largest digital marketplace for crypto collectibles and non-fungible tokens (NFTs).
            Buy, sell, and discover exclusive digital items.
          </p>
          <Button className="mt-6 bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-6 text-lg">
            Learn More
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-neon-primary"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search and Controls */}
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
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
                  <DropdownMenuItem key={option} onClick={() => setSortBy(option)} className="cursor-pointer">
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex gap-1 bg-card/50 rounded-lg p-1 border border-border/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="px-4 pb-8">
        <div
          className={`grid gap-6 ${
            viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          }`}
        >
          {filteredNFTs.map((nft) => (
            <NFTCard key={nft.id} nft={nft} viewMode={viewMode} onSelect={() => setSelectedNFT(nft)} />
          ))}
        </div>

        {filteredNFTs.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* NFT Detail Modal */}
      {selectedNFT && <NFTDetailModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} />}
    </div>
  )
}
