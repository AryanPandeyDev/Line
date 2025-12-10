/**
 * ============================================================================
 * ACHIEVEMENT SERVICE UNIT TESTS
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    achievementRepo: {
        getAchievementDataBundle: vi.fn(),
        findByIdOrSlug: vi.fn(),
        findUserAchievement: vi.fn(),
        createUserAchievement: vi.fn(),
        updateUserAchievement: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
    addTokensToUser: vi.fn(),
    addXPToUser: vi.fn(),
}))

vi.mock('@/src/lib/repositories/achievementRepo', () => ({ achievementRepo: mocks.achievementRepo }))
vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
    addTokensToUser: mocks.addTokensToUser,
    addXPToUser: mocks.addXPToUser,
}))

import { achievementService } from '@/src/lib/services/achievementService'

function createMockUser() {
    return { id: 'user-123', tokenBalance: 1000 }
}

function createMockAchievement(overrides = {}) {
    return {
        id: 'ach-1',
        slug: 'first-win',
        name: 'First Win',
        description: 'Win your first game',
        icon: '🏆',
        xpReward: 100,
        tokenReward: 50,
        targetValue: 1,
        ...overrides,
    }
}

function createMockUserAchievement(overrides = {}) {
    return {
        id: 'ua-1',
        userId: 'user-123',
        achievementId: 'ach-1',
        progress: 0,
        isUnlocked: false,
        unlockedAt: null,
        ...overrides,
    }
}

describe('achievementService', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('getAchievements', () => {
        it('returns null when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await achievementService.getAchievements('clerk-123')
            expect(result).toBeNull()
        })

        it('returns all achievements with user progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.getAchievementDataBundle.mockResolvedValue({
                achievements: [createMockAchievement()],
                userAchievements: [],
            })

            const result = await achievementService.getAchievements('clerk-123')

            expect(result?.achievements).toHaveLength(1)
            expect(result?.achievements[0]).toMatchObject({
                id: 'first-win',
                name: 'First Win',
                unlocked: false,
            })
        })

        it('merges user achievement progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.getAchievementDataBundle.mockResolvedValue({
                achievements: [createMockAchievement({ targetValue: 10 })],
                userAchievements: [createMockUserAchievement({ progress: 5 })],
            })

            const result = await achievementService.getAchievements('clerk-123')

            expect(result?.achievements[0].progress).toEqual({ current: 5, target: 10 })
        })

        it('calculates stats correctly', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.getAchievementDataBundle.mockResolvedValue({
                achievements: [
                    createMockAchievement({ xpReward: 100, tokenReward: 50 }),
                    createMockAchievement({ id: 'ach-2', slug: 'ach-2', xpReward: 200, tokenReward: 100 }),
                ],
                userAchievements: [createMockUserAchievement({ isUnlocked: true })],
            })

            const result = await achievementService.getAchievements('clerk-123')

            expect(result?.stats).toEqual({
                total: 2,
                unlocked: 1,
                totalXpEarned: 100,
                totalTokensEarned: 50,
            })
        })
    })

    describe('unlockAchievement', () => {
        it('returns error when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await achievementService.unlockAchievement('clerk-123', 'first-win')
            expect(result).toEqual({ success: false, error: 'User not found' })
        })

        it('returns error when achievement not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(null)

            const result = await achievementService.unlockAchievement('clerk-123', 'invalid')

            expect(result).toEqual({ success: false, error: 'Achievement not found' })
        })

        it('returns error when already unlocked', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement())
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(createMockUserAchievement({ isUnlocked: true }))

            const result = await achievementService.unlockAchievement('clerk-123', 'first-win')

            expect(result).toEqual({ success: false, error: 'Achievement already unlocked' })
        })

        it('creates user achievement and grants rewards', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement())
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(null)
            mocks.achievementRepo.createUserAchievement.mockResolvedValue(createMockUserAchievement({ isUnlocked: true }))

            const result = await achievementService.unlockAchievement('clerk-123', 'first-win')

            expect(mocks.addTokensToUser).toHaveBeenCalledWith('user-123', 50, 'Achievement: First Win', 'ACHIEVEMENT_REWARD')
            expect(mocks.addXPToUser).toHaveBeenCalledWith('user-123', 100)
            expect(result).toMatchObject({
                success: true,
                rewards: { tokens: 50, xp: 100 },
            })
        })

        it('updates existing user achievement', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement())
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(createMockUserAchievement())
            mocks.achievementRepo.updateUserAchievement.mockResolvedValue(createMockUserAchievement({ isUnlocked: true }))

            await achievementService.unlockAchievement('clerk-123', 'first-win')

            expect(mocks.achievementRepo.updateUserAchievement).toHaveBeenCalled()
        })
    })

    describe('updateProgress', () => {
        it('creates user achievement with initial progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement({ targetValue: 10 }))
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(null)
            mocks.achievementRepo.createUserAchievement.mockResolvedValue(createMockUserAchievement({ progress: 1 }))

            const result = await achievementService.updateProgress('clerk-123', 'first-win')

            expect(mocks.achievementRepo.createUserAchievement).toHaveBeenCalledWith('user-123', 'ach-1', {
                progress: 1,
                isUnlocked: false,
                unlockedAt: null,
            })
            expect(result).toMatchObject({ success: true, progress: 1, target: 10 })
        })

        it('unlocks and grants rewards when target reached', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement({ targetValue: 1 }))
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(null)
            mocks.achievementRepo.createUserAchievement.mockResolvedValue(createMockUserAchievement({ progress: 1, isUnlocked: true }))

            const result = await achievementService.updateProgress('clerk-123', 'first-win')

            expect(mocks.addTokensToUser).toHaveBeenCalled()
            expect(mocks.addXPToUser).toHaveBeenCalled()
            expect(result.unlocked).toBe(true)
        })

        it('updates existing progress', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement({ targetValue: 10 }))
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(createMockUserAchievement({ progress: 5 }))
            mocks.achievementRepo.updateUserAchievement.mockResolvedValue(createMockUserAchievement({ progress: 6 }))

            const result = await achievementService.updateProgress('clerk-123', 'first-win')

            expect(result.progress).toBe(6)
        })

        it('does not update already unlocked achievements', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.achievementRepo.findByIdOrSlug.mockResolvedValue(createMockAchievement())
            mocks.achievementRepo.findUserAchievement.mockResolvedValue(createMockUserAchievement({ isUnlocked: true, progress: 1 }))

            const result = await achievementService.updateProgress('clerk-123', 'first-win')

            expect(mocks.achievementRepo.updateUserAchievement).not.toHaveBeenCalled()
            expect(result.unlocked).toBe(true)
        })
    })
})
