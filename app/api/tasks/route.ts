import { NextResponse } from "next/server"

const mockTasks = {
  daily: [
    { id: "daily_1", name: "Log in daily", reward: 50, completed: true },
    { id: "daily_2", name: "Play 3 games", reward: 100, progress: { current: 0, target: 3 }, completed: false },
    { id: "daily_3", name: "Win 1 game", reward: 150, progress: { current: 0, target: 1 }, completed: false },
    { id: "daily_4", name: "Trade in marketplace", reward: 75, completed: false },
  ],
  external: [
    { id: "ext_1", name: "Follow on Twitter", reward: 200, completed: true, link: "https://twitter.com" },
    { id: "ext_2", name: "Join Discord", reward: 200, completed: false, link: "https://discord.com" },
    { id: "ext_3", name: "Subscribe to YouTube", reward: 150, completed: false, link: "https://youtube.com" },
    { id: "ext_4", name: "Join Telegram", reward: 100, completed: false, link: "https://telegram.org" },
  ],
  achievements: [
    { id: "ach_1", name: "First Win", reward: 500, completed: true },
    { id: "ach_2", name: "100 Games Played", reward: 1000, completed: true },
    {
      id: "ach_3",
      name: "NFT Collector (5 NFTs)",
      reward: 2000,
      progress: { current: 2, target: 5 },
      completed: false,
    },
  ],
  streak: {
    current: 7,
    rewards: [
      { day: 1, reward: 50, claimed: true },
      { day: 2, reward: 75, claimed: true },
      { day: 3, reward: 100, claimed: true },
      { day: 4, reward: 125, claimed: true },
      { day: 5, reward: 150, claimed: true },
      { day: 6, reward: 200, claimed: true },
      { day: 7, reward: 300, claimed: false },
    ],
  },
}

export async function GET() {
  return NextResponse.json(mockTasks)
}

export async function POST(request: Request) {
  const { taskId, action } = await request.json()

  if (action === "complete") {
    return NextResponse.json({
      success: true,
      message: "Task completed!",
      taskId,
    })
  }

  if (action === "claim") {
    return NextResponse.json({
      success: true,
      message: "Reward claimed!",
      taskId,
    })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
