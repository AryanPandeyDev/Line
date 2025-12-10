/**
 * ============================================================================
 * USER REPOSITORY
 * ============================================================================
 * 
 * Data access layer for the Prisma User model.
 * 
 * PRISMA MODELS ACCESSED:
 * - User (primary)
 * - UserGameProgress (for play time aggregation)
 * - ReferralStats (for referral data)
 * 
 * ALLOWED:
 * - Prisma CRUD operations on User model
 * - Aggregation queries
 * - Receiving transaction client (tx) for atomic operations
 * 
 * FORBIDDEN:
 * - Business logic or domain rules
 * - Calling other repositories directly
 * - Calling services
 * - HTTP request/response handling
 * - Clerk or authentication operations
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { User } from '@/lib/generated/prisma'

/**
 * Raw user data from database with related stats
 */
export interface UserWithStats {
    user: User
    totalPlayTimeSeconds: number
    totalReferrals: number
}

export const userRepo = {
    /**
     * Find user by Clerk authentication ID
     * @prisma db.user.findUnique({ where: { clerkId } })
     */
    findByClerkId: async (clerkId: string): Promise<User | null> => {
        return db.user.findUnique({
            where: { clerkId },
        })
    },

    /**
     * Find user by internal database ID
     * @prisma db.user.findUnique({ where: { id } })
     */
    findById: async (id: string): Promise<User | null> => {
        return db.user.findUnique({
            where: { id },
        })
    },

    /**
     * Find user by username (for uniqueness checks)
     * @prisma db.user.findUnique({ where: { username } })
     */
    findByUsername: async (username: string): Promise<User | null> => {
        return db.user.findUnique({
            where: { username },
        })
    },

    /**
     * Get user with aggregated stats for profile display
     * Fetches user, total play time, and referral count
     */
    findByClerkIdWithStats: async (clerkId: string): Promise<UserWithStats | null> => {
        const user = await db.user.findUnique({
            where: { clerkId },
        })

        if (!user) {
            return null
        }

        // Aggregate play time from all game progress
        const playTimeResult = await db.userGameProgress.aggregate({
            where: { userId: user.id },
            _sum: { totalPlayTime: true },
        })

        // Get referral stats
        const referralStats = await db.referralStats.findUnique({
            where: { userId: user.id },
        })

        return {
            user,
            totalPlayTimeSeconds: playTimeResult._sum.totalPlayTime || 0,
            totalReferrals: referralStats?.totalReferrals || 0,
        }
    },

    /**
     * Aggregate total play time across all games for a user
     * @prisma db.userGameProgress.aggregate({ where: { userId }, _sum: { totalPlayTime } })
     */
    aggregateTotalPlayTime: async (userId: string): Promise<number> => {
        const result = await db.userGameProgress.aggregate({
            where: { userId },
            _sum: { totalPlayTime: true },
        })
        return result._sum.totalPlayTime || 0
    },

    /**
     * Get referral stats for a user
     * @prisma db.referralStats.findUnique({ where: { userId } })
     */
    findReferralStats: async (userId: string) => {
        return db.referralStats.findUnique({
            where: { userId },
        })
    },

    /**
     * Create a new user record
     * @prisma db.user.create({ data })
     */
    create: async (data: {
        clerkId: string
        email: string
        username: string
        displayName?: string | null
        avatarUrl?: string | null
        referralCode: string
        tokenBalance?: number
        totalEarned?: number
    }): Promise<User> => {
        return db.user.create({
            data: {
                clerkId: data.clerkId,
                email: data.email,
                username: data.username,
                displayName: data.displayName || null,
                avatarUrl: data.avatarUrl || null,
                referralCode: data.referralCode,
                level: 1,
                xp: 0,
                xpToNextLevel: 1000,
                tokenBalance: data.tokenBalance ?? 500,
                bonusPoints: 0,
                totalEarned: data.totalEarned ?? 500,
            },
        })
    },

    /**
     * Create associated records for a new user (referral stats, streak, welcome bonus transaction)
     * Should be called after user creation
     */
    createAssociatedRecords: async (userId: string, welcomeBonus: number = 500): Promise<void> => {
        await Promise.all([
            db.referralStats.create({
                data: {
                    userId,
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalEarned: 0,
                    currentTier: 1,
                    commissionRate: 0.05,
                },
            }),
            db.dailyStreak.create({
                data: {
                    userId,
                    currentStreak: 0,
                    longestStreak: 0,
                    claimedDays: [],
                },
            }),
            db.tokenTransaction.create({
                data: {
                    userId,
                    type: 'EARN',
                    amount: welcomeBonus,
                    balance: welcomeBonus,
                    source: 'Welcome Bonus',
                },
            }),
        ])
    },

    /**
     * Update user profile fields
     * @prisma db.user.update({ where: { id }, data })
     */
    update: async (id: string, data: {
        username?: string
        displayName?: string
        avatarUrl?: string
    }): Promise<User> => {
        return db.user.update({
            where: { id },
            data,
        })
    },
}
