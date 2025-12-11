/**
 * ============================================================================
 * REFERRAL LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for referral-related calculations.
 * 
 * ALLOWED:
 * - Mathematical calculations
 * - String formatting and generation
 * - Data transformations
 * - Returning computed values
 * 
 * FORBIDDEN:
 * - Database operations (no Prisma)
 * - Async operations
 * - Side effects
 * - External API calls
 * - Modifying input parameters
 * 
 * All functions MUST be:
 * - Pure (same input = same output)
 * - Synchronous
 * - Stateless
 * 
 * ============================================================================
 */

/**
 * Generate a unique referral code
 * Format: LINE-XXXXXXXX (8 uppercase alphanumeric characters)
 */
export function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'LINE-'
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

/**
 * Validate referral code format
 * @returns true if code matches LINE-XXXXXXXX pattern
 */
export function isValidReferralCode(code: string): boolean {
    return /^LINE-[A-Z0-9]{8}$/.test(code.toUpperCase())
}

/**
 * Calculate commission amount based on rate
 * @param amount - Base amount to calculate commission from
 * @param rate - Commission rate (e.g., 0.05 for 5%)
 * @returns Commission amount, rounded down to integer
 */
export function calculateCommission(amount: number, rate: number): number {
    return Math.floor(amount * rate)
}

/**
 * Determine tier based on total referral count
 * Tier 1: 0-14 referrals
 * Tier 2: 15-49 referrals
 * Tier 3: 50-99 referrals
 * Tier 4: 100+ referrals
 */
export function getTierForReferralCount(count: number): number {
    if (count >= 100) return 4
    if (count >= 50) return 3
    if (count >= 15) return 2
    return 1
}

/**
 * Get commission rate for a specific tier
 * Tier 1: 5%
 * Tier 2: 7%
 * Tier 3: 10%
 * Tier 4: 15%
 */
export function getCommissionRateForTier(tier: number): number {
    const rates: Record<number, number> = {
        1: 0.05,
        2: 0.07,
        3: 0.10,
        4: 0.15,
    }
    return rates[tier] ?? 0.05
}

/**
 * Get tier bonus reward amount
 */
export function getTierBonusReward(tier: number): number {
    const bonuses: Record<number, number> = {
        1: 0,
        2: 10,
        3: 20,
        4: 50,
    }
    return bonuses[tier] ?? 0
}

/**
 * Check if user is eligible for tier upgrade
 * @returns Object with eligibility and new tier info
 */
export function checkTierUpgradeEligibility(
    currentTier: number,
    totalReferrals: number
): { eligible: boolean; newTier: number; bonus: number } {
    const newTier = getTierForReferralCount(totalReferrals)
    const eligible = newTier > currentTier
    return {
        eligible,
        newTier,
        bonus: eligible ? getTierBonusReward(newTier) : 0,
    }
}

/**
 * Build referral link from base URL and code
 */
export function buildReferralLink(baseUrl: string, code: string): string {
    return `${baseUrl}/signup?ref=${code}`
}

/**
 * Calculate referral bonus for new referral
 * Base bonus depends on referrer's current tier
 */
export function calculateNewReferralBonus(referrerTier: number): number {
    const bonuses: Record<number, number> = {
        1: 200,
        2: 250,
        3: 300,
        4: 400,
    }
    return bonuses[referrerTier] ?? 200
}
