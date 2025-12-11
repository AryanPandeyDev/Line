/**
 * ============================================================================
 * TOKEN SERVICE
 * ============================================================================
 * 
 * Business logic for token operations.
 * 
 * DOMAIN SCOPE:
 * - Token balance and history
 * - Daily streak claims
 * - Earnings tracking
 * 
 * ALLOWED:
 * - Call tokenRepo
 * - Use db-helpers for token operations
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { tokenRepo } from '@/src/lib/repositories/tokenRepo'
import { getUserByClerkId, claimDailyStreak, addTokensToUser } from '@/lib/db-helpers'
import { db } from '@/lib/db'

export interface TokenInfoResponse {
    balance: number
    totalEarned: number
    walletConnected: boolean
    dailyClaimAvailable: boolean
    nextRewardAmount: number
    currentStreak: number
    history: Array<{
        type: string
        amount: number
        source: string
        timestamp: string
    }>
    dailyEarnings: {
        today: number
        thisWeek: number
        thisMonth: number
    }
}

export interface ClaimResult {
    success: boolean
    newBalance?: number
    message: string
    currentStreak?: number
    error?: string
    code?: string
}

export const tokenService = {
    /**
     * Get token info for the current user
     */
    getTokenInfo: async (clerkId: string): Promise<TokenInfoResponse | null> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return null

        const [dataBundle, earnings] = await Promise.all([
            tokenRepo.getTokenDataBundle(user.id),
            tokenRepo.getEarningsAggregates(user.id),
        ])

        const { transactions, streak, walletConnected, streakRewards } = dataBundle

        // Check if daily claim is available
        const now = new Date()
        const lastClaimDate = streak?.lastClaimDate
        const canClaimToday = !lastClaimDate ||
            new Date(lastClaimDate).toDateString() !== now.toDateString()

        // Calculate next reward amount
        const currentStreak = streak?.currentStreak || 0
        const nextDay = canClaimToday ? (currentStreak % 7) + 1 : ((currentStreak % 7) + 1)
        const nextReward = streakRewards.find((sr) => sr.day === nextDay)
        const nextRewardAmount = nextReward?.reward || 1 // Default to 1 if not found in DB

        return {
            balance: user.tokenBalance,
            totalEarned: user.totalEarned,
            walletConnected,
            dailyClaimAvailable: canClaimToday,
            nextRewardAmount,
            currentStreak,
            history: transactions.map((t) => ({
                type: t.type.toLowerCase().replace('_', '-'),
                amount: t.amount,
                source: t.source,
                timestamp: t.createdAt.toISOString(),
            })),
            dailyEarnings: earnings,
        }
    },

    /**
     * Claim daily streak reward
     */
    claimDailyReward: async (clerkId: string): Promise<ClaimResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found' }
        }

        // Check wallet connection
        const isConnected = await tokenRepo.isWalletConnected(user.id)
        if (!isConnected) {
            return {
                success: false,
                message: 'Wallet must be connected to claim rewards',
                code: 'WALLET_NOT_CONNECTED',
            }
        }

        try {
            const result = await claimDailyStreak(user.id)

            const updatedUser = await db.user.findUnique({
                where: { id: user.id },
                select: { tokenBalance: true },
            })

            return {
                success: true,
                newBalance: updatedUser?.tokenBalance || 0,
                message: `Successfully claimed Day ${result.day} streak bonus: ${result.reward} LINE tokens!`,
                currentStreak: result.currentStreak,
            }
        } catch {
            return { success: false, message: 'Failed to claim daily reward' }
        }
    },

    /**
     * Add tokens (admin action)
     */
    addTokens: async (clerkId: string, amount: number): Promise<ClaimResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found' }
        }

        await addTokensToUser(user.id, amount, 'Manual Addition', 'EARN')

        const updatedUser = await db.user.findUnique({
            where: { id: user.id },
            select: { tokenBalance: true },
        })

        return {
            success: true,
            newBalance: updatedUser?.tokenBalance || 0,
            message: `Successfully added ${amount} LINE tokens!`,
        }
    },
}
