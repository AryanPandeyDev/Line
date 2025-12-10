/**
 * ============================================================================
 * REFERRAL REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma ReferralStats, ReferralTier, and User models.
 * 
 * PRISMA MODELS ACCESSED:
 * - ReferralStats (primary)
 * - ReferralTier (configuration)
 * - User (for referred users)
 * - TokenTransaction (for earnings)
 * 
 * FORBIDDEN:
 * - Commission calculations
 * - Tier upgrade decisions
 * - Token operations
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { ReferralStats, ReferralTier, User, Prisma } from '@/lib/generated/prisma'

export interface ReferredUserData {
    id: string
    displayName: string | null
    username: string
    createdAt: Date
    lastLoginAt: Date | null
}

export const referralRepo = {
    /**
     * Find referral stats by user ID
     */
    findStatsByUserId: async (userId: string): Promise<ReferralStats | null> => {
        return db.referralStats.findUnique({
            where: { userId },
        })
    },

    /**
     * Create referral stats for a new user
     */
    createStats: async (userId: string): Promise<ReferralStats> => {
        return db.referralStats.create({
            data: {
                userId,
                totalReferrals: 0,
                activeReferrals: 0,
                totalEarned: 0,
                currentTier: 1,
                commissionRate: 0.05,
            },
        })
    },

    /**
     * Get or create referral stats
     */
    getOrCreateStats: async (userId: string): Promise<ReferralStats> => {
        let stats = await db.referralStats.findUnique({
            where: { userId },
        })

        if (!stats) {
            stats = await db.referralStats.create({
                data: {
                    userId,
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalEarned: 0,
                    currentTier: 1,
                    commissionRate: 0.05,
                },
            })
        }

        return stats
    },

    /**
     * Get all referral tier configurations
     */
    findAllTiers: async (): Promise<ReferralTier[]> => {
        return db.referralTier.findMany({
            orderBy: { tier: 'asc' },
        })
    },

    /**
     * Find referred users for a referrer
     */
    findReferredUsers: async (referrerId: string, limit: number = 20): Promise<ReferredUserData[]> => {
        const users = await db.user.findMany({
            where: { referredById: referrerId },
            select: {
                id: true,
                displayName: true,
                username: true,
                createdAt: true,
                lastLoginAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

        return users
    },

    /**
     * Find user by referral code
     */
    findUserByReferralCode: async (referralCode: string): Promise<User | null> => {
        return db.user.findUnique({
            where: { referralCode },
        })
    },

    /**
     * Apply referral in a transaction
     * Returns the transaction promise for the caller to execute
     */
    applyReferral: async (
        userId: string,
        referrerId: string,
        username: string,
        referrerTokenBalance: number,
        bonusAmount: number
    ): Promise<void> => {
        await db.$transaction(async (tx) => {
            // Update referred user
            await tx.user.update({
                where: { id: userId },
                data: { referredById: referrerId },
            })

            // Update referrer stats
            await tx.referralStats.update({
                where: { userId: referrerId },
                data: {
                    totalReferrals: { increment: 1 },
                    activeReferrals: { increment: 1 },
                },
            })

            // Grant referral bonus to referrer
            await tx.user.update({
                where: { id: referrerId },
                data: {
                    tokenBalance: { increment: bonusAmount },
                    totalEarned: { increment: bonusAmount },
                },
            })

            await tx.tokenTransaction.create({
                data: {
                    userId: referrerId,
                    type: 'REFERRAL_BONUS',
                    amount: bonusAmount,
                    balance: referrerTokenBalance + bonusAmount,
                    source: `Referral: ${username}`,
                    metadata: { referredUserId: userId },
                },
            })

            // Update referrer's referral earnings
            await tx.referralStats.update({
                where: { userId: referrerId },
                data: {
                    totalEarned: { increment: bonusAmount },
                },
            })
        })
    },
}
