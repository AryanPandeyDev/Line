/**
 * Unit tests for xpLogic.ts helper functions
 * 
 * Tests pure functions for XP and level calculations:
 * - XP requirements per level
 * - Level-up mechanics
 * - Progress calculations
 * - Streak bonuses
 */

import { describe, it, expect } from 'vitest'
import {
    calculateXPForLevel,
    calculateTotalXPForLevel,
    calculateLevelFromTotalXP,
    calculateLevelUp,
    calculateXPProgress,
    calculateGameXP,
    calculateStreakXPBonus,
    getLevelTitle,
} from '@/src/lib/helpers/xpLogic'

describe('xpLogic', () => {
    describe('calculateXPForLevel', () => {
        it('returns correct XP for level 1', () => {
            expect(calculateXPForLevel(1)).toBe(1000)
        })

        it('returns correct XP for level 2', () => {
            expect(calculateXPForLevel(2)).toBe(1200)
        })

        it('returns increasing XP for higher levels', () => {
            const level5 = calculateXPForLevel(5)
            const level10 = calculateXPForLevel(10)
            const level20 = calculateXPForLevel(20)

            expect(level5).toBeGreaterThan(calculateXPForLevel(1))
            expect(level10).toBeGreaterThan(level5)
            expect(level20).toBeGreaterThan(level10)
        })

        it('returns 0 for level 0 or negative', () => {
            expect(calculateXPForLevel(0)).toBe(0)
            expect(calculateXPForLevel(-1)).toBe(0)
        })

        it('floors the result', () => {
            // All results should be integers
            for (let i = 1; i <= 20; i++) {
                const xp = calculateXPForLevel(i)
                expect(Number.isInteger(xp)).toBe(true)
            }
        })
    })

    describe('calculateTotalXPForLevel', () => {
        it('returns 0 for level 1', () => {
            expect(calculateTotalXPForLevel(1)).toBe(0)
        })

        it('returns correct total for level 2', () => {
            expect(calculateTotalXPForLevel(2)).toBe(1000)
        })

        it('returns correct total for level 3', () => {
            // Level 1: 1000 + Level 2: 1200 = 2200
            expect(calculateTotalXPForLevel(3)).toBe(2200)
        })

        it('is monotonically increasing', () => {
            for (let i = 1; i < 20; i++) {
                expect(calculateTotalXPForLevel(i + 1)).toBeGreaterThan(calculateTotalXPForLevel(i))
            }
        })
    })

    describe('calculateLevelFromTotalXP', () => {
        it('returns level 1 for 0 XP', () => {
            expect(calculateLevelFromTotalXP(0)).toBe(1)
        })

        it('returns level 1 for XP less than 1000', () => {
            expect(calculateLevelFromTotalXP(999)).toBe(1)
        })

        it('returns level 2 for exactly 1000 XP', () => {
            expect(calculateLevelFromTotalXP(1000)).toBe(2)
        })

        it('returns level 3 for 2200 XP', () => {
            expect(calculateLevelFromTotalXP(2200)).toBe(3)
        })

        it('is inverse of calculateTotalXPForLevel', () => {
            for (let level = 1; level <= 10; level++) {
                const totalXP = calculateTotalXPForLevel(level)
                expect(calculateLevelFromTotalXP(totalXP)).toBe(level)
            }
        })
    })

    describe('calculateLevelUp', () => {
        it('returns same level when XP not enough', () => {
            const result = calculateLevelUp(500, 1, 100)
            expect(result.newLevel).toBe(1)
            expect(result.newXP).toBe(600)
            expect(result.levelsGained).toBe(0)
        })

        it('levels up when XP reaches threshold', () => {
            const result = calculateLevelUp(900, 1, 150)
            expect(result.newLevel).toBe(2)
            expect(result.newXP).toBe(50) // 1050 - 1000 = 50
            expect(result.levelsGained).toBe(1)
        })

        it('handles multiple level ups', () => {
            const result = calculateLevelUp(0, 1, 3000)
            expect(result.newLevel).toBeGreaterThan(2) // Should gain at least 2 levels
            expect(result.levelsGained).toBeGreaterThan(1)
        })

        it('returns correct xpToNextLevel', () => {
            const result = calculateLevelUp(0, 1, 500)
            expect(result.xpToNextLevel).toBe(1000) // Level 1 needs 1000
        })
    })

    describe('calculateXPProgress', () => {
        it('returns 0% for 0 XP', () => {
            expect(calculateXPProgress(0, 1000)).toBe(0)
        })

        it('returns 50% for halfway', () => {
            expect(calculateXPProgress(500, 1000)).toBe(50)
        })

        it('returns 100% when XP equals required', () => {
            expect(calculateXPProgress(1000, 1000)).toBe(100)
        })

        it('handles edge case of 0 xpToNextLevel', () => {
            expect(calculateXPProgress(500, 0)).toBe(100)
        })
    })

    describe('calculateGameXP', () => {
        it('returns base XP for loss', () => {
            const xp = calculateGameXP({ won: false, highScoreBeaten: false })
            expect(xp).toBe(10) // Default base
        })

        it('adds 15 XP for winning', () => {
            const xp = calculateGameXP({ won: true, highScoreBeaten: false })
            expect(xp).toBe(25) // 10 + 15
        })

        it('adds 25 XP for high score', () => {
            const xp = calculateGameXP({ won: false, highScoreBeaten: true })
            expect(xp).toBe(35) // 10 + 25
        })

        it('stacks all bonuses', () => {
            const xp = calculateGameXP({
                won: true,
                highScoreBeaten: true,
                streakBonus: 10
            })
            expect(xp).toBe(60) // 10 + 15 + 25 + 10
        })

        it('uses custom base XP', () => {
            const xp = calculateGameXP({ baseXP: 20, won: false, highScoreBeaten: false })
            expect(xp).toBe(20)
        })
    })

    describe('calculateStreakXPBonus', () => {
        it('returns 5 XP per streak day', () => {
            expect(calculateStreakXPBonus(1)).toBe(5)
            expect(calculateStreakXPBonus(5)).toBe(25)
        })

        it('caps at 50 XP', () => {
            expect(calculateStreakXPBonus(10)).toBe(50)
            expect(calculateStreakXPBonus(100)).toBe(50)
        })

        it('returns 0 for 0 streak', () => {
            expect(calculateStreakXPBonus(0)).toBe(0)
        })
    })

    describe('getLevelTitle', () => {
        it('returns correct titles for level ranges', () => {
            expect(getLevelTitle(1)).toBe('Novice')
            expect(getLevelTitle(5)).toBe('Apprentice')
            expect(getLevelTitle(10)).toBe('Skilled')
            expect(getLevelTitle(20)).toBe('Veteran')
            expect(getLevelTitle(30)).toBe('Expert')
            expect(getLevelTitle(40)).toBe('Master')
            expect(getLevelTitle(50)).toBe('Legendary')
        })

        it('returns Legendary for very high levels', () => {
            expect(getLevelTitle(100)).toBe('Legendary')
        })
    })
})
