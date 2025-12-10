/**
 * ============================================================================
 * STREAK TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for daily login streaks.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Daily streak data
 */
export interface DailyStreak {
    userId: string
    currentStreak: number
    longestStreak: number
    lastClaimDate: Date | null
    streakStartDate: Date | null
    claimedDays: number[]
}

/**
 * Streak reward configuration
 */
export interface StreakReward {
    day: number
    reward: number
    isBonus: boolean
    bonusDescription: string | null
}

/**
 * Status of a single day in the streak cycle
 */
export interface StreakDayStatus {
    day: number
    reward: number
    status: 'claimed' | 'available' | 'locked'
    isToday: boolean
    isBonus: boolean
}

/**
 * Result of claiming daily streak
 */
export interface StreakClaimResult {
    success: boolean
    day: number
    reward: number
    currentStreak: number
    longestStreak: number
    isNewRecord: boolean
}

/**
 * Streak info for display
 */
export interface StreakInfoResponse {
    currentStreak: number
    longestStreak: number
    canClaimToday: boolean
    lastClaimDate: string | null
    streakStartDate: string | null
    days: StreakDayStatus[]
    todayReward: number
    nextMilestone: {
        day: number
        streaksAway: number
        reward: number
    } | null
}

/**
 * Streak leaderboard entry
 */
export interface StreakLeaderboardEntry {
    rank: number
    userId: string
    username: string
    displayName: string
    avatarUrl: string | null
    currentStreak: number
    longestStreak: number
}
