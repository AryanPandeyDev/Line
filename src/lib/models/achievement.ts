/**
 * ============================================================================
 * ACHIEVEMENT TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for achievements and progress.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Achievement definition
 */
export interface Achievement {
    id: string
    name: string
    description: string
    iconUrl: string | null
    category: string
    xpReward: number
    tokenReward: number
    targetValue: number
}

/**
 * User's progress on an achievement
 */
export interface UserAchievement {
    id: string
    achievementId: string
    userId: string
    progress: number
    isUnlocked: boolean
    unlockedAt: Date | null
    claimedAt: Date | null
}

/**
 * Achievement with progress for display
 */
export interface AchievementWithProgress {
    id: string
    name: string
    description: string
    iconUrl: string | null
    category: string
    xpReward: number
    tokenReward: number
    targetValue: number
    progress: number
    percentComplete: number
    isUnlocked: boolean
    isClaimed: boolean
    unlockedAt: string | null
}

/**
 * Result of claiming achievement reward
 */
export interface AchievementClaimResult {
    success: boolean
    tokensEarned: number
    xpEarned: number
}

/**
 * Achievements response
 */
export interface AchievementsResponse {
    achievements: AchievementWithProgress[]
    summary: {
        totalAvailable: number
        totalUnlocked: number
        totalClaimed: number
        totalTokensEarnable: number
        totalXPEarnable: number
    }
}

/**
 * Achievement unlock notification
 */
export interface AchievementUnlockNotification {
    achievementId: string
    name: string
    description: string
    iconUrl: string | null
    rewards: {
        tokens: number
        xp: number
    }
}
