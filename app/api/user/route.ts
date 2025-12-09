import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId } from "@/lib/db-helpers"

export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get or create user in database
    const user = await getUserByClerkId(clerkId, {
      createIfNotExists: true,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      username: clerkUser.username || undefined,
    })

    if (!user) {
      return NextResponse.json({ error: "Failed to get user" }, { status: 500 })
    }

    // Get additional user data
    const [achievements, referralStats] = await Promise.all([
      db.userAchievement.findMany({
        where: { userId: user.id, isUnlocked: true },
        select: { achievement: { select: { slug: true } } },
      }),
      db.referralStats.findUnique({
        where: { userId: user.id },
      }),
    ])

    // Format response to match frontend expectations
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName || user.username,
      level: user.level,
      xp: user.xp,
      xpToNextLevel: user.xpToNextLevel,
      tokens: user.tokenBalance,
      bonusPoints: user.bonusPoints,
      referralCode: user.referralCode,
      totalReferrals: referralStats?.totalReferrals || 0,
      achievements: achievements.map((a) => a.achievement.slug),
      createdAt: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByClerkId(clerkId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updates = await request.json()

    // Only allow updating certain fields
    const allowedFields = ["displayName", "username", "avatarUrl"]
    const sanitizedUpdates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field]
      }
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: sanitizedUpdates,
    })

    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      displayName: updatedUser.displayName || updatedUser.username,
      level: updatedUser.level,
      xp: updatedUser.xp,
      xpToNextLevel: updatedUser.xpToNextLevel,
      tokens: updatedUser.tokenBalance,
      bonusPoints: updatedUser.bonusPoints,
      referralCode: updatedUser.referralCode,
      createdAt: updatedUser.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
