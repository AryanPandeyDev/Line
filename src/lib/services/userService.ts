/**
 * ============================================================================
 * USER SERVICE
 * ============================================================================
 * 
 * Contains all business logic related to users, profiles, and progression.
 * 
 * DOMAIN SCOPE:
 * - User registration and profile management
 * - User profile retrieval with aggregated data
 * - XP and level progression
 * 
 * ALLOWED:
 * - Call userRepo for database operations
 * - Use helpers for calculations (xpLogic, profileLogic)
 * - Return typed responses from models
 * 
 * FORBIDDEN:
 * - Direct Prisma client usage (use repositories instead)
 * - Reading request/response objects (that's the route handler's job)
 * - Accessing Clerk directly (clerkId should be passed as parameter)
 * 
 * ============================================================================
 */

import { userRepo } from '@/src/lib/repositories/userRepo'
import type { UserProfileResponse, ClerkUserData, CreateUserInput } from '@/src/lib/models/user'
import { generateReferralCode, generateRandomUsername } from '@/lib/db-helpers'

export const userService = {
    /**
     * Get user profile by Clerk ID for the GET /api/user endpoint
     * Returns null if user doesn't exist (caller should create)
     * 
     * @param clerkId - Clerk authentication user ID
     * @param clerkUserData - Data from Clerk's currentUser() for fallbacks
     */
    getUserProfile: async (
        clerkId: string,
        clerkUserData: ClerkUserData
    ): Promise<UserProfileResponse | null> => {
        const result = await userRepo.findByClerkIdWithStats(clerkId)

        if (!result) {
            return null
        }

        const { user, totalPlayTimeSeconds, totalReferrals } = result

        // Build profile response with Clerk fallbacks for display name and avatar
        return {
            id: user.id,
            clerkId: user.clerkId,
            email: user.email,
            username: user.username,
            displayName: user.displayName || clerkUserData.firstName || user.username,
            avatarUrl: user.avatarUrl || clerkUserData.imageUrl || null,
            level: user.level,
            xp: user.xp,
            xpToNextLevel: user.xpToNextLevel,
            tokens: user.tokenBalance,
            bonusPoints: user.bonusPoints,
            referralCode: user.referralCode,
            totalReferrals,
            totalPlayTimeSeconds,
            totalPlayTimeHours: Math.round((totalPlayTimeSeconds / 3600) * 10) / 10,
            createdAt: user.createdAt.toISOString(),
        }
    },

    /**
     * Get or create user profile
     * Creates user with welcome bonus if they don't exist
     * 
     * @param clerkId - Clerk authentication user ID
     * @param clerkUserData - Data from Clerk's currentUser()
     */
    getOrCreateUserProfile: async (
        clerkId: string,
        clerkUserData: ClerkUserData
    ): Promise<UserProfileResponse> => {
        // Try to get existing profile first
        let profile = await userService.getUserProfile(clerkId, clerkUserData)

        if (profile) {
            return profile
        }

        // User doesn't exist, create them
        await userService.createUser({
            clerkId,
            email: clerkUserData.emailAddress,
            username: clerkUserData.username || undefined,
            displayName: clerkUserData.fullName || clerkUserData.firstName || undefined,
            avatarUrl: clerkUserData.imageUrl || undefined,
        })

        // Fetch the newly created profile
        profile = await userService.getUserProfile(clerkId, clerkUserData)

        if (!profile) {
            throw new Error('Failed to create user profile')
        }

        return profile
    },

    /**
     * Create a new user with all associated records
     * 
     * @param input - User creation data
     */
    createUser: async (input: CreateUserInput): Promise<void> => {
        // Generate username if not provided
        let username = input.username
        if (!username) {
            // Try to generate a unique username
            for (let i = 0; i < 5; i++) {
                const candidate = generateRandomUsername()
                const exists = await userRepo.findByUsername(candidate)
                if (!exists) {
                    username = candidate
                    break
                }
            }
            if (!username) {
                username = `user_${Date.now()}`
            }
        }

        const referralCode = generateReferralCode()

        // Create user
        const user = await userRepo.create({
            clerkId: input.clerkId,
            email: input.email,
            username,
            displayName: input.displayName || null,
            avatarUrl: input.avatarUrl || null,
            referralCode,
            tokenBalance: 500, // Welcome bonus
            totalEarned: 500,
        })

        // Create associated records
        await userRepo.createAssociatedRecords(user.id, 500)
    },
}
