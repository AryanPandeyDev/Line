/**
 * ============================================================================
 * XP LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for XP and level calculations.
 * 
 * LEVEL SYSTEM:
 * - XP required increases exponentially per level
 * - Formula: 1000 * (1.2 ^ (level - 1))
 * - Level 1: 1000 XP
 * - Level 2: 1200 XP
 * - Level 10: ~5159 XP
 * - Level 20: ~27,485 XP
 * 
 * ALLOWED:
 * - Mathematical calculations
 * - Level progression logic
 * 
 * FORBIDDEN:
 * - Database operations
 * - Side effects
 * - Async operations
 * 
 * All functions MUST be pure and synchronous.
 * 
 * ============================================================================
 */

/**
 * Calculate XP required to complete a specific level
 * Formula: 1000 * (1.2 ^ (level - 1))
 */
export function calculateXPForLevel(level: number): number {
    if (level < 1) return 0
    return Math.floor(1000 * Math.pow(1.2, level - 1))
}

/**
 * Calculate total XP needed to reach a level from level 1
 */
export function calculateTotalXPForLevel(targetLevel: number): number {
    let total = 0
    for (let l = 1; l < targetLevel; l++) {
        total += calculateXPForLevel(l)
    }
    return total
}

/**
 * Calculate level from total accumulated XP
 */
export function calculateLevelFromTotalXP(totalXP: number): number {
    let level = 1
    let accumulated = 0

    while (true) {
        const xpForThisLevel = calculateXPForLevel(level)
        if (accumulated + xpForThisLevel > totalXP) {
            break
        }
        accumulated += xpForThisLevel
        level++
    }

    return level
}

/**
 * Calculate result of adding XP to current state
 * Handles multiple level ups if XP is high enough
 */
export function calculateLevelUp(
    currentXP: number,
    currentLevel: number,
    xpToAdd: number
): {
    newXP: number
    newLevel: number
    xpToNextLevel: number
    levelsGained: number
} {
    let xp = currentXP + xpToAdd
    let level = currentLevel
    let xpNeeded = calculateXPForLevel(level)

    // Process level ups
    while (xp >= xpNeeded) {
        xp -= xpNeeded
        level++
        xpNeeded = calculateXPForLevel(level)
    }

    return {
        newXP: xp,
        newLevel: level,
        xpToNextLevel: xpNeeded,
        levelsGained: level - currentLevel,
    }
}

/**
 * Calculate XP progress percentage toward next level
 */
export function calculateXPProgress(currentXP: number, xpToNextLevel: number): number {
    if (xpToNextLevel <= 0) return 100
    return Math.floor((currentXP / xpToNextLevel) * 100)
}

/**
 * Calculate XP reward for game completion
 * Base XP + bonuses for winning and beating high score
 */
export function calculateGameXP(params: {
    baseXP?: number
    won: boolean
    highScoreBeaten: boolean
    streakBonus?: number
}): number {
    const base = params.baseXP ?? 10
    let xp = base

    if (params.won) xp += 15
    if (params.highScoreBeaten) xp += 25
    if (params.streakBonus) xp += params.streakBonus

    return xp
}

/**
 * Calculate streak XP bonus based on current streak
 * Max 50 bonus XP at 10+ day streak
 */
export function calculateStreakXPBonus(currentStreak: number): number {
    return Math.min(currentStreak * 5, 50)
}

/**
 * Get level title/rank name
 */
export function getLevelTitle(level: number): string {
    if (level >= 50) return 'Legendary'
    if (level >= 40) return 'Master'
    if (level >= 30) return 'Expert'
    if (level >= 20) return 'Veteran'
    if (level >= 10) return 'Skilled'
    if (level >= 5) return 'Apprentice'
    return 'Novice'
}
