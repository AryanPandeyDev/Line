/**
 * ============================================================================
 * TASK REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma Task and UserTask models.
 * 
 * PRISMA MODELS ACCESSED:
 * - Task (task definitions)
 * - UserTask (user progress)
 * - DailyStreak (for streak data)
 * - StreakReward (for reward config)
 * 
 * FORBIDDEN:
 * - Reward granting (use db-helpers)
 * - Task completion logic
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { Task, UserTask, DailyStreak, StreakReward } from '@/lib/generated/prisma'

export interface TaskDataBundle {
    tasks: Task[]
    userTasks: (UserTask & { task: Task })[]
    streak: DailyStreak | null
    streakRewards: StreakReward[]
}

export const taskRepo = {
    /**
     * Get all task-related data for a user
     */
    getTaskDataBundle: async (userId: string): Promise<TaskDataBundle> => {
        const [tasks, userTasks, streak, streakRewards] = await Promise.all([
            db.task.findMany({
                where: { isActive: true },
                orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
            }),
            db.userTask.findMany({
                where: { userId },
                include: { task: true },
            }),
            db.dailyStreak.findUnique({
                where: { userId },
            }),
            db.streakReward.findMany({
                orderBy: { day: 'asc' },
            }),
        ])

        return { tasks, userTasks, streak, streakRewards }
    },

    /**
     * Find task by ID
     */
    findById: async (id: string): Promise<Task | null> => {
        return db.task.findUnique({
            where: { id },
        })
    },

    /**
     * Find user task
     */
    findUserTask: async (userId: string, taskId: string): Promise<UserTask | null> => {
        return db.userTask.findFirst({
            where: { userId, taskId },
        })
    },

    /**
     * Create user task
     */
    createUserTask: async (userId: string, taskId: string, data: {
        status: 'ACTIVE' | 'COMPLETED' | 'CLAIMED'
        progress: number
        completedAt?: Date
    }): Promise<UserTask> => {
        return db.userTask.create({
            data: {
                userId,
                taskId,
                status: data.status,
                progress: data.progress,
                completedAt: data.completedAt,
            },
        })
    },

    /**
     * Update user task
     */
    updateUserTask: async (id: string, data: {
        status?: 'ACTIVE' | 'COMPLETED' | 'CLAIMED'
        progress?: number
        completedAt?: Date | null
        claimedAt?: Date
    }): Promise<UserTask> => {
        return db.userTask.update({
            where: { id },
            data,
        })
    },

    /**
     * Check if wallet is connected
     */
    isWalletConnected: async (userId: string): Promise<boolean> => {
        const wallet = await db.wallet.findUnique({
            where: { userId },
            select: { isConnected: true },
        })
        return wallet?.isConnected ?? false
    },
}
