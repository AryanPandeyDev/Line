/**
 * ============================================================================
 * TASK TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for tasks and progress tracking.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Task types
 */
export type TaskType =
    | 'DAILY'
    | 'EXTERNAL'
    | 'ACHIEVEMENT'
    | 'ONBOARDING'

/**
 * User task status
 */
export type TaskStatus =
    | 'AVAILABLE'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'EXPIRED'
    | 'CLAIMED'

/**
 * Task definition
 */
export interface Task {
    id: string
    name: string
    description: string
    type: TaskType
    reward: number
    xpReward: number
    targetProgress: number
    isRepeatable: boolean
    isActive: boolean
    externalUrl: string | null
}

/**
 * User's progress on a task
 */
export interface UserTask {
    id: string
    taskId: string
    userId: string
    progress: number
    status: TaskStatus
    startedAt: Date
    completedAt: Date | null
    claimedAt: Date | null
    expiresAt: Date | null
}

/**
 * Task with user progress for display
 */
export interface TaskWithProgress extends Task {
    userProgress: UserTask | null
    percentComplete: number
    canClaim: boolean
}

/**
 * Result of claiming a task reward
 */
export interface TaskClaimResult {
    success: boolean
    tokensEarned: number
    xpEarned: number
}

/**
 * Tasks list response
 */
export interface TasksResponse {
    daily: TaskWithProgress[]
    external: TaskWithProgress[]
    onboarding: TaskWithProgress[]
    dailyResetAt: string | null
}
