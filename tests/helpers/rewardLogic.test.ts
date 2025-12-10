/**
 * Unit tests for rewardLogic.ts helper functions
 * 
 * Tests pure functions for reward calculations:
 * - Game rewards
 * - Streak rewards
 * - Achievement rewards
 * - Multipliers
 */

import { describe, it, expect } from 'vitest'
import {
    calculateGameReward,
    calculateStreakReward,
    isStreakBonusDay,
    calculateAchievementReward,
    applyRewardMultiplier,
    getWelcomeBonus,
    calculateTaskReward,
} from '@/src/lib/helpers/rewardLogic'

describe('rewardLogic', () => {
    describe('calculateGameReward', () => {
        it('returns within min-max range', () => {
            // With maxScore, reward is deterministic
            const reward = calculateGameReward(50, 10, 100, false, 100)
            expect(reward).toBeGreaterThanOrEqual(10)
            expect(reward).toBeLessThanOrEqual(100)
        })

        it('scales with score when maxScore provided', () => {
            const lowScore = calculateGameReward(25, 10, 100, false, 100)
            const highScore = calculateGameReward(75, 10, 100, false, 100)
            expect(highScore).toBeGreaterThan(lowScore)
        })

        it('adds 20% win bonus', () => {
            const lossReward = calculateGameReward(50, 100, 100, false, 100)
            const winReward = calculateGameReward(50, 100, 100, true, 100)
            expect(winReward).toBe(lossReward + Math.floor(lossReward * 0.2))
        })

        it('handles perfect score', () => {
            const reward = calculateGameReward(100, 10, 100, false, 100)
            expect(reward).toBe(100) // Max reward for 100% score
        })

        it('handles 0 score', () => {
            const reward = calculateGameReward(0, 10, 100, false, 100)
            expect(reward).toBe(10) // Min reward
        })
    })

    describe('calculateStreakReward', () => {
        it('returns correct rewards for 7-day cycle', () => {
            expect(calculateStreakReward(1)).toBe(50)  // 25 + 1*25
            expect(calculateStreakReward(2)).toBe(75)  // 25 + 2*25
            expect(calculateStreakReward(3)).toBe(100) // 25 + 3*25
            expect(calculateStreakReward(4)).toBe(125) // 25 + 4*25
            expect(calculateStreakReward(5)).toBe(150) // 25 + 5*25
            expect(calculateStreakReward(6)).toBe(175) // 25 + 6*25
            expect(calculateStreakReward(7)).toBe(300) // Bonus day
        })

        it('cycles back after day 7', () => {
            expect(calculateStreakReward(8)).toBe(50)  // Day 1 of cycle 2
            expect(calculateStreakReward(14)).toBe(300) // Day 7 of cycle 2
        })

        it('handles high streak counts', () => {
            expect(calculateStreakReward(21)).toBe(300) // Day 7 of cycle 3
            expect(calculateStreakReward(100)).toBe(75) // Day 2 of cycle 15 (100-1=99, 99%7=1, +1=2)
        })
    })

    describe('isStreakBonusDay', () => {
        it('returns true for multiples of 7', () => {
            expect(isStreakBonusDay(7)).toBe(true)
            expect(isStreakBonusDay(14)).toBe(true)
            expect(isStreakBonusDay(21)).toBe(true)
        })

        it('returns false for non-multiples of 7', () => {
            expect(isStreakBonusDay(1)).toBe(false)
            expect(isStreakBonusDay(6)).toBe(false)
            expect(isStreakBonusDay(8)).toBe(false)
        })
    })

    describe('calculateAchievementReward', () => {
        it('returns minimum 50 tokens', () => {
            const result = calculateAchievementReward(1)
            expect(result.tokens).toBeGreaterThanOrEqual(50)
        })

        it('returns minimum 25 XP', () => {
            const result = calculateAchievementReward(1)
            expect(result.xp).toBeGreaterThanOrEqual(25)
        })

        it('scales with target value', () => {
            const low = calculateAchievementReward(10)
            const high = calculateAchievementReward(100)
            expect(high.tokens).toBeGreaterThan(low.tokens)
            expect(high.xp).toBeGreaterThan(low.xp)
        })

        it('handles edge case of 0 target', () => {
            const result = calculateAchievementReward(0)
            expect(result.tokens).toBe(50) // Minimum
            expect(result.xp).toBe(25) // Minimum
        })
    })

    describe('applyRewardMultiplier', () => {
        it('multiplies correctly', () => {
            expect(applyRewardMultiplier(100, 1.5)).toBe(150)
            expect(applyRewardMultiplier(100, 2)).toBe(200)
        })

        it('floors the result', () => {
            expect(applyRewardMultiplier(100, 1.33)).toBe(133)
        })

        it('handles 1x multiplier', () => {
            expect(applyRewardMultiplier(100, 1)).toBe(100)
        })

        it('handles 0 base', () => {
            expect(applyRewardMultiplier(0, 2)).toBe(0)
        })
    })

    describe('getWelcomeBonus', () => {
        it('returns 500 tokens', () => {
            expect(getWelcomeBonus()).toBe(500)
        })

        it('is deterministic', () => {
            expect(getWelcomeBonus()).toBe(getWelcomeBonus())
        })
    })

    describe('calculateTaskReward', () => {
        it('returns correct rewards with default multiplier', () => {
            const result = calculateTaskReward(100, 50)
            expect(result.tokens).toBe(100)
            expect(result.xp).toBe(50)
        })

        it('applies multiplier correctly', () => {
            const result = calculateTaskReward(100, 50, 2)
            expect(result.tokens).toBe(200)
            expect(result.xp).toBe(100)
        })

        it('floors results', () => {
            const result = calculateTaskReward(100, 50, 1.5)
            expect(result.tokens).toBe(150)
            expect(result.xp).toBe(75)
        })
    })
})
