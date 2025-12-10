/**
 * ============================================================================
 * USER SERVICE UNIT TESTS
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    userRepo: {
        findByClerkIdWithStats: vi.fn(),
        findByUsername: vi.fn(),
        create: vi.fn(),
        createAssociatedRecords: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
    generateReferralCode: vi.fn(() => 'LINE-TEST1234'),
    generateRandomUsername: vi.fn(() => 'user_123456'),
}))

vi.mock('@/src/lib/repositories/userRepo', () => ({ userRepo: mocks.userRepo }))
vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
    generateReferralCode: mocks.generateReferralCode,
    generateRandomUsername: mocks.generateRandomUsername,
}))

import { userService } from '@/src/lib/services/userService'

const mockClerkUserData = {
    emailAddress: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    username: 'testuser',
    imageUrl: 'https://example.com/avatar.jpg',
}

function createMockUser(overrides = {}) {
    return {
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: '/avatar.jpg',
        level: 5,
        xp: 500,
        xpToNextLevel: 1000,
        tokenBalance: 2000,
        bonusPoints: 100,
        referralCode: 'LINE-ABCD1234',
        createdAt: new Date('2024-01-01'),
        ...overrides,
    }
}

describe('userService', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('getUserProfile', () => {
        it('returns null when user not found', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue(null)
            const result = await userService.getUserProfile('clerk-123', mockClerkUserData)
            expect(result).toBeNull()
        })

        it('returns formatted profile with aggregated stats', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue({
                user: createMockUser(),
                totalPlayTimeSeconds: 3600,
                totalReferrals: 5,
            })

            const result = await userService.getUserProfile('clerk-123', mockClerkUserData)

            expect(result).toMatchObject({
                id: 'user-123',
                username: 'testuser',
                level: 5,
                totalPlayTimeSeconds: 3600,
                totalPlayTimeHours: 1,
                totalReferrals: 5,
            })
        })

        it('uses Clerk fallbacks for displayName and avatar', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue({
                user: createMockUser({ displayName: null, avatarUrl: null }),
                totalPlayTimeSeconds: 0,
                totalReferrals: 0,
            })

            const result = await userService.getUserProfile('clerk-123', mockClerkUserData)

            expect(result?.displayName).toBe('Test')
            expect(result?.avatarUrl).toBe('https://example.com/avatar.jpg')
        })

        it('calculates totalPlayTimeHours correctly', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue({
                user: createMockUser(),
                totalPlayTimeSeconds: 5400, // 1.5 hours
                totalReferrals: 0,
            })

            const result = await userService.getUserProfile('clerk-123', mockClerkUserData)

            expect(result?.totalPlayTimeHours).toBe(1.5)
        })
    })

    describe('getOrCreateUserProfile', () => {
        it('returns existing profile if found', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue({
                user: createMockUser(),
                totalPlayTimeSeconds: 0,
                totalReferrals: 0,
            })

            const result = await userService.getOrCreateUserProfile('clerk-123', mockClerkUserData)

            expect(result.username).toBe('testuser')
            expect(mocks.userRepo.create).not.toHaveBeenCalled()
        })

        it('creates user if not found and returns profile', async () => {
            mocks.userRepo.findByClerkIdWithStats
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    user: createMockUser(),
                    totalPlayTimeSeconds: 0,
                    totalReferrals: 0,
                })
            mocks.userRepo.findByUsername.mockResolvedValue(null)
            mocks.userRepo.create.mockResolvedValue(createMockUser())
            mocks.userRepo.createAssociatedRecords.mockResolvedValue(undefined)

            const result = await userService.getOrCreateUserProfile('clerk-123', mockClerkUserData)

            expect(mocks.userRepo.create).toHaveBeenCalled()
            expect(result.username).toBe('testuser')
        })

        it('throws if user creation fails', async () => {
            mocks.userRepo.findByClerkIdWithStats.mockResolvedValue(null)
            mocks.userRepo.findByUsername.mockResolvedValue(null)
            mocks.userRepo.create.mockResolvedValue(createMockUser())
            mocks.userRepo.createAssociatedRecords.mockResolvedValue(undefined)

            await expect(userService.getOrCreateUserProfile('clerk-123', mockClerkUserData))
                .rejects.toThrow('Failed to create user profile')
        })
    })

    describe('createUser', () => {
        it('creates user with provided username', async () => {
            mocks.userRepo.create.mockResolvedValue({ id: 'new-user' })
            mocks.userRepo.createAssociatedRecords.mockResolvedValue(undefined)

            await userService.createUser({
                clerkId: 'clerk-123',
                email: 'test@example.com',
                username: 'myuser',
            })

            expect(mocks.userRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    username: 'myuser',
                    tokenBalance: 500,
                    totalEarned: 500,
                })
            )
        })

        it('generates username if not provided', async () => {
            mocks.userRepo.findByUsername.mockResolvedValue(null)
            mocks.userRepo.create.mockResolvedValue({ id: 'new-user' })
            mocks.userRepo.createAssociatedRecords.mockResolvedValue(undefined)

            await userService.createUser({
                clerkId: 'clerk-123',
                email: 'test@example.com',
            })

            expect(mocks.generateRandomUsername).toHaveBeenCalled()
            expect(mocks.userRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ username: 'user_123456' })
            )
        })

        it('creates associated records with welcome bonus', async () => {
            mocks.userRepo.create.mockResolvedValue({ id: 'new-user' })
            mocks.userRepo.createAssociatedRecords.mockResolvedValue(undefined)

            await userService.createUser({
                clerkId: 'clerk-123',
                email: 'test@example.com',
                username: 'myuser',
            })

            expect(mocks.userRepo.createAssociatedRecords).toHaveBeenCalledWith('new-user', 500)
        })
    })
})
