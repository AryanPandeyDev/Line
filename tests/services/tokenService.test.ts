/**
 * ============================================================================
 * TOKEN SERVICE UNIT TESTS
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    tokenRepo: {
        getTokenDataBundle: vi.fn(),
        getEarningsAggregates: vi.fn(),
        isWalletConnected: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
    claimDailyStreak: vi.fn(),
    addTokensToUser: vi.fn(),
    db: {
        user: {
            findUnique: vi.fn(),
        },
    },
}))

vi.mock('@/src/lib/repositories/tokenRepo', () => ({ tokenRepo: mocks.tokenRepo }))
vi.mock('@/lib/db-helpers', () => ({
    getUserByClerkId: mocks.getUserByClerkId,
    claimDailyStreak: mocks.claimDailyStreak,
    addTokensToUser: mocks.addTokensToUser,
}))
vi.mock('@/lib/db', () => ({ db: mocks.db }))

import { tokenService } from '@/src/lib/services/tokenService'

function createMockUser(overrides = {}) {
    return {
        id: 'user-123',
        tokenBalance: 1000,
        totalEarned: 5000,
        ...overrides,
    }
}

function createMockDataBundle(overrides = {}) {
    return {
        transactions: [],
        streak: null,
        walletConnected: true,
        streakRewards: [
            { day: 1, reward: 50 },
            { day: 2, reward: 75 },
        ],
        ...overrides,
    }
}

describe('tokenService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => vi.useRealTimers())

    describe('getTokenInfo', () => {
        it('returns null when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await tokenService.getTokenInfo('clerk-123')
            expect(result).toBeNull()
        })

        it('returns token info with all fields', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.getTokenDataBundle.mockResolvedValue(createMockDataBundle())
            mocks.tokenRepo.getEarningsAggregates.mockResolvedValue({
                today: 100,
                thisWeek: 500,
                thisMonth: 2000,
            })

            const result = await tokenService.getTokenInfo('clerk-123')

            expect(result).toMatchObject({
                balance: 1000,
                totalEarned: 5000,
                walletConnected: true,
                dailyClaimAvailable: true,
                currentStreak: 0,
            })
        })

        it('calculates dailyClaimAvailable correctly', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.getTokenDataBundle.mockResolvedValue(createMockDataBundle({
                streak: { currentStreak: 3, lastClaimDate: new Date('2024-06-15') }, // Same day
            }))
            mocks.tokenRepo.getEarningsAggregates.mockResolvedValue({ today: 0, thisWeek: 0, thisMonth: 0 })

            const result = await tokenService.getTokenInfo('clerk-123')

            expect(result?.dailyClaimAvailable).toBe(false)
        })

        it('formats transaction history correctly', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.getTokenDataBundle.mockResolvedValue(createMockDataBundle({
                transactions: [
                    { type: 'EARN', amount: 100, source: 'Task', createdAt: new Date('2024-06-14') },
                    { type: 'SPEND', amount: 50, source: 'Purchase', createdAt: new Date('2024-06-13') },
                ],
            }))
            mocks.tokenRepo.getEarningsAggregates.mockResolvedValue({ today: 0, thisWeek: 0, thisMonth: 0 })

            const result = await tokenService.getTokenInfo('clerk-123')

            expect(result?.history).toHaveLength(2)
            expect(result?.history[0]).toMatchObject({
                type: 'earn',
                amount: 100,
                source: 'Task',
            })
        })
    })

    describe('claimDailyReward', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await tokenService.claimDailyReward('clerk-123')
            expect(result).toEqual({ success: false, message: 'User not found' })
        })

        it('returns failure when wallet not connected', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.isWalletConnected.mockResolvedValue(false)

            const result = await tokenService.claimDailyReward('clerk-123')

            expect(result).toMatchObject({
                success: false,
                message: 'Wallet must be connected to claim rewards',
                code: 'WALLET_NOT_CONNECTED',
            })
        })

        it('claims reward successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.isWalletConnected.mockResolvedValue(true)
            mocks.claimDailyStreak.mockResolvedValue({ day: 3, reward: 100, currentStreak: 3 })
            mocks.db.user.findUnique.mockResolvedValue({ tokenBalance: 1100 })

            const result = await tokenService.claimDailyReward('clerk-123')

            expect(result).toMatchObject({
                success: true,
                newBalance: 1100,
                currentStreak: 3,
            })
        })

        it('handles claim failure', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.tokenRepo.isWalletConnected.mockResolvedValue(true)
            mocks.claimDailyStreak.mockRejectedValue(new Error('Already claimed'))

            const result = await tokenService.claimDailyReward('clerk-123')

            expect(result).toEqual({ success: false, message: 'Failed to claim daily reward' })
        })
    })

    describe('addTokens', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            const result = await tokenService.addTokens('clerk-123', 100)
            expect(result).toEqual({ success: false, message: 'User not found' })
        })

        it('adds tokens successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.addTokensToUser.mockResolvedValue(undefined)
            mocks.db.user.findUnique.mockResolvedValue({ tokenBalance: 1100 })

            const result = await tokenService.addTokens('clerk-123', 100)

            expect(mocks.addTokensToUser).toHaveBeenCalledWith('user-123', 100, 'Manual Addition', 'EARN')
            expect(result).toMatchObject({
                success: true,
                newBalance: 1100,
                message: 'Successfully added 100 LINE tokens!',
            })
        })
    })
})
