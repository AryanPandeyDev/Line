/**
 * ============================================================================
 * REFERRAL TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for referral program data.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Referral statistics for a user
 */
export interface ReferralStats {
    userId: string
    totalReferrals: number
    activeReferrals: number
    totalEarned: number
    currentTier: number
    commissionRate: number
}

/**
 * Referral tier configuration
 */
export interface ReferralTier {
    tier: number
    name: string
    requiredReferrals: number
    reward: number
    commissionRate: number
    bonus: string
}

/**
 * Tier with unlock status for display
 */
export interface ReferralTierWithStatus extends ReferralTier {
    unlocked: boolean
    current: boolean
}

/**
 * A user who was referred
 */
export interface ReferredUser {
    id: string
    name: string
    username: string
    joined: string
    earned: number
    status: 'active' | 'inactive'
}

/**
 * Complete referral info response
 */
export interface ReferralInfoResponse {
    code: string
    link: string
    stats: ReferralStats
    tiers: ReferralTierWithStatus[]
    referredUsers: ReferredUser[]
}

/**
 * Result of applying a referral code
 */
export interface ApplyReferralResult {
    success: boolean
    message: string
    referrerName?: string
}
