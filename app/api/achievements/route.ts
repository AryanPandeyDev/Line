import { NextResponse } from "next/server"

const mockAchievements = [
  {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    icon: "trophy",
    xpReward: 100,
    tokenReward: 50,
    unlocked: true,
    unlockedAt: "2024-11-20T15:30:00Z",
  },
  {
    id: "100_games",
    name: "Century Player",
    description: "Play 100 games",
    icon: "gamepad",
    xpReward: 500,
    tokenReward: 250,
    unlocked: true,
    unlockedAt: "2024-12-01T10:00:00Z",
  },
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Spend 10,000 tokens in the marketplace",
    icon: "coins",
    xpReward: 300,
    tokenReward: 150,
    unlocked: false,
    progress: { current: 4500, target: 10000 },
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Play for 30 days",
    icon: "clock",
    xpReward: 1000,
    tokenReward: 500,
    unlocked: false,
    progress: { current: 23, target: 30 },
  },
  {
    id: "nft_collector",
    name: "NFT Collector",
    description: "Own 5 NFTs",
    icon: "image",
    xpReward: 400,
    tokenReward: 200,
    unlocked: false,
    progress: { current: 2, target: 5 },
  },
]

export async function GET() {
  return NextResponse.json({
    achievements: mockAchievements,
    stats: {
      total: mockAchievements.length,
      unlocked: mockAchievements.filter((a) => a.unlocked).length,
      totalXpEarned: mockAchievements.filter((a) => a.unlocked).reduce((acc, a) => acc + a.xpReward, 0),
      totalTokensEarned: mockAchievements.filter((a) => a.unlocked).reduce((acc, a) => acc + a.tokenReward, 0),
    },
  })
}
