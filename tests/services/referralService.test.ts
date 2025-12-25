/**
 * ============================================================================
 * REFERRAL SERVICE UNIT TESTS
 * ============================================================================
 * 
 * Comprehensive tests for referralService business logic.
 * All repository dependencies are mocked.
 * 
 * FUNCTIONS TESTED:
 * - getReferralInfo
 * - applyReferralCode
 * 
 * MOCKING STRATEGY:
 * - Mock referralRepo for all Prisma operations
 * - Mock getUserByClerkId for user lookup
 * - Use deterministic test data
 * 
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// MOCK SETUP - Use vi.hoisted to avoid hoisting issues
// ============================================================================

const mocks = vi.hoisted(() => ({
    referralRepo: {
        getOrCreateStats: vi.fn(),
        findAllTiers: vi.fn(),
        findReferredUsers: vi.fn(),
        findUserByReferralCode: vi.fn(),
        applyReferral: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
}))

vi.mock('@/src/lib/repositories/referralRepo', () => ({
    referralRepo: mocks.referralRepo,
}))

vi.mock('@/src/lib/repositories/userRepo', () => ({
    userRepo: {},
}))

vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
}))

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockUser(overrides = {}) {
    return {
        id: 'user-123',
        clerkId: 'clerk-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        tokenBalance: 1000,
        referralCode: 'LINE-ABCD1234',
        referredById: null,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date(),
        ...overrides,
    }
}

function createMockReferralStats(overrides = {}) {
    return {
        id: 'stats-123',
        userId: 'user-123',
        totalReferrals: 10,
        activeReferrals: 5,
        totalEarned: 2000,
        currentTier: 1,
        commissionRate: 0.05,
        ...overrides,
    }
}

function createMockReferralTier(tier: number, overrides = {}) {
    const defaults: Record<number, { requiredReferrals: number; reward: number; commissionRate: number }> = {
        1: { requiredReferrals: 5, reward: 10, commissionRate: 0.05 },
        2: { requiredReferrals: 15, reward: 25, commissionRate: 0.07 },
        3: { requiredReferrals: 50, reward: 50, commissionRate: 0.10 },
        4: { requiredReferrals: 100, reward: 100, commissionRate: 0.15 },
    }
    return {
        id: `tier-${tier}`,
        tier,
        requiredReferrals: defaults[tier]?.requiredReferrals ?? 0,
        reward: defaults[tier]?.reward ?? 0,
        commissionRate: defaults[tier]?.commissionRate ?? 0.05,
        bonus: null,
        ...overrides,
    }
}

function createMockReferredUser(overrides = {}) {
    return {
        id: 'referred-user-1',
        displayName: 'Referred User',
        username: 'referreduser',
        createdAt: new Date('2024-06-01'),
        lastLoginAt: new Date(), // Active (within 7 days)
        ...overrides,
    }
}

// ============================================================================
// IMPORT SERVICE AFTER MOCKS
// ============================================================================

import { referralService } from '@/src/lib/services/referralService'

// ============================================================================
// TESTS
// ============================================================================

describe('referralService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // ==========================================================================
    // getReferralInfo
    // ==========================================================================

    describe('getReferralInfo', () => {
        it('returns null when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)

            const result = await referralService.getReferralInfo('nonexistent-clerk-id')

            expect(result).toBeNull()
            expect(mocks.getUserByClerkId).toHaveBeenCalledWith('nonexistent-clerk-id')
        })

        it('calls getOrCreateStats with user id', async () => {
            const user = createMockUser()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            await referralService.getReferralInfo('clerk-123')

            expect(mocks.referralRepo.getOrCreateStats).toHaveBeenCalledWith('user-123')
        })

        it('loads tiers from database', async () => {
            const user = createMockUser()
            const tiers = [createMockReferralTier(1), createMockReferralTier(2)]
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue(tiers)
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(mocks.referralRepo.findAllTiers).toHaveBeenCalled()
            expect(result?.tiers).toHaveLength(2)
            expect(result?.tiers[0].tier).toBe(1)
        })

        it('uses default tiers when database has none', async () => {
            const user = createMockUser()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.tiers).toHaveLength(4)
            expect(result?.tiers[0]).toEqual({
                tier: 1,
                referrals: 5,
                reward: 10,  // Matches DEFAULT_TIERS in implementation
                bonus: '5% commission',
                unlocked: true,
            })
        })

        it('marks tiers as unlocked based on total referrals', async () => {
            const user = createMockUser()
            const stats = createMockReferralStats({ totalReferrals: 20 })
            const tiers = [
                createMockReferralTier(1, { requiredReferrals: 5 }),
                createMockReferralTier(2, { requiredReferrals: 15 }),
                createMockReferralTier(3, { requiredReferrals: 50 }),
            ]
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(stats)
            mocks.referralRepo.findAllTiers.mockResolvedValue(tiers)
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.tiers[0].unlocked).toBe(true)
            expect(result?.tiers[1].unlocked).toBe(true)
            expect(result?.tiers[2].unlocked).toBe(false)
        })

        it('returns referred users correctly', async () => {
            const user = createMockUser()
            const referredUsers = [
                createMockReferredUser({ id: '1', username: 'user1' }),
                createMockReferredUser({ id: '2', username: 'user2' }),
            ]
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue(referredUsers)

            const result = await referralService.getReferralInfo('clerk-123')

            expect(mocks.referralRepo.findReferredUsers).toHaveBeenCalledWith('user-123')
            expect(result?.referredUsers).toHaveLength(2)
        })

        it('marks referred users as active if logged in within 7 days', async () => {
            const user = createMockUser()
            const activeUser = createMockReferredUser({
                id: '1',
                lastLoginAt: new Date('2024-06-14'),
            })
            const inactiveUser = createMockReferredUser({
                id: '2',
                lastLoginAt: new Date('2024-06-01'),
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([activeUser, inactiveUser])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers[0].status).toBe('active')
            expect(result?.referredUsers[1].status).toBe('inactive')
        })

        it('handles users with null lastLoginAt as inactive', async () => {
            const user = createMockUser()
            const neverLoggedIn = createMockReferredUser({
                id: '1',
                lastLoginAt: null,
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([neverLoggedIn])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers[0].status).toBe('inactive')
        })

        it('returns correct response shape', async () => {
            const user = createMockUser()
            const stats = createMockReferralStats()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(stats)
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result).toEqual({
                code: 'LINE-ABCD1234',
                link: 'https://linegamecenter.com/signup?ref=LINE-ABCD1234',
                stats: {
                    totalReferrals: 10,
                    activeReferrals: 5,
                    totalEarned: 2000,
                    currentTier: 1,
                    commissionRate: 0.05,
                },
                tiers: expect.any(Array),
                referredUsers: [],
            })
        })

        it('uses displayName if available, falls back to username', async () => {
            const user = createMockUser()
            const referredWithDisplayName = createMockReferredUser({
                id: '1',
                displayName: 'Display Name',
                username: 'username1',
            })
            const referredWithoutDisplayName = createMockReferredUser({
                id: '2',
                displayName: null,
                username: 'username2',
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([
                referredWithDisplayName,
                referredWithoutDisplayName,
            ])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers[0].name).toBe('Display Name')
            expect(result?.referredUsers[1].name).toBe('username2')
        })

        it('formats joined date as YYYY-MM-DD', async () => {
            const user = createMockUser()
            const referredUser = createMockReferredUser({
                createdAt: new Date('2024-03-15T14:30:00Z'),
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([referredUser])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers[0].joined).toBe('2024-03-15')
        })

        it('generates tier bonus from commission rate when bonus is null', async () => {
            const user = createMockUser()
            const tier = createMockReferralTier(1, {
                bonus: null,
                commissionRate: 0.07,
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([tier])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.tiers[0].bonus).toBe('7% commission')
        })
    })

    // ==========================================================================
    // applyReferralCode
    // ==========================================================================

    describe('applyReferralCode', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)

            const result = await referralService.applyReferralCode('clerk-123', 'LINE-CODE1234')

            expect(result).toEqual({
                success: false,
                message: 'User not found',
            })
        })

        it('returns failure when user already has a referrer', async () => {
            const user = createMockUser({ referredById: 'existing-referrer' })
            mocks.getUserByClerkId.mockResolvedValue(user)

            const result = await referralService.applyReferralCode('clerk-123', 'LINE-CODE1234')

            expect(result).toEqual({
                success: false,
                message: 'You have already used a referral code',
            })
            expect(mocks.referralRepo.findUserByReferralCode).not.toHaveBeenCalled()
        })

        it('returns failure for invalid referral code', async () => {
            const user = createMockUser()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(null)

            const result = await referralService.applyReferralCode('clerk-123', 'INVALID-CODE')

            expect(result).toEqual({
                success: false,
                message: 'Invalid referral code',
            })
        })

        it('returns failure when trying to use own referral code', async () => {
            const user = createMockUser({ id: 'user-123' })
            const referrer = createMockUser({ id: 'user-123' })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(referrer)

            const result = await referralService.applyReferralCode('clerk-123', 'LINE-MYCODE12')

            expect(result).toEqual({
                success: false,
                message: 'You cannot use your own referral code',
            })
            expect(mocks.referralRepo.applyReferral).not.toHaveBeenCalled()
        })

        it('calls applyReferral with correct arguments on success', async () => {
            const user = createMockUser({ id: 'new-user', username: 'newuser' })
            const referrer = createMockUser({
                id: 'referrer-user',
                tokenBalance: 5000,
                referralCode: 'LINE-REFCODE1',
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(referrer)
            mocks.referralRepo.applyReferral.mockResolvedValue(undefined)

            await referralService.applyReferralCode('clerk-123', 'LINE-REFCODE1')

            expect(mocks.referralRepo.applyReferral).toHaveBeenCalledWith(
                'new-user',
                'referrer-user',
                'newuser',
                5000,
                200
            )
        })

        it('returns success message on successful application', async () => {
            const user = createMockUser({ id: 'new-user' })
            const referrer = createMockUser({ id: 'referrer-user' })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(referrer)
            mocks.referralRepo.applyReferral.mockResolvedValue(undefined)

            const result = await referralService.applyReferralCode('clerk-123', 'LINE-REFCODE1')

            expect(result).toEqual({
                success: true,
                message: 'Referral code applied successfully!',
            })
        })

        it('uses fixed bonus amount of 200', async () => {
            const user = createMockUser({ id: 'new-user' })
            const referrer = createMockUser({ id: 'referrer-user', tokenBalance: 1000 })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(referrer)
            mocks.referralRepo.applyReferral.mockResolvedValue(undefined)

            await referralService.applyReferralCode('clerk-123', 'LINE-REFCODE1')

            expect(mocks.referralRepo.applyReferral).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(String),
                expect.any(Number),
                200
            )
        })
    })

    // ==========================================================================
    // Edge Cases
    // ==========================================================================

    describe('edge cases', () => {
        it('handles empty referred users list', async () => {
            const user = createMockUser()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers).toEqual([])
        })

        it('handles zero referral stats', async () => {
            const user = createMockUser()
            const emptyStats = createMockReferralStats({
                totalReferrals: 0,
                activeReferrals: 0,
                totalEarned: 0,
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(emptyStats)
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.stats.totalReferrals).toBe(0)
            expect(result?.stats.totalEarned).toBe(0)
        })

        it('propagates repository error in getReferralInfo', async () => {
            const user = createMockUser()
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockRejectedValue(new Error('Database error'))

            await expect(referralService.getReferralInfo('clerk-123'))
                .rejects.toThrow('Database error')
        })

        it('propagates repository error in applyReferralCode', async () => {
            const user = createMockUser({ id: 'new-user' })
            const referrer = createMockUser({ id: 'referrer-user' })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.findUserByReferralCode.mockResolvedValue(referrer)
            mocks.referralRepo.applyReferral.mockRejectedValue(new Error('Transaction failed'))

            await expect(referralService.applyReferralCode('clerk-123', 'LINE-CODE1234'))
                .rejects.toThrow('Transaction failed')
        })

        it('handles tier with custom bonus string', async () => {
            const user = createMockUser()
            const tier = createMockReferralTier(4, {
                bonus: 'Special NFT + 20% commission',
            })
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([tier])
            mocks.referralRepo.findReferredUsers.mockResolvedValue([])

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.tiers[0].bonus).toBe('Special NFT + 20% commission')
        })

        it('handles many referred users', async () => {
            const user = createMockUser()
            const manyUsers = Array.from({ length: 20 }, (_, i) =>
                createMockReferredUser({ id: `user-${i}`, username: `user${i}` })
            )
            mocks.getUserByClerkId.mockResolvedValue(user)
            mocks.referralRepo.getOrCreateStats.mockResolvedValue(createMockReferralStats())
            mocks.referralRepo.findAllTiers.mockResolvedValue([])
            mocks.referralRepo.findReferredUsers.mockResolvedValue(manyUsers)

            const result = await referralService.getReferralInfo('clerk-123')

            expect(result?.referredUsers).toHaveLength(20)
        })
    })
})
