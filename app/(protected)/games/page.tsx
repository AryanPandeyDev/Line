"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Gamepad2, Star, Users, Clock, Bell, Sparkles, Play, ChevronRight } from "lucide-react"
import { NeonCard } from "@/components/ui/neon-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Games are coming soon - this is the placeholder state
const hasGames = false

const mockGames = [
  {
    id: 1,
    title: "Neon Racers",
    description: "High-speed racing through cyberpunk cities",
    image: "/cyberpunk-racing-game-neon.jpg",
    category: "Racing",
    players: "12.5K",
    rating: 4.8,
    rewards: "50-200 LINE",
    status: "coming-soon",
  },
  {
    id: 2,
    title: "Cyber Arena",
    description: "Battle royale in a futuristic digital arena",
    image: "/battle-royale-cyberpunk-arena.jpg",
    category: "Action",
    players: "28K",
    rating: 4.9,
    rewards: "100-500 LINE",
    status: "coming-soon",
  },
  {
    id: 3,
    title: "Void Explorers",
    description: "Explore procedurally generated digital dimensions",
    image: "/space-exploration-game-neon.jpg",
    category: "Adventure",
    players: "8.2K",
    rating: 4.6,
    rewards: "30-150 LINE",
    status: "coming-soon",
  },
  {
    id: 4,
    title: "Synth Poker",
    description: "High-stakes poker with NFT collectibles",
    image: "/cyberpunk-poker-card-game.jpg",
    category: "Cards",
    players: "5.1K",
    rating: 4.5,
    rewards: "20-1000 LINE",
    status: "coming-soon",
  },
]

const categories = ["All", "Racing", "Action", "Adventure", "Cards", "Strategy", "Puzzle"]

export default function GamesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [notifyEmail, setNotifyEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault()
    if (notifyEmail) {
      setIsSubscribed(true)
      setNotifyEmail("")
    }
  }

  if (!hasGames) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Games</h1>
        </div>

        {/* Coming Soon Card */}
        <NeonCard className="relative overflow-hidden" glowColor="purple">
          {/* Background gradient */}
          <div className="absolute inset-0 gradient-neon opacity-50" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative p-8 sm:p-12 lg:p-16 text-center">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center animate-float">
              <Gamepad2 className="w-12 h-12 text-background" />
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
              <span className="neon-text-magenta">GAMES</span> <span className="text-foreground">COMING SOON</span>
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              We{"'"}re crafting an incredible collection of Web3 games for the LINE universe. Play to earn, compete
              with friends, and collect exclusive rewards.
            </p>

            {/* Features preview */}
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <Sparkles className="w-8 h-8 text-neon-cyan mx-auto mb-3" />
                <h3 className="font-bold mb-1">Play to Earn</h3>
                <p className="text-sm text-muted-foreground">Win LINE tokens through gameplay</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <Users className="w-8 h-8 text-neon-magenta mx-auto mb-3" />
                <h3 className="font-bold mb-1">Multiplayer</h3>
                <p className="text-sm text-muted-foreground">Compete with players worldwide</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <Star className="w-8 h-8 text-neon-purple mx-auto mb-3" />
                <h3 className="font-bold mb-1">NFT Rewards</h3>
                <p className="text-sm text-muted-foreground">Unlock exclusive collectibles</p>
              </div>
            </div>

            {/* Notify form */}
            {isSubscribed ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green">
                <Bell className="w-5 h-5" />
                <span>You{"'"}ll be notified when games launch!</span>
              </div>
            ) : (
              <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="flex-1 bg-muted/50 border-border"
                  required
                />
                <NeonButton type="submit">
                  <Bell className="w-4 h-4" />
                  Notify Me
                </NeonButton>
              </form>
            )}
          </div>
        </NeonCard>

        {/* Preview Games */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Coming Soon
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockGames.map((game) => (
              <NeonCard key={game.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                {/* Image */}
                <div className="relative aspect-video">
                  <Image
                    src={game.image || "/placeholder.svg"}
                    alt={game.title}
                    fill
                    className="object-cover grayscale"
                  />
                  <div className="absolute inset-0 bg-background/60" />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-muted/80 text-xs font-medium">
                    Coming Soon
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h4 className="font-bold mb-1">{game.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{game.description}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {game.rating}
                    </span>
                    <span className="text-primary font-medium">{game.rewards}</span>
                  </div>
                </div>
              </NeonCard>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // This would be the active games state
  const filteredGames = mockGames.filter((game) => {
    const matchesCategory = selectedCategory === "All" || game.category === selectedCategory
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Games</h1>
        </div>

        <Input
          type="search"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:w-64 bg-muted/50 border-border"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Featured Game */}
      <NeonCard className="relative overflow-hidden mb-8" glowColor="cyan">
        <div className="absolute inset-0">
          <Image
            src={mockGames[0].image || "/placeholder.svg"}
            alt="Featured Game"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-4">
              <Star className="w-3 h-3" />
              Most Popular
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{mockGames[0].title}</h2>
            <p className="text-muted-foreground mb-4">{mockGames[0].description}</p>

            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                {mockGames[0].players} playing
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {mockGames[0].rating}
              </span>
              <span className="text-primary font-medium">{mockGames[0].rewards}</span>
            </div>

            <NeonButton>
              <Play className="w-4 h-4" />
              Play Now
            </NeonButton>
          </div>
        </div>
      </NeonCard>

      {/* Games Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map((game) => (
          <NeonCard key={game.id} className="overflow-hidden group">
            <div className="relative aspect-video">
              <Image
                src={game.image || "/placeholder.svg"}
                alt={game.title}
                fill
                className="object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{game.category}</span>
                <span className="flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {game.rating}
                </span>
              </div>

              <h3 className="font-bold mb-1">{game.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{game.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  <Users className="w-3 h-3 inline mr-1" />
                  {game.players}
                </span>
                <NeonButton variant="outline" size="sm">
                  Play
                  <ChevronRight className="w-3 h-3" />
                </NeonButton>
              </div>
            </div>
          </NeonCard>
        ))}
      </div>
    </div>
  )
}
