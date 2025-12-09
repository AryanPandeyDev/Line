import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId, addTokensToUser, claimDailyStreak } from "@/lib/db-helpers"

export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByClerkId(clerkId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get token transactions
    const transactions = await db.tokenTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Calculate daily earnings
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
      db.tokenTransaction.aggregate({
        where: {
          userId: user.id,
          amount: { gt: 0 },
          createdAt: { gte: startOfToday },
        },
        _sum: { amount: true },
      }),
      db.tokenTransaction.aggregate({
        where: {
          userId: user.id,
          amount: { gt: 0 },
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      }),
      db.tokenTransaction.aggregate({
        where: {
          userId: user.id,
          amount: { gt: 0 },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ])

    // Check if daily claim is available and get wallet status
    const [streak, wallet, streakRewards] = await Promise.all([
      db.dailyStreak.findUnique({
        where: { userId: user.id },
      }),
      db.wallet.findUnique({
        where: { userId: user.id },
        select: { isConnected: true },
      }),
      db.streakReward.findMany({
        orderBy: { day: "asc" },
      }),
    ])

    const lastClaimDate = streak?.lastClaimDate
    const canClaimToday = !lastClaimDate ||
      new Date(lastClaimDate).toDateString() !== now.toDateString()

    // Calculate next reward amount
    const currentStreak = streak?.currentStreak || 0
    const nextDay = canClaimToday ? (currentStreak % 7) + 1 : ((currentStreak % 7) + 1)
    const nextReward = streakRewards.find((sr) => sr.day === nextDay)
    const nextRewardAmount = nextReward?.reward || 50 + (nextDay - 1) * 25

    // Format response with new fields
    return NextResponse.json({
      balance: user.tokenBalance,
      totalEarned: user.totalEarned,
      walletConnected: wallet?.isConnected ?? false,
      dailyClaimAvailable: canClaimToday,
      nextRewardAmount,
      currentStreak,
      history: transactions.map((t) => ({
        type: t.type.toLowerCase().replace("_", "-"),
        amount: t.amount,
        source: t.source,
        timestamp: t.createdAt.toISOString(),
      })),
      dailyEarnings: {
        today: todayEarnings._sum.amount || 0,
        thisWeek: weekEarnings._sum.amount || 0,
        thisMonth: monthEarnings._sum.amount || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByClerkId(clerkId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { action, amount } = await request.json()

    if (action === "claim") {
      // Enforce wallet connection before allowing claim
      const wallet = await db.wallet.findUnique({
        where: { userId: user.id },
        select: { isConnected: true },
      })

      if (!wallet || !wallet.isConnected) {
        return NextResponse.json(
          { error: "Wallet must be connected to claim rewards", code: "WALLET_NOT_CONNECTED" },
          { status: 403 }
        )
      }

      // This is for claiming daily streak reward
      try {
        const result = await claimDailyStreak(user.id)

        const updatedUser = await db.user.findUnique({
          where: { id: user.id },
          select: { tokenBalance: true },
        })

        return NextResponse.json({
          success: true,
          newBalance: updatedUser?.tokenBalance || 0,
          message: `Successfully claimed Day ${result.day} streak bonus: ${result.reward} LINE tokens!`,
          currentStreak: result.currentStreak,
        })
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to claim daily reward" },
          { status: 400 }
        )
      }
    }

    if (action === "add" && amount && typeof amount === "number") {
      // Admin action to add tokens (should be protected in production)
      await addTokensToUser(user.id, amount, "Manual Addition", "EARN")

      const updatedUser = await db.user.findUnique({
        where: { id: user.id },
        select: { tokenBalance: true },
      })

      return NextResponse.json({
        success: true,
        newBalance: updatedUser?.tokenBalance || 0,
        message: `Successfully added ${amount} LINE tokens!`,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing token action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
