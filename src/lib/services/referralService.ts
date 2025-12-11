/**
 * ============================================================================
 * REFERRAL SERVICE
 * ============================================================================
 * 
 * Business logic for referral program operations.
 * 
 * DOMAIN SCOPE:
 * - Referral info retrieval
 * - Applying referral codes
 * - Tier status calculation
 * 
 * ALLOWED:
 * - Call referralRepo
 * - Use referralLogic helpers
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { referralRepo } from '@/src/lib/repositories/referralRepo'
import { userRepo } from '@/src/lib/repositories/userRepo'
import { getUserByClerkId } from '@/lib/db-helpers'

// Default tiers if none in database
const DEFAULT_TIERS = [
    { tier: 1, referrals: 5, reward: 10, bonus: '5% commission' },
    { tier: 2, referrals: 15, reward: 25, bonus: '7% commission' },
    { tier: 3, referrals: 50, reward: 50, bonus: '10% commission' },
    { tier: 4, referrals: 100, reward: 100, bonus: '15% commission + NFT' },
]

export interface ReferralInfoResponse {
    code: string
    link: string
    stats: {
        totalReferrals: number
        activeReferrals: number
        totalEarned: number
        currentTier: number
        commissionRate: number
    }
    tiers: Array<{
        tier: number
        referrals: number
        reward: number
        bonus: string
        unlocked: boolean
    }>
    referredUsers: Array<{
        id: string
        name: string
        joined: string
        earned: number
        status: 'active' | 'inactive'
    }>
}

export interface ApplyReferralResult {
    success: boolean
    message: string
}

export const referralService = {
    /**
     * Get referral info for the current user
     */
    getReferralInfo: async (clerkId: string): Promise<ReferralInfoResponse | null> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return null

        // Get or create referral stats
        const referralStats = await referralRepo.getOrCreateStats(user.id)

        // Get tiers
        const tiers = await referralRepo.findAllTiers()

        // Get referred users
        const referredUsers = await referralRepo.findReferredUsers(user.id)

        // Format referred users
        const now = new Date()
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
        const referredUsersFormatted = referredUsers.map((ru) => {
            const isActive = ru.lastLoginAt && new Date(ru.lastLoginAt).getTime() > sevenDaysAgo
            return {
                id: ru.id,
                name: ru.displayName || ru.username,
                joined: ru.createdAt.toISOString().split('T')[0],
                earned: 0,
                status: isActive ? 'active' as const : 'inactive' as const,
            }
        })

        // Format tiers or use defaults
        const formattedTiers = tiers.length > 0
            ? tiers.map((t) => ({
                tier: t.tier,
                referrals: t.requiredReferrals,
                reward: t.reward,
                bonus: t.bonus || `${Math.round(t.commissionRate * 100)}% commission`,
                unlocked: referralStats.totalReferrals >= t.requiredReferrals,
            }))
            : DEFAULT_TIERS.map((t) => ({
                ...t,
                unlocked: t.tier === 1,
            }))

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://linegamecenter.com'

        return {
            code: user.referralCode,
            link: `${baseUrl}/signup?ref=${user.referralCode}`,
            stats: {
                totalReferrals: referralStats.totalReferrals,
                activeReferrals: referralStats.activeReferrals,
                totalEarned: referralStats.totalEarned,
                currentTier: referralStats.currentTier,
                commissionRate: referralStats.commissionRate,
            },
            tiers: formattedTiers,
            referredUsers: referredUsersFormatted,
        }
    },

    /**
     * Apply a referral code for the current user
     */
    applyReferralCode: async (
        clerkId: string,
        referralCode: string
    ): Promise<ApplyReferralResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found' }
        }

        // Check if already referred
        if (user.referredById) {
            return { success: false, message: 'You have already used a referral code' }
        }

        // Find referrer
        const referrer = await referralRepo.findUserByReferralCode(referralCode)
        if (!referrer) {
            return { success: false, message: 'Invalid referral code' }
        }

        if (referrer.id === user.id) {
            return { success: false, message: 'You cannot use your own referral code' }
        }

        // Apply referral with bonus
        const bonusAmount = 200
        await referralRepo.applyReferral(
            user.id,
            referrer.id,
            user.username,
            referrer.tokenBalance,
            bonusAmount
        )

        return { success: true, message: 'Referral code applied successfully!' }
    },
}
