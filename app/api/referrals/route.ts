import { NextResponse } from "next/server"

const mockReferralData = {
  code: "LGC-PLAYER-7X9K2M",
  link: "https://linegamecenter.com/ref/LGC-PLAYER-7X9K2M",
  stats: {
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarned: 2845,
    currentTier: 2,
    commissionRate: 0.07,
  },
  tiers: [
    { tier: 1, referrals: 5, reward: 500, bonus: "5% commission", unlocked: true },
    { tier: 2, referrals: 15, reward: 2000, bonus: "7% commission", unlocked: false },
    { tier: 3, referrals: 50, reward: 10000, bonus: "10% commission", unlocked: false },
    { tier: 4, referrals: 100, reward: 50000, bonus: "15% commission + NFT", unlocked: false },
  ],
  referredUsers: [
    { id: "ref_1", name: "Alex M.", joined: "2024-12-06", earned: 150, status: "active" },
    { id: "ref_2", name: "Sarah K.", joined: "2024-12-01", earned: 420, status: "active" },
    { id: "ref_3", name: "Mike R.", joined: "2024-11-24", earned: 280, status: "active" },
    { id: "ref_4", name: "Emma L.", joined: "2024-11-17", earned: 95, status: "inactive" },
  ],
}

export async function GET() {
  return NextResponse.json(mockReferralData)
}
