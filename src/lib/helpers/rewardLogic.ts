/**
 * ============================================================================
 * REWARD LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for reward calculations across all domains.
 * 
 * ALLOWED:
 * - Mathematical calculations
 * - Random number generation for ranges
 * - Tier/level-based multipliers
 * 
 * FORBIDDEN:
 * - Database operations (no Prisma)
 * - Async operations
 * - Side effects
 * - Modifying user balances
 * 
 * All functions MUST be:
 * - Pure (deterministic where possible, documented when random)
 * - Synchronous
 * - Stateless
 * 
 * ============================================================================
 */

/**
 * Calculate game reward based on score and game config
 * Higher scores get proportionally higher rewards
 * Winning adds a 20% bonus
 * 
 * @param score - Player's score
 * @param minReward - Minimum reward for the game
 * @param maxReward - Maximum reward for the game
 * @param won - Whether player won
 * @param maxScore - Optional max score for proportional calculation
 */
export function calculateGameReward(
    score: number,
    minReward: number,
    maxReward: number,
    won: boolean,
    maxScore?: number
): number {
    // If no max score, use random within range
    let baseReward: number
    if (maxScore && maxScore > 0) {
        const ratio = Math.min(score / maxScore, 1)
        baseReward = Math.floor(minReward + (maxReward - minReward) * ratio)
    } else {
        baseReward = Math.floor(Math.random() * (maxReward - minReward)) + minReward
    }

    const winBonus = won ? Math.floor(baseReward * 0.2) : 0
    return baseReward + winBonus
}

/**
 * Calculate streak reward for a specific day
 * 7-day cycle with bonus on day 7
 * 
 * Day 1: 1 token
 * Day 2: 1 token
 * Day 3: 1 token
 * Day 4: 2 tokens
 * Day 5: 2 tokens
 * Day 6: 3 tokens
 * Day 7: 5 tokens (bonus day)
 */
export function calculateStreakReward(streakDay: number): number {
    const dayInCycle = ((streakDay - 1) % 7) + 1

    const rewards: Record<number, number> = {
        1: 1,
        2: 1,
        3: 1,
        4: 2,
        5: 2,
        6: 3,
        7: 5,
    }

    return rewards[dayInCycle] ?? 1
}

/**
 * Check if a day is a bonus day (every 7th day)
 */
export function isStreakBonusDay(streakDay: number): boolean {
    return streakDay % 7 === 0
}

/**
 * Calculate achievement reward based on difficulty/target
 * Higher targets = higher rewards
 */
export function calculateAchievementReward(targetValue: number): {
    tokens: number
    xp: number
} {
    // Scale rewards logarithmically with target
    const tokenBase = Math.floor(Math.log2(targetValue + 1) * 50)
    const xpBase = Math.floor(Math.log2(targetValue + 1) * 25)

    return {
        tokens: Math.max(50, tokenBase),
        xp: Math.max(25, xpBase),
    }
}

/**
 * Apply bonus multiplier to a reward
 * Used for special events or promotions
 */
export function applyRewardMultiplier(base: number, multiplier: number): number {
    return Math.floor(base * multiplier)
}

/**
 * Get welcome bonus amount for new users
 */
export function getWelcomeBonus(): number {
    return 500
}

/**
 * Calculate task completion reward with optional bonus
 */
export function calculateTaskReward(
    baseReward: number,
    baseXP: number,
    bonusMultiplier: number = 1
): { tokens: number; xp: number } {
    return {
        tokens: Math.floor(baseReward * bonusMultiplier),
        xp: Math.floor(baseXP * bonusMultiplier),
    }
}
