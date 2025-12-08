import { NextResponse } from "next/server"

const mockUser = {
  id: "user_1",
  username: "CyberPlayer_42",
  email: "player@example.com",
  displayName: "Cyber Player",
  level: 15,
  xp: 7500,
  xpToNextLevel: 10000,
  tokens: 15420,
  bonusPoints: 8750,
  referralCode: "LGC-PLAYER-7X9K2M",
  totalReferrals: 12,
  achievements: ["first_win", "100_games", "early_adopter"],
  createdAt: "2024-01-15T10:00:00Z",
}

export async function GET() {
  return NextResponse.json(mockUser)
}

export async function PATCH(request: Request) {
  const updates = await request.json()
  const updatedUser = { ...mockUser, ...updates }
  return NextResponse.json(updatedUser)
}
