import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getUserByClerkId, generateRandomUsername } from "@/lib/db-helpers"

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
            username: clerkUser.username || undefined,
            displayName: clerkUser.fullName || clerkUser.firstName || undefined,
            avatarUrl: clerkUser.imageUrl || undefined,
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
            clerkId: user.clerkId,
            email: user.email,
            username: user.username,
            displayName: user.displayName || clerkUser.firstName || user.username,
            avatarUrl: user.avatarUrl || clerkUser.imageUrl || null,
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
        const allowedUpdates: Record<string, string> = {}
        const errors: string[] = []

        // Validate username
        if (updates.username !== undefined) {
            const username = String(updates.username).trim()
            if (username.length < 3 || username.length > 20) {
                errors.push("Username must be 3-20 characters")
            } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                errors.push("Username can only contain letters, numbers, and underscores")
            } else {
                // Check uniqueness
                const existingUser = await db.user.findUnique({
                    where: { username },
                    select: { id: true },
                })
                if (existingUser && existingUser.id !== user.id) {
                    return NextResponse.json(
                        { error: "Username already taken", code: "USERNAME_TAKEN" },
                        { status: 409 }
                    )
                }
                allowedUpdates.username = username
            }
        }

        // Validate displayName
        if (updates.displayName !== undefined) {
            const displayName = String(updates.displayName).trim()
            if (displayName.length > 50) {
                errors.push("Display name must be 50 characters or less")
            } else if (displayName.length > 0) {
                allowedUpdates.displayName = displayName
            }
        }

        // Validate avatarUrl
        if (updates.avatarUrl !== undefined) {
            const avatarUrl = String(updates.avatarUrl).trim()
            if (avatarUrl.length > 0) {
                allowedUpdates.avatarUrl = avatarUrl
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join(", ") }, { status: 400 })
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
        }

        const updatedUser = await db.user.update({
            where: { id: user.id },
            data: allowedUpdates,
        })

        // Get Clerk data for consistent response
        const clerkUser = await currentUser()

        // Get play time
        const playTimeResult = await db.userGameProgress.aggregate({
            where: { userId: updatedUser.id },
            _sum: { totalPlayTime: true },
        })
        const totalPlayTimeSeconds = playTimeResult._sum.totalPlayTime || 0

        // Get referral stats
        const referralStats = await db.referralStats.findUnique({
            where: { userId: updatedUser.id },
        })

        return NextResponse.json({
            id: updatedUser.id,
            clerkId: updatedUser.clerkId,
            email: updatedUser.email,
            username: updatedUser.username,
            displayName: updatedUser.displayName || updatedUser.username,
            avatarUrl: updatedUser.avatarUrl || clerkUser?.imageUrl || null,
            level: updatedUser.level,
            xp: updatedUser.xp,
            xpToNextLevel: updatedUser.xpToNextLevel,
            tokens: updatedUser.tokenBalance,
            bonusPoints: updatedUser.bonusPoints,
            referralCode: updatedUser.referralCode,
            totalReferrals: referralStats?.totalReferrals || 0,
            totalPlayTimeSeconds,
            totalPlayTimeHours: Math.round((totalPlayTimeSeconds / 3600) * 10) / 10,
            createdAt: updatedUser.createdAt.toISOString(),
        })
    } catch (error) {
        console.error("Error updating user:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
