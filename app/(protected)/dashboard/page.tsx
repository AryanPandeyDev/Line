"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Coins, Trophy, Gamepad2, ImageIcon, Clock, TrendingUp, ChevronRight, Wallet } from "lucide-react"
import { NeonCard } from "@/components/ui/neon-card"
import { NeonButton } from "@/components/ui/neon-button"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { selectUser, selectTotalPlayTimeHours, fetchUserProfile } from "@/lib/redux/slices/auth-slice"
import { selectTokenBalance, selectTotalEarned, fetchTokens } from "@/lib/redux/slices/tokens-slice"
import { selectUnlockedAchievements, selectAchievements, fetchAchievements } from "@/lib/redux/slices/achievements-slice"
import { selectInventory } from "@/lib/redux/slices/nfts-slice"
import { selectIsWalletConnected, selectShortAddress, fetchWallet } from "@/lib/redux/slices/wallet-slice"
import { openModal } from "@/lib/redux/slices/ui-slice"
import { cn } from "@/lib/utils"

const featuredNFTs = [
  { id: 1, name: "Cyber Wolf", image: "/cyberpunk-wolf-with-neon-blue-eyes-and-chrome-armo.jpg", rarity: "Epic" },
  {
    id: 2,
    name: "Neon Samurai",
    image: "/neon-samurai-warrior-with-glowing-katana-cyberpunk.jpg",
    rarity: "Legendary",
  },
  {
    id: 3,
    name: "Chrome Dragon",
    image: "/chrome-mechanical-dragon-with-glowing-purple-eyes-.jpg",
    rarity: "Legendary",
  },
  { id: 4, name: "Void Fox", image: "/ethereal-fox-made-of-dark-matter-with-magenta-ener.jpg", rarity: "Epic" },
]

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const tokenBalance = useAppSelector(selectTokenBalance)
  const totalEarned = useAppSelector(selectTotalEarned)
  const unlockedAchievements = useAppSelector(selectUnlockedAchievements)
  const allAchievements = useAppSelector(selectAchievements)
  const inventory = useAppSelector(selectInventory)
  const isWalletConnected = useAppSelector(selectIsWalletConnected)
  const shortAddress = useAppSelector(selectShortAddress)
  const totalPlayTimeHours = useAppSelector(selectTotalPlayTimeHours)

  // Fetch user data on mount
  useEffect(() => {
    dispatch(fetchUserProfile())
    dispatch(fetchTokens())
    dispatch(fetchAchievements())
    dispatch(fetchWallet())
  }, [dispatch])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Welcome back, <span className="neon-text-cyan">{user?.displayName || "Player"}</span>
          </h1>
          <p className="text-muted-foreground">Here{"'"}s your gaming overview</p>
        </div>

        {/* Wallet Status */}
        <NeonButton
          variant={isWalletConnected ? "outline" : "primary"}
          onClick={() => dispatch(openModal({ type: "wallet-connect" }))}
        >
          <Wallet className="w-4 h-4" />
          {isWalletConnected ? shortAddress : "Connect Wallet"}
        </NeonButton>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <NeonCard className="p-5" glowColor="cyan">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-neon-cyan" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neon-cyan">{tokenBalance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">LINE Balance</p>
        </NeonCard>

        <NeonCard className="p-5" glowColor="magenta">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-magenta/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-neon-magenta" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neon-magenta">{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Earned</p>
        </NeonCard>

        <NeonCard className="p-5" glowColor="purple">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-neon-purple" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neon-purple">
            {unlockedAchievements.length}/{allAchievements.length}
          </p>
          <p className="text-xs text-muted-foreground">Achievements</p>
        </NeonCard>

        <NeonCard className="p-5" glowColor="cyan">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-neon-green" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-neon-green">{inventory.length}</p>
          <p className="text-xs text-muted-foreground">NFTs Owned</p>
        </NeonCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Playtime Chart */}
        <NeonCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-bold">Total Playtime</h2>
            </div>
            <span className="text-sm text-muted-foreground">{totalPlayTimeHours} hours played</span>
          </div>

          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <p className="text-5xl font-bold neon-text-cyan mb-2">{totalPlayTimeHours}</p>
              <p className="text-muted-foreground">Total Hours Played</p>
              {totalPlayTimeHours === 0 && (
                <p className="text-sm text-muted-foreground mt-4">Start playing games to track your time!</p>
              )}
            </div>
          </div>
        </NeonCard>

        {/* Quick Actions */}
        <NeonCard className="p-6">
          <h2 className="font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/earn" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-neon-cyan" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Claim Daily Reward</p>
                  <p className="text-xs text-muted-foreground">100 LINE available</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link href="/games" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-neon-magenta/10 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-neon-magenta" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Play Games</p>
                  <p className="text-xs text-muted-foreground">Explore new titles</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link href="/nft-market" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-neon-purple" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Browse NFTs</p>
                  <p className="text-xs text-muted-foreground">New drops available</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </NeonCard>
      </div>

      {/* Achievements Preview */}
      <NeonCard className="mt-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-neon-purple" />
            <h2 className="font-bold">Recent Achievements</h2>
          </div>
          <Link href="/achievements" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {allAchievements.slice(0, 6).map((achievement) => (
            <div
              key={achievement.id}
              className={cn(
                "flex flex-col items-center p-4 rounded-xl border transition-all",
                achievement.unlocked
                  ? "border-neon-purple/30 bg-neon-purple/5"
                  : "border-border bg-muted/30 opacity-50",
              )}
            >
              <span className="text-3xl mb-2">{achievement.icon}</span>
              <p className="text-xs font-medium text-center line-clamp-2">{achievement.title}</p>
              {achievement.progress !== undefined && !achievement.unlocked && (
                <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-neon-purple rounded-full"
                    style={{ width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </NeonCard>

      {/* NFT Collection Preview */}
      <NeonCard className="mt-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-bold">Featured NFTs</h2>
          </div>
          <Link href="/marketplace" className="text-sm text-primary hover:underline">
            View Marketplace
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {featuredNFTs.map((nft) => (
            <div
              key={nft.id}
              className="flex-shrink-0 w-40 sm:w-48 rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all group"
            >
              <div className="relative aspect-square">
                <Image
                  src={nft.image || "/placeholder.svg"}
                  alt={nft.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <div className="p-3 bg-card">
                <p className="font-medium text-sm truncate">{nft.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    nft.rarity === "Legendary" ? "text-neon-magenta" : nft.rarity === "Epic" ? "text-neon-purple" : "",
                  )}
                >
                  {nft.rarity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </NeonCard>
    </div>
  )
}
