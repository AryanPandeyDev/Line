/**
 * Unit tests for referralLogic.ts helper functions
 * 
 * Tests pure functions for referral calculations:
 * - Referral code generation and validation
 * - Commission calculations
 * - Tier determination
 * - Bonus calculations
 */

import { describe, it, expect } from 'vitest'
import {
    generateReferralCode,
    isValidReferralCode,
    calculateCommission,
    getTierForReferralCount,
    getCommissionRateForTier,
    getTierBonusReward,
    checkTierUpgradeEligibility,
    buildReferralLink,
    calculateNewReferralBonus,
} from '@/src/lib/helpers/referralLogic'

describe('referralLogic', () => {
    describe('generateReferralCode', () => {
        it('generates code with correct format', () => {
            const code = generateReferralCode()
            expect(code).toMatch(/^LINE-[A-Z0-9]{8}$/)
        })

        it('generates unique codes', () => {
            const codes = new Set<string>()
            for (let i = 0; i < 100; i++) {
                codes.add(generateReferralCode())
            }
            // Should have 100 unique codes (extremely low collision probability)
            expect(codes.size).toBe(100)
        })
    })

    describe('isValidReferralCode', () => {
        it('returns true for valid codes', () => {
            expect(isValidReferralCode('LINE-ABCD1234')).toBe(true)
            expect(isValidReferralCode('LINE-12345678')).toBe(true)
            expect(isValidReferralCode('line-abcd1234')).toBe(true) // case insensitive
        })

        it('returns false for invalid codes', () => {
            expect(isValidReferralCode('ABCD1234')).toBe(false) // missing prefix
            expect(isValidReferralCode('LINE-ABC')).toBe(false) // too short
            expect(isValidReferralCode('LINE-ABCD12345')).toBe(false) // too long
            expect(isValidReferralCode('LINE-ABCD123!')).toBe(false) // special char
            expect(isValidReferralCode('')).toBe(false)
        })
    })

    describe('calculateCommission', () => {
        it('calculates commission correctly', () => {
            expect(calculateCommission(100, 0.05)).toBe(5)
            expect(calculateCommission(1000, 0.10)).toBe(100)
            expect(calculateCommission(500, 0.15)).toBe(75)
        })

        it('floors the result', () => {
            expect(calculateCommission(101, 0.05)).toBe(5) // 5.05 -> 5
            expect(calculateCommission(33, 0.07)).toBe(2) // 2.31 -> 2
        })

        it('handles zero correctly', () => {
            expect(calculateCommission(0, 0.10)).toBe(0)
            expect(calculateCommission(100, 0)).toBe(0)
        })
    })

    describe('getTierForReferralCount', () => {
        it('returns tier 1 for 0-14 referrals', () => {
            expect(getTierForReferralCount(0)).toBe(1)
            expect(getTierForReferralCount(10)).toBe(1)
            expect(getTierForReferralCount(14)).toBe(1)
        })

        it('returns tier 2 for 15-49 referrals', () => {
            expect(getTierForReferralCount(15)).toBe(2)
            expect(getTierForReferralCount(25)).toBe(2)
            expect(getTierForReferralCount(49)).toBe(2)
        })

        it('returns tier 3 for 50-99 referrals', () => {
            expect(getTierForReferralCount(50)).toBe(3)
            expect(getTierForReferralCount(75)).toBe(3)
            expect(getTierForReferralCount(99)).toBe(3)
        })

        it('returns tier 4 for 100+ referrals', () => {
            expect(getTierForReferralCount(100)).toBe(4)
            expect(getTierForReferralCount(500)).toBe(4)
            expect(getTierForReferralCount(1000)).toBe(4)
        })
    })

    describe('getCommissionRateForTier', () => {
        it('returns correct rates for each tier', () => {
            expect(getCommissionRateForTier(1)).toBe(0.05)
            expect(getCommissionRateForTier(2)).toBe(0.07)
            expect(getCommissionRateForTier(3)).toBe(0.10)
            expect(getCommissionRateForTier(4)).toBe(0.15)
        })

        it('returns default rate for invalid tier', () => {
            expect(getCommissionRateForTier(0)).toBe(0.05)
            expect(getCommissionRateForTier(5)).toBe(0.05)
        })
    })

    describe('getTierBonusReward', () => {
        it('returns correct bonuses for each tier', () => {
            expect(getTierBonusReward(1)).toBe(0)
            expect(getTierBonusReward(2)).toBe(500)
            expect(getTierBonusReward(3)).toBe(1000)
            expect(getTierBonusReward(4)).toBe(2500)
        })
    })

    describe('checkTierUpgradeEligibility', () => {
        it('detects upgrade eligibility', () => {
            const result = checkTierUpgradeEligibility(1, 20)
            expect(result.eligible).toBe(true)
            expect(result.newTier).toBe(2)
            expect(result.bonus).toBe(500)
        })

        it('returns not eligible when no upgrade', () => {
            const result = checkTierUpgradeEligibility(2, 20)
            expect(result.eligible).toBe(false)
            expect(result.newTier).toBe(2)
            expect(result.bonus).toBe(0)
        })

        it('handles multi-tier jumps', () => {
            const result = checkTierUpgradeEligibility(1, 100)
            expect(result.eligible).toBe(true)
            expect(result.newTier).toBe(4)
            expect(result.bonus).toBe(2500)
        })
    })

    describe('buildReferralLink', () => {
        it('builds correct link', () => {
            expect(buildReferralLink('https://example.com', 'LINE-ABCD1234'))
                .toBe('https://example.com/signup?ref=LINE-ABCD1234')
        })
    })

    describe('calculateNewReferralBonus', () => {
        it('returns correct bonus for each tier', () => {
            expect(calculateNewReferralBonus(1)).toBe(200)
            expect(calculateNewReferralBonus(2)).toBe(250)
            expect(calculateNewReferralBonus(3)).toBe(300)
            expect(calculateNewReferralBonus(4)).toBe(400)
        })

        it('returns default for invalid tier', () => {
            expect(calculateNewReferralBonus(0)).toBe(200)
        })
    })
})
