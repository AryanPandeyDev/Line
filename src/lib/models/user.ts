/**
 * ============================================================================
 * USER TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for user-related data.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * They represent API/domain shapes, not database shapes.
 * 
 * ============================================================================
 */

/**
 * User profile response returned from GET /api/user
 * This matches the exact shape currently returned by the API
 */
export interface UserProfileResponse {
    id: string
    clerkId: string
    email: string
    username: string
    displayName: string
    avatarUrl: string | null
    level: number
    xp: number
    xpToNextLevel: number
    tokens: number
    bonusPoints: number
    referralCode: string
    totalReferrals: number
    totalPlayTimeSeconds: number
    totalPlayTimeHours: number
    createdAt: string
}

/**
 * Data needed from Clerk for user profile building
 */
export interface ClerkUserData {
    firstName: string | null
    fullName: string | null
    imageUrl: string | null
    emailAddress: string
    username: string | null
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
    clerkId: string
    email: string
    username?: string
    displayName?: string
    avatarUrl?: string
}

/**
 * Input for updating user profile
 */
export interface UpdateUserInput {
    username?: string
    displayName?: string
    avatarUrl?: string
}

/**
 * Core user entity (subset of Prisma User)
 */
export interface User {
    id: string
    clerkId: string
    email: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    level: number
    xp: number
    xpToNextLevel: number
    tokenBalance: number
    bonusPoints: number
    totalEarned: number
    referralCode: string
    referredById: string | null
    createdAt: Date
    lastLoginAt: Date | null
}

/**
 * Aggregated user statistics
 */
export interface UserStats {
    gamesPlayed: number
    totalWins: number
    totalPlayTimeSeconds: number
    tokensEarned: number
    achievementsUnlocked: number
    currentStreak: number
}

/**
 * Level up result
 */
export interface LevelUpResult {
    oldLevel: number
    newLevel: number
    levelsGained: number
    newXP: number
    xpToNextLevel: number
}
