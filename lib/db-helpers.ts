import { db } from "@/lib/db"
import { nanoid } from "nanoid"
import type { User, Wallet, ReferralStats, DailyStreak } from "@/lib/generated/prisma"

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
    return `LINE-${nanoid(8).toUpperCase()}`
}

/**
 * Generate a random username in format user_XXXXXX
 */
export function generateRandomUsername(): string {
    const digits = Math.floor(100000 + Math.random() * 900000) // 6 digits
    return `user_${digits}`
}

/**
 * Get user by Clerk ID, optionally creating if not exists
 */
export async function getUserByClerkId(
    clerkId: string,
    options?: {
        createIfNotExists?: boolean
        email?: string
        username?: string
        displayName?: string
        avatarUrl?: string
    }
): Promise<User | null> {
    let user = await db.user.findUnique({
        where: { clerkId },
    })

    if (!user && options?.createIfNotExists && options.email) {
        // Generate username if not provided
        let username = options.username
        if (!username) {
            // Try to generate a unique username
            for (let i = 0; i < 5; i++) {
                const candidate = generateRandomUsername()
                const exists = await db.user.findUnique({
                    where: { username: candidate },
                    select: { id: true },
                })
                if (!exists) {
                    username = candidate
                    break
                }
            }
            if (!username) {
                username = `user_${nanoid(8)}`
            }
        }

        const referralCode = generateReferralCode()

        user = await db.user.create({
            data: {
                clerkId,
                email: options.email,
                username,
                displayName: options.displayName || null,
                avatarUrl: options.avatarUrl || null,
                referralCode,
                level: 1,
                xp: 0,
                xpToNextLevel: 1000,
                tokenBalance: 500, // Welcome bonus
                bonusPoints: 0,
                totalEarned: 500,
            },
        })

        // Create associated records
        await Promise.all([
            db.referralStats.create({
                data: {
                    userId: user.id,
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalEarned: 0,
                    currentTier: 1,
                    commissionRate: 0.05,
                },
            }),
            db.dailyStreak.create({
                data: {
                    userId: user.id,
                    currentStreak: 0,
                    longestStreak: 0,
                    claimedDays: [],
                },
            }),
            // Record welcome bonus transaction
            db.tokenTransaction.create({
                data: {
                    userId: user.id,
                    type: "EARN",
                    amount: 500,
                    balance: 500,
                    source: "Welcome Bonus",
                },
            }),
        ])
    }

    return user
}

/**
 * Get full user profile with all relations
 */
export async function getFullUserProfile(clerkId: string) {
    return db.user.findUnique({
        where: { clerkId },
        include: {
            wallet: true,
            achievements: {
                include: { achievement: true },
            },
            gameProgress: {
                include: { game: true },
            },
            ownedNFTs: {
                include: { nft: true },
            },
            referralStats: true,
            dailyStreaks: true,
        },
    })
}

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(
    userId: string,
    address: string
): Promise<Wallet> {
    let wallet = await db.wallet.findUnique({
        where: { userId },
    })

    if (!wallet) {
        wallet = await db.wallet.create({
            data: {
                userId,
                address,
                network: "VARA_TESTNET",
                isConnected: true,
                varaBalance: 0,
                lineBalance: 0,
                connectedAt: new Date(),
            },
        })
    } else if (wallet.address !== address) {
        // Update address if changed
        wallet = await db.wallet.update({
            where: { id: wallet.id },
            data: {
                address,
                isConnected: true,
                connectedAt: new Date(),
            },
        })
    }

    return wallet
}

/**
 * Add tokens to user balance and record transaction
 */
export async function addTokensToUser(
    userId: string,
    amount: number,
    source: string,
    type: "EARN" | "CLAIM" | "REFERRAL_BONUS" | "GAME_REWARD" | "DAILY_REWARD" | "STREAK_BONUS" | "ACHIEVEMENT_REWARD" = "EARN"
) {
    const user = await db.user.update({
        where: { id: userId },
        data: {
            tokenBalance: { increment: amount },
            totalEarned: { increment: amount > 0 ? amount : 0 },
        },
    })

    await db.tokenTransaction.create({
        data: {
            userId,
            type,
            amount,
            balance: user.tokenBalance,
            source,
        },
    })

    return user
}

/**
 * Spend tokens from user balance
 */
export async function spendTokensFromUser(
    userId: string,
    amount: number,
    source: string
) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.tokenBalance < amount) {
        throw new Error("Insufficient balance")
    }

    const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
            tokenBalance: { decrement: amount },
        },
    })

    await db.tokenTransaction.create({
        data: {
            userId,
            type: "SPEND",
            amount: -amount,
            balance: updatedUser.tokenBalance,
            source,
        },
    })

    return updatedUser
}

/**
 * Calculate XP needed for next level
 */
export function calculateXPForLevel(level: number): number {
    return Math.floor(1000 * Math.pow(1.2, level - 1))
}

/**
 * Add XP to user and handle level up
 */
export async function addXPToUser(userId: string, xpAmount: number) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error("User not found")

    let newXP = user.xp + xpAmount
    let newLevel = user.level
    let xpToNext = user.xpToNextLevel

    // Handle level ups
    while (newXP >= xpToNext) {
        newXP -= xpToNext
        newLevel++
        xpToNext = calculateXPForLevel(newLevel)
    }

    return db.user.update({
        where: { id: userId },
        data: {
            xp: newXP,
            level: newLevel,
            xpToNextLevel: xpToNext,
        },
    })
}

/**
 * Get daily streak for user
 */
export async function getDailyStreak(userId: string): Promise<DailyStreak | null> {
    return db.dailyStreak.findUnique({
        where: { userId },
    })
}

/**
 * Claim daily streak reward
 */
export async function claimDailyStreak(userId: string) {
    const streak = await db.dailyStreak.findUnique({ where: { userId } })
    if (!streak) throw new Error("Streak not found")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastClaim = streak.lastClaimDate
    const isConsecutive = lastClaim &&
        (today.getTime() - new Date(lastClaim).setHours(0, 0, 0, 0)) === 86400000

    // Get streak reward config
    const nextDay = isConsecutive ? (streak.currentStreak % 7) + 1 : 1
    const rewardConfig = await db.streakReward.findUnique({ where: { day: nextDay } })
    const rewardAmount = rewardConfig?.reward || 50 + (nextDay - 1) * 25

    // Update streak
    const newStreak = isConsecutive ? streak.currentStreak + 1 : 1
    await db.dailyStreak.update({
        where: { userId },
        data: {
            currentStreak: newStreak,
            longestStreak: Math.max(streak.longestStreak, newStreak),
            lastClaimDate: today,
            streakStartDate: isConsecutive ? streak.streakStartDate : today,
            claimedDays: isConsecutive
                ? [...streak.claimedDays, nextDay]
                : [1],
        },
    })

    // Add reward
    await addTokensToUser(userId, rewardAmount, `Day ${nextDay} Streak Bonus`, "STREAK_BONUS")

    return { day: nextDay, reward: rewardAmount, currentStreak: newStreak }
}
