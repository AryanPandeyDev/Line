import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId } from "@/lib/db-helpers"

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

    // Get referral stats
    const referralStats = await db.referralStats.findUnique({
      where: { userId: user.id },
    })

    // Get referral tiers
    const tiers = await db.referralTier.findMany({
      orderBy: { tier: "asc" },
    })

    // Get referred users
    const referredUsers = await db.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Calculate earnings per referred user (from referral bonus transactions)
    const referralEarnings = await db.tokenTransaction.groupBy({
      by: ["metadata"],
      where: {
        userId: user.id,
        type: "REFERRAL_BONUS",
      },
      _sum: { amount: true },
    })

    // Build referrals list
    const referredUsersFormatted = referredUsers.map((ru) => {
      const isActive = ru.lastLoginAt &&
        (new Date().getTime() - new Date(ru.lastLoginAt).getTime()) < 7 * 24 * 60 * 60 * 1000

      return {
        id: ru.id,
        name: ru.displayName || ru.username,
        joined: ru.createdAt.toISOString().split("T")[0],
        earned: 0, // Would need to track per-referral earnings
        status: isActive ? "active" : "inactive",
      }
    })

    // Format tiers or use defaults
    const formattedTiers = tiers.length > 0
      ? tiers.map((t) => ({
        tier: t.tier,
        referrals: t.requiredReferrals,
        reward: t.reward,
        bonus: t.bonus || `${Math.round(t.commissionRate * 100)}% commission`,
        unlocked: (referralStats?.totalReferrals || 0) >= t.requiredReferrals,
      }))
      : [
        { tier: 1, referrals: 5, reward: 500, bonus: "5% commission", unlocked: true },
        { tier: 2, referrals: 15, reward: 2000, bonus: "7% commission", unlocked: false },
        { tier: 3, referrals: 50, reward: 10000, bonus: "10% commission", unlocked: false },
        { tier: 4, referrals: 100, reward: 50000, bonus: "15% commission + NFT", unlocked: false },
      ]

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linegamecenter.com"

    return NextResponse.json({
      code: user.referralCode,
      link: `${baseUrl}/signup?ref=${user.referralCode}`,
      stats: {
        totalReferrals: referralStats?.totalReferrals || 0,
        activeReferrals: referralStats?.activeReferrals || 0,
        totalEarned: referralStats?.totalEarned || 0,
        currentTier: referralStats?.currentTier || 1,
        commissionRate: referralStats?.commissionRate || 0.05,
      },
      tiers: formattedTiers,
      referredUsers: referredUsersFormatted,
    })
  } catch (error) {
    console.error("Error fetching referrals:", error)
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

    const { action, referralCode } = await request.json()

    if (action === "apply" && referralCode) {
      // Apply a referral code (when signing up)
      if (user.referredById) {
        return NextResponse.json(
          { error: "You have already used a referral code" },
          { status: 400 }
        )
      }

      // Find referrer
      const referrer = await db.user.findUnique({
        where: { referralCode },
      })

      if (!referrer) {
        return NextResponse.json(
          { error: "Invalid referral code" },
          { status: 404 }
        )
      }

      if (referrer.id === user.id) {
        return NextResponse.json(
          { error: "You cannot use your own referral code" },
          { status: 400 }
        )
      }

      // Apply referral
      await db.$transaction(async (tx) => {
        // Update referred user
        await tx.user.update({
          where: { id: user.id },
          data: { referredById: referrer.id },
        })

        // Update referrer stats
        await tx.referralStats.update({
          where: { userId: referrer.id },
          data: {
            totalReferrals: { increment: 1 },
            activeReferrals: { increment: 1 },
          },
        })

        // Grant referral bonus to referrer
        const bonusAmount = 200
        await tx.user.update({
          where: { id: referrer.id },
          data: {
            tokenBalance: { increment: bonusAmount },
            totalEarned: { increment: bonusAmount },
          },
        })

        await tx.tokenTransaction.create({
          data: {
            userId: referrer.id,
            type: "REFERRAL_BONUS",
            amount: bonusAmount,
            balance: referrer.tokenBalance + bonusAmount,
            source: `Referral: ${user.username}`,
            metadata: { referredUserId: user.id },
          },
        })

        // Update referrer's referral earnings
        await tx.referralStats.update({
          where: { userId: referrer.id },
          data: {
            totalEarned: { increment: bonusAmount },
          },
        })
      })

      return NextResponse.json({
        success: true,
        message: "Referral code applied successfully!",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing referral action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
