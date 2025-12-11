/**
 * ============================================================================
 * TASK SERVICE UNIT TESTS
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    taskRepo: {
        getTaskDataBundle: vi.fn(),
        findById: vi.fn(),
        findUserTask: vi.fn(),
        createUserTask: vi.fn(),
        updateUserTask: vi.fn(),
        isWalletConnected: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
    addTokensToUser: vi.fn(),
    addXPToUser: vi.fn(),
}))

vi.mock('@/src/lib/repositories/taskRepo', () => ({ taskRepo: mocks.taskRepo }))
vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
    addTokensToUser: mocks.addTokensToUser,
    addXPToUser: mocks.addXPToUser,
}))

import { taskService } from '@/src/lib/services/taskService'

function createMockUser() {
    return { id: 'user-123', tokenBalance: 1000 }
}

function createMockTask(overrides = {}) {
    return {
        id: 'task-1',
        slug: 'test-task',
        name: 'Test Task',
        description: 'Complete the test',
        type: 'DAILY',
        icon: '🎯',
        reward: 3,
        xpReward: 50,
        externalUrl: null,
        targetProgress: 1,
        isActive: true,
        ...overrides,
    }
}

function createMockUserTask(overrides = {}) {
    return {
        id: 'ut-1',
        userId: 'user-123',
        taskId: 'task-1',
        status: 'ACTIVE',
        progress: 0,
        completedAt: null,
        claimedAt: null,
        ...overrides,
    }
}

describe('taskService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => vi.useRealTimers())

    describe('getTasks', () => {
        it('returns null when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await taskService.getTasks('clerk-123')
            expect(result).toBeNull()
        })

        it('returns all tasks with user progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.getTaskDataBundle.mockResolvedValue({
                tasks: [createMockTask()],
                userTasks: [],
                streak: null,
                streakRewards: [],
            })

            const result = await taskService.getTasks('clerk-123')

            expect(result?.tasks).toHaveLength(1)
            expect(result?.tasks[0]).toMatchObject({
                id: 'task-1',
                name: 'Test Task',
                status: 'ACTIVE',
                progress: 0,
            })
        })

        it('merges user task progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.getTaskDataBundle.mockResolvedValue({
                tasks: [createMockTask()],
                userTasks: [{ ...createMockUserTask({ status: 'COMPLETED', progress: 1 }), task: createMockTask() }],
                streak: null,
                streakRewards: [],
            })

            const result = await taskService.getTasks('clerk-123')

            expect(result?.tasks[0].status).toBe('COMPLETED')
            expect(result?.tasks[0].progress).toBe(1)
        })

        it('calculates summary correctly', async () => {
            const today = new Date()
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.getTaskDataBundle.mockResolvedValue({
                tasks: [createMockTask(), createMockTask({ id: 'task-2' }), createMockTask({ id: 'task-3' })],
                userTasks: [
                    { ...createMockUserTask({ status: 'COMPLETED' }), task: createMockTask() },
                    { ...createMockUserTask({ id: 'ut-2', taskId: 'task-2', status: 'CLAIMED', claimedAt: today }), task: createMockTask({ id: 'task-2' }) },
                ],
                streak: null,
                streakRewards: [],
            })

            const result = await taskService.getTasks('clerk-123')

            expect(result?.summary).toEqual({
                total: 3,
                completed: 2,
                claimedToday: 1,
            })
        })

        it('uses default streak rewards when none in database', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.getTaskDataBundle.mockResolvedValue({
                tasks: [],
                userTasks: [],
                streak: null,
                streakRewards: [],
            })

            const result = await taskService.getTasks('clerk-123')

            expect(result?.streak.rewards).toHaveLength(7)
            expect(result?.streak.rewards[0]).toEqual({ day: 1, reward: 1, claimed: false })
        })
    })

    describe('completeTask', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await taskService.completeTask('clerk-123', 'task-1')
            expect(result).toEqual({ success: false, message: 'User not found' })
        })

        it('returns failure when task not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(null)

            const result = await taskService.completeTask('clerk-123', 'invalid-task')

            expect(result).toEqual({ success: false, message: 'Task not found' })
        })

        it('creates user task if not exists', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(createMockTask())
            mocks.taskRepo.findUserTask.mockResolvedValue(null)
            mocks.taskRepo.createUserTask.mockResolvedValue(createMockUserTask({ status: 'COMPLETED' }))

            const result = await taskService.completeTask('clerk-123', 'task-1')

            expect(mocks.taskRepo.createUserTask).toHaveBeenCalledWith('user-123', 'task-1', {
                status: 'COMPLETED',
                progress: 1,
                completedAt: expect.any(Date),
            })
            expect(result.success).toBe(true)
        })

        it('updates existing user task', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(createMockTask())
            mocks.taskRepo.findUserTask.mockResolvedValue(createMockUserTask())
            mocks.taskRepo.updateUserTask.mockResolvedValue(createMockUserTask({ status: 'COMPLETED' }))

            await taskService.completeTask('clerk-123', 'task-1')

            expect(mocks.taskRepo.updateUserTask).toHaveBeenCalled()
        })
    })

    describe('claimTaskReward', () => {
        it('returns failure when wallet not connected', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.isWalletConnected.mockResolvedValue(false)

            const result = await taskService.claimTaskReward('clerk-123', 'task-1')

            expect(result).toEqual({ success: false, message: 'Wallet must be connected to claim task rewards' })
        })

        it('returns failure when task not completed', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.isWalletConnected.mockResolvedValue(true)
            mocks.taskRepo.findById.mockResolvedValue(createMockTask())
            mocks.taskRepo.findUserTask.mockResolvedValue(createMockUserTask({ status: 'ACTIVE' }))

            const result = await taskService.claimTaskReward('clerk-123', 'task-1')

            expect(result).toEqual({ success: false, message: 'Task must be completed before claiming' })
        })

        it('grants rewards on successful claim', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.isWalletConnected.mockResolvedValue(true)
            mocks.taskRepo.findById.mockResolvedValue(createMockTask())
            mocks.taskRepo.findUserTask.mockResolvedValue(createMockUserTask({ status: 'COMPLETED' }))
            mocks.taskRepo.updateUserTask.mockResolvedValue(createMockUserTask({ status: 'CLAIMED' }))

            const result = await taskService.claimTaskReward('clerk-123', 'task-1')

            expect(mocks.addTokensToUser).toHaveBeenCalledWith('user-123', 3, 'Task: Test Task', 'EARN')
            expect(mocks.addXPToUser).toHaveBeenCalledWith('user-123', 50)
            expect(result).toMatchObject({ success: true, reward: 3 })
        })
    })

    describe('updateProgress', () => {
        it('creates user task with initial progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(createMockTask({ targetProgress: 5 }))
            mocks.taskRepo.findUserTask.mockResolvedValue(null)
            mocks.taskRepo.createUserTask.mockResolvedValue(createMockUserTask({ progress: 1 }))

            const result = await taskService.updateProgress('clerk-123', 'task-1')

            expect(mocks.taskRepo.createUserTask).toHaveBeenCalledWith('user-123', 'task-1', {
                status: 'ACTIVE',
                progress: 1,
            })
            expect(result).toMatchObject({ success: true, progress: 1, target: 5 })
        })

        it('updates existing progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(createMockTask({ targetProgress: 5 }))
            mocks.taskRepo.findUserTask.mockResolvedValue(createMockUserTask({ progress: 2 }))
            mocks.taskRepo.updateUserTask.mockResolvedValue(createMockUserTask({ progress: 3 }))

            const result = await taskService.updateProgress('clerk-123', 'task-1')

            expect(result.progress).toBe(3)
        })

        it('completes task when target reached', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.taskRepo.findById.mockResolvedValue(createMockTask({ targetProgress: 3 }))
            mocks.taskRepo.findUserTask.mockResolvedValue(createMockUserTask({ progress: 2 }))
            mocks.taskRepo.updateUserTask.mockResolvedValue(createMockUserTask({ progress: 3, status: 'COMPLETED' }))

            await taskService.updateProgress('clerk-123', 'task-1')

            expect(mocks.taskRepo.updateUserTask).toHaveBeenCalledWith('ut-1', expect.objectContaining({
                progress: 3,
                status: 'COMPLETED',
            }))
        })
    })
})
