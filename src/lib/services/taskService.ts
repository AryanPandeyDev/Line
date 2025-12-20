/**
 * ============================================================================
 * TASK SERVICE
 * ============================================================================
 * 
 * Business logic for task operations.
 * 
 * DOMAIN SCOPE:
 * - Task list retrieval
 * - Task completion and claiming
 * - Progress tracking
 * 
 * ALLOWED:
 * - Call taskRepo
 * - Use db-helpers for rewards
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { taskRepo } from '@/src/lib/repositories/taskRepo'
import { getUserByClerkId, addTokensToUser, addXPToUser } from '@/lib/db-helpers'

// Default streak rewards (7-day cycle)
const DEFAULT_STREAK_REWARDS = [
    { day: 1, reward: 1 },
    { day: 2, reward: 2 },
    { day: 3, reward: 3 },
    { day: 4, reward: 4 },
    { day: 5, reward: 5 },
    { day: 6, reward: 6 },
    { day: 7, reward: 10 },
]

export interface TasksResponse {
    tasks: Array<{
        id: string
        slug: string
        name: string
        description: string
        type: string
        icon: string
        reward: number
        xpReward: number
        externalUrl: string | null
        status: string
        progress: number
        targetProgress: number
    }>
    summary: {
        total: number
        completed: number
        claimedToday: number
    }
    streak: {
        current: number
        rewards: Array<{
            day: number
            reward: number
            claimed: boolean
        }>
    }
}

export interface TaskActionResult {
    success: boolean
    message: string
    taskId?: string
    reward?: number
    progress?: number
    target?: number
}

export const taskService = {
    /**
     * Get all tasks with user progress
     */
    getTasks: async (clerkId: string): Promise<TasksResponse | null> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return null

        const { tasks: allTasks, userTasks, streak, streakRewards } = await taskRepo.getTaskDataBundle(user.id)

        // Map user task progress
        const userTaskMap = new Map(userTasks.map((ut) => [ut.taskId, ut]))

        // Format all tasks
        const tasks = allTasks.map((t) => {
            const userTask = userTaskMap.get(t.id)
            return {
                id: t.id,
                slug: t.slug,
                name: t.name,
                description: t.description,
                type: t.type,
                icon: t.icon || '',
                reward: t.reward,
                xpReward: t.xpReward,
                externalUrl: t.externalUrl,
                status: userTask?.status || 'ACTIVE',
                progress: userTask?.progress || 0,
                targetProgress: t.targetProgress,
            }
        })

        // Calculate summary stats
        const completedCount = userTasks.filter(
            (ut) => ut.status === 'COMPLETED' || ut.status === 'CLAIMED'
        ).length
        const claimedTodayCount = userTasks.filter(
            (ut) => ut.status === 'CLAIMED' && ut.claimedAt &&
                new Date(ut.claimedAt).toDateString() === new Date().toDateString()
        ).length

        // Format streak data
        const currentStreak = streak?.currentStreak || 0
        const claimedDays = streak?.claimedDays || []

        const rewards = streakRewards.length > 0
            ? streakRewards.map((sr) => ({
                day: sr.day,
                reward: sr.reward,
                claimed: claimedDays.includes(sr.day),
            }))
            : DEFAULT_STREAK_REWARDS.map((sr) => ({
                ...sr,
                claimed: claimedDays.includes(sr.day),
            }))

        return {
            tasks,
            summary: {
                total: allTasks.length,
                completed: completedCount,
                claimedToday: claimedTodayCount,
            },
            streak: { current: currentStreak, rewards },
        }
    },

    /**
     * Complete a task
     */
    completeTask: async (clerkId: string, taskId: string): Promise<TaskActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        const task = await taskRepo.findById(taskId)
        if (!task) return { success: false, message: 'Task not found' }

        let userTask = await taskRepo.findUserTask(user.id, taskId)

        if (!userTask) {
            await taskRepo.createUserTask(user.id, taskId, {
                status: 'COMPLETED',
                progress: task.targetProgress,
                completedAt: new Date(),
            })
        } else if (userTask.status === 'ACTIVE') {
            await taskRepo.updateUserTask(userTask.id, {
                status: 'COMPLETED',
                progress: task.targetProgress,
                completedAt: new Date(),
            })
        }

        return { success: true, message: 'Task completed!', taskId }
    },

    /**
     * Claim task reward
     */
    claimTaskReward: async (clerkId: string, taskId: string): Promise<TaskActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        // Check wallet connection
        const isConnected = await taskRepo.isWalletConnected(user.id)
        if (!isConnected) {
            return { success: false, message: 'Wallet must be connected to claim task rewards' }
        }

        const task = await taskRepo.findById(taskId)
        if (!task) return { success: false, message: 'Task not found' }

        const userTask = await taskRepo.findUserTask(user.id, taskId)
        if (!userTask || userTask.status !== 'COMPLETED') {
            return { success: false, message: 'Task must be completed before claiming' }
        }

        // Update task status
        await taskRepo.updateUserTask(userTask.id, {
            status: 'CLAIMED',
            claimedAt: new Date(),
        })

        // Add rewards
        await addTokensToUser(user.id, task.reward, `Task: ${task.name}`, 'EARN')
        if (task.xpReward > 0) {
            await addXPToUser(user.id, task.xpReward)
        }

        return {
            success: true,
            message: `Claimed ${task.reward} LINE tokens!`,
            taskId,
            reward: task.reward,
        }
    },

    /**
     * Update task progress
     */
    updateProgress: async (clerkId: string, taskId: string, amount: number = 1): Promise<TaskActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        const task = await taskRepo.findById(taskId)
        if (!task) return { success: false, message: 'Task not found' }

        let userTask = await taskRepo.findUserTask(user.id, taskId)

        if (!userTask) {
            userTask = await taskRepo.createUserTask(user.id, taskId, {
                status: 'ACTIVE',
                progress: Math.min(amount, task.targetProgress),
            })
        } else {
            const newProgress = Math.min(userTask.progress + amount, task.targetProgress)
            const isComplete = newProgress >= task.targetProgress

            userTask = await taskRepo.updateUserTask(userTask.id, {
                progress: newProgress,
                status: isComplete ? 'COMPLETED' : 'ACTIVE',
                completedAt: isComplete ? new Date() : null,
            })
        }

        return {
            success: true,
            message: 'Progress updated!',
            taskId,
            progress: userTask.progress,
            target: task.targetProgress,
        }
    },
}
