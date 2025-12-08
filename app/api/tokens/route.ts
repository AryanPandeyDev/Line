import { NextResponse } from "next/server"

const mockTokenData = {
  balance: 15420,
  history: [
    { type: "earn", amount: 500, source: "Daily Reward", timestamp: "2024-12-08T08:00:00Z" },
    { type: "spend", amount: 1000, source: "NFT Purchase", timestamp: "2024-12-07T14:30:00Z" },
    { type: "earn", amount: 1200, source: "Game Winnings", timestamp: "2024-12-06T20:15:00Z" },
    { type: "earn", amount: 300, source: "Referral Bonus", timestamp: "2024-12-05T11:00:00Z" },
  ],
  dailyEarnings: {
    today: 500,
    thisWeek: 3200,
    thisMonth: 12500,
  },
}

export async function GET() {
  return NextResponse.json(mockTokenData)
}

export async function POST(request: Request) {
  const { action, amount } = await request.json()

  if (action === "claim") {
    return NextResponse.json({
      success: true,
      newBalance: mockTokenData.balance + amount,
      message: `Successfully claimed ${amount} LGC tokens!`,
    })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
