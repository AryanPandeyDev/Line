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

        // Get Clerk user details
        const clerkUser = await currentUser()
        if (!clerkUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get or create user in database
        const user = await getUserByClerkId(clerkId, {
            createIfNotExists: true,
            email: clerkUser.emailAddresses[0]?.emailAddress || "",
            username: clerkUser.username || clerkUser.firstName || undefined,
        })

        if (!user) {
            return NextResponse.json({ error: "Failed to get or create user" }, { status: 500 })
        }

        // Get total play time from all game progress
        const playTimeResult = await db.userGameProgress.aggregate({
            where: { userId: user.id },
            _sum: { totalPlayTime: true },
        })

        const totalPlayTimeSeconds = playTimeResult._sum.totalPlayTime || 0

        // Get referral stats
        const referralStats = await db.referralStats.findUnique({
            where: { userId: user.id },
        })

        return NextResponse.json({
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: clerkUser.firstName || user.username,
            avatarUrl: clerkUser.imageUrl || null,
            level: user.level,
            xp: user.xp,
            xpToNextLevel: user.xpToNextLevel,
            tokens: user.tokenBalance,
            bonusPoints: user.bonusPoints,
            referralCode: user.referralCode,
            totalReferrals: referralStats?.totalReferrals || 0,
            totalPlayTimeSeconds,
            totalPlayTimeHours: Math.round((totalPlayTimeSeconds / 3600) * 10) / 10,
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

        // Only allow certain fields to be updated
        const allowedUpdates: Partial<{ username: string }> = {}
        if (updates.username && typeof updates.username === "string") {
            allowedUpdates.username = updates.username
        }

        const updatedUser = await db.user.update({
            where: { id: user.id },
            data: allowedUpdates,
        })

        return NextResponse.json({
            id: updatedUser.id,
            username: updatedUser.username,
            message: "Profile updated successfully",
        })
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
