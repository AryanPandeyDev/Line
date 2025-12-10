/**
 * ============================================================================
 * ACHIEVEMENT SERVICE
 * ============================================================================
 * 
 * Business logic for achievement operations.
 * 
 * DOMAIN SCOPE:
 * - Achievement list retrieval
 * - Unlock and progress tracking
 * - Reward granting
 * 
 * ALLOWED:
 * - Call achievementRepo
 * - Use db-helpers for rewards
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { achievementRepo } from '@/src/lib/repositories/achievementRepo'
import { getUserByClerkId, addTokensToUser, addXPToUser } from '@/lib/db-helpers'

export interface AchievementsResponse {
    achievements: Array<{
        id: string
        name: string
        description: string
        icon: string
        xpReward: number
        tokenReward: number
        unlocked: boolean
        unlockedAt: string | null
        progress?: { current: number; target: number }
    }>
    stats: {
        total: number
        unlocked: number
        totalXpEarned: number
        totalTokensEarned: number
    }
}

export interface AchievementActionResult {
    success: boolean
    message?: string
    rewards?: { tokens: number; xp: number }
    progress?: number
    target?: number
    unlocked?: boolean
    error?: string
}

export const achievementService = {
    /**
     * Get all achievements with user progress
     */
    getAchievements: async (clerkId: string): Promise<AchievementsResponse | null> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return null

        const { achievements: allAchievements, userAchievements } = await achievementRepo.getAchievementDataBundle(user.id)

        // Map user achievements
        const userAchMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))

        // Format achievements
        const achievements = allAchievements.map((ach) => {
            const userAch = userAchMap.get(ach.id)
            return {
                id: ach.slug,
                name: ach.name,
                description: ach.description,
                icon: ach.icon,
                xpReward: ach.xpReward,
                tokenReward: ach.tokenReward,
                unlocked: userAch?.isUnlocked || false,
                unlockedAt: userAch?.unlockedAt?.toISOString() || null,
                progress: userAch && ach.targetValue > 1
                    ? { current: userAch.progress, target: ach.targetValue }
                    : undefined,
            }
        })

        // Calculate stats
        const unlockedList = achievements.filter((a) => a.unlocked)
        const totalXpEarned = unlockedList.reduce((acc, a) => acc + a.xpReward, 0)
        const totalTokensEarned = unlockedList.reduce((acc, a) => acc + a.tokenReward, 0)

        return {
            achievements,
            stats: {
                total: achievements.length,
                unlocked: unlockedList.length,
                totalXpEarned,
                totalTokensEarned,
            },
        }
    },

    /**
     * Unlock an achievement
     */
    unlockAchievement: async (clerkId: string, achievementId: string): Promise<AchievementActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, error: 'User not found' }

        const achievement = await achievementRepo.findByIdOrSlug(achievementId)
        if (!achievement) return { success: false, error: 'Achievement not found' }

        let userAchievement = await achievementRepo.findUserAchievement(user.id, achievement.id)

        if (userAchievement?.isUnlocked) {
            return { success: false, error: 'Achievement already unlocked' }
        }

        if (!userAchievement) {
            await achievementRepo.createUserAchievement(user.id, achievement.id, {
                progress: achievement.targetValue,
                isUnlocked: true,
                unlockedAt: new Date(),
            })
        } else {
            await achievementRepo.updateUserAchievement(userAchievement.id, {
                progress: achievement.targetValue,
                isUnlocked: true,
                unlockedAt: new Date(),
            })
        }

        // Grant rewards
        if (achievement.tokenReward > 0) {
            await addTokensToUser(user.id, achievement.tokenReward, `Achievement: ${achievement.name}`, 'ACHIEVEMENT_REWARD')
        }
        if (achievement.xpReward > 0) {
            await addXPToUser(user.id, achievement.xpReward)
        }

        return {
            success: true,
            message: `Achievement unlocked: ${achievement.name}!`,
            rewards: { tokens: achievement.tokenReward, xp: achievement.xpReward },
        }
    },

    /**
     * Update achievement progress
     */
    updateProgress: async (clerkId: string, achievementId: string, amount: number = 1): Promise<AchievementActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, error: 'User not found' }

        const achievement = await achievementRepo.findByIdOrSlug(achievementId)
        if (!achievement) return { success: false, error: 'Achievement not found' }

        let userAchievement = await achievementRepo.findUserAchievement(user.id, achievement.id)

        if (!userAchievement) {
            const progress = Math.min(amount, achievement.targetValue)
            const isNowUnlocked = progress >= achievement.targetValue

            userAchievement = await achievementRepo.createUserAchievement(user.id, achievement.id, {
                progress,
                isUnlocked: isNowUnlocked,
                unlockedAt: isNowUnlocked ? new Date() : null,
            })

            if (isNowUnlocked) {
                if (achievement.tokenReward > 0) {
                    await addTokensToUser(user.id, achievement.tokenReward, `Achievement: ${achievement.name}`, 'ACHIEVEMENT_REWARD')
                }
                if (achievement.xpReward > 0) {
                    await addXPToUser(user.id, achievement.xpReward)
                }
            }
        } else if (!userAchievement.isUnlocked) {
            const newProgress = Math.min(userAchievement.progress + amount, achievement.targetValue)
            const isNowUnlocked = newProgress >= achievement.targetValue

            userAchievement = await achievementRepo.updateUserAchievement(userAchievement.id, {
                progress: newProgress,
                isUnlocked: isNowUnlocked,
                unlockedAt: isNowUnlocked ? new Date() : null,
            })

            if (isNowUnlocked) {
                if (achievement.tokenReward > 0) {
                    await addTokensToUser(user.id, achievement.tokenReward, `Achievement: ${achievement.name}`, 'ACHIEVEMENT_REWARD')
                }
                if (achievement.xpReward > 0) {
                    await addXPToUser(user.id, achievement.xpReward)
                }
            }
        }

        return {
            success: true,
            progress: userAchievement.progress,
            target: achievement.targetValue,
            unlocked: userAchievement.isUnlocked,
        }
    },
}
