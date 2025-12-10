/**
 * ============================================================================
 * ACHIEVEMENT REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma Achievement and UserAchievement models.
 * 
 * PRISMA MODELS ACCESSED:
 * - Achievement (definitions)
 * - UserAchievement (user progress)
 * 
 * FORBIDDEN:
 * - Reward granting
 * - Unlock eligibility logic
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { Achievement, UserAchievement } from '@/lib/generated/prisma'

export interface AchievementDataBundle {
    achievements: Achievement[]
    userAchievements: UserAchievement[]
}

export const achievementRepo = {
    /**
     * Get all achievement data for a user
     */
    getAchievementDataBundle: async (userId: string): Promise<AchievementDataBundle> => {
        const [achievements, userAchievements] = await Promise.all([
            db.achievement.findMany({
                where: { isHidden: false },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            }),
            db.userAchievement.findMany({
                where: { userId },
            }),
        ])

        return { achievements, userAchievements }
    },

    /**
     * Find achievement by ID or slug
     */
    findByIdOrSlug: async (identifier: string): Promise<Achievement | null> => {
        return db.achievement.findFirst({
            where: {
                OR: [{ id: identifier }, { slug: identifier }],
            },
        })
    },

    /**
     * Find user achievement
     */
    findUserAchievement: async (userId: string, achievementId: string): Promise<UserAchievement | null> => {
        return db.userAchievement.findUnique({
            where: {
                userId_achievementId: { userId, achievementId },
            },
        })
    },

    /**
     * Create user achievement
     */
    createUserAchievement: async (userId: string, achievementId: string, data: {
        progress: number
        isUnlocked: boolean
        unlockedAt?: Date | null
    }): Promise<UserAchievement> => {
        return db.userAchievement.create({
            data: {
                userId,
                achievementId,
                progress: data.progress,
                isUnlocked: data.isUnlocked,
                unlockedAt: data.unlockedAt,
            },
        })
    },

    /**
     * Update user achievement
     */
    updateUserAchievement: async (id: string, data: {
        progress?: number
        isUnlocked?: boolean
        unlockedAt?: Date | null
    }): Promise<UserAchievement> => {
        return db.userAchievement.update({
            where: { id },
            data,
        })
    },
}
