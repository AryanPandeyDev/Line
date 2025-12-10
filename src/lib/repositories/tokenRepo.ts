/**
 * ============================================================================
 * TOKEN REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma TokenTransaction model.
 * User balance updates are handled by userRepo or db-helpers.
 * 
 * PRISMA MODELS ACCESSED:
 * - TokenTransaction (primary)
 * - DailyStreak (for streak info)
 * - Wallet (for connection status)
 * - StreakReward (for reward config)
 * 
 * FORBIDDEN:
 * - Modifying user balances directly (use db-helpers)
 * - Balance validation
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { TokenTransaction, DailyStreak, StreakReward } from '@/lib/generated/prisma'

export interface TokenDataBundle {
    transactions: TokenTransaction[]
    streak: DailyStreak | null
    walletConnected: boolean
    streakRewards: StreakReward[]
}

export interface EarningsAggregates {
    today: number
    thisWeek: number
    thisMonth: number
}

export const tokenRepo = {
    /**
     * Find recent transactions for a user
     */
    findRecentTransactions: async (userId: string, limit: number = 20): Promise<TokenTransaction[]> => {
        return db.tokenTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })
    },

    /**
     * Get earnings aggregates for different time periods
     */
    getEarningsAggregates: async (userId: string): Promise<EarningsAggregates> => {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
            db.tokenTransaction.aggregate({
                where: {
                    userId,
                    amount: { gt: 0 },
                    createdAt: { gte: startOfToday },
                },
                _sum: { amount: true },
            }),
            db.tokenTransaction.aggregate({
                where: {
                    userId,
                    amount: { gt: 0 },
                    createdAt: { gte: startOfWeek },
                },
                _sum: { amount: true },
            }),
            db.tokenTransaction.aggregate({
                where: {
                    userId,
                    amount: { gt: 0 },
                    createdAt: { gte: startOfMonth },
                },
                _sum: { amount: true },
            }),
        ])

        return {
            today: todayEarnings._sum.amount || 0,
            thisWeek: weekEarnings._sum.amount || 0,
            thisMonth: monthEarnings._sum.amount || 0,
        }
    },

    /**
     * Get token-related data bundle for a user
     */
    getTokenDataBundle: async (userId: string): Promise<TokenDataBundle> => {
        const [transactions, streak, wallet, streakRewards] = await Promise.all([
            db.tokenTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            db.dailyStreak.findUnique({
                where: { userId },
            }),
            db.wallet.findUnique({
                where: { userId },
                select: { isConnected: true },
            }),
            db.streakReward.findMany({
                orderBy: { day: 'asc' },
            }),
        ])

        return {
            transactions,
            streak,
            walletConnected: wallet?.isConnected ?? false,
            streakRewards,
        }
    },

    /**
     * Check if wallet is connected
     */
    isWalletConnected: async (userId: string): Promise<boolean> => {
        const wallet = await db.wallet.findUnique({
            where: { userId },
            select: { isConnected: true },
        })
        return wallet?.isConnected ?? false
    },
}
