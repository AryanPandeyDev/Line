/**
 * ============================================================================
 * TEST MOCKS SETUP
 * ============================================================================
 * 
 * This file sets up global mocks for testing the backend architecture.
 * It is loaded automatically before every test via vitest.config.ts setupFiles.
 * 
 * MOCKING STRATEGY:
 * 
 * 1. REPOSITORY TESTS:
 *    - Mock the Prisma client (db) to return controlled data
 *    - Test that queries are called with correct parameters
 *    - No real database connections
 * 
 * 2. SERVICE TESTS:
 *    - Mock repository functions using vi.mock or vi.spyOn
 *    - Test business logic in isolation
 *    - Verify service orchestrates repos correctly
 * 
 * 3. HELPER TESTS:
 *    - No mocks needed (pure functions)
 *    - Test input → output directly
 * 
 * ============================================================================
 */

import { vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// PRISMA CLIENT MOCK
// ============================================================================
// 
// Mock the Prisma client for repository tests.
// Each test can override specific methods as needed.
// 
// Usage in tests:
//   import { mockPrisma } from '../setup/mocks'
//   mockPrisma.user.findUnique.mockResolvedValue({ id: '1', ... })
// 

export const mockPrisma = {
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    referralStats: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    referralTier: {
        findMany: vi.fn(),
    },
    game: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    userGameProgress: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
    },
    tokenTransaction: {
        findMany: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
    },
    task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    userTask: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    achievement: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
    },
    userAchievement: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    nFT: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    nFTListing: {
        findMany: vi.fn(),
    },
    nFTBid: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    wallet: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    dailyStreak: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    streakReward: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    userNFT: {
        count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
}

// Mock the db import used by repositories
vi.mock('@/lib/db', () => ({
    db: mockPrisma,
}))

// ============================================================================
// REPOSITORY MOCK HELPERS
// ============================================================================
// 
// Helper functions to create repository mocks for service tests.
// 
// Usage in service tests:
//   vi.mock('@/src/lib/repositories/userRepo', () => ({
//     userRepo: {
//       findByClerkId: vi.fn().mockResolvedValue({ id: '1', username: 'test' }),
//     },
//   }))
// 

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
    return {
        id: 'user-1',
        clerkId: 'clerk-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        tokenBalance: 500,
        bonusPoints: 0,
        totalEarned: 500,
        referralCode: 'TEST-CODE',
        referredById: null,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date(),
        ...overrides,
    }
}

/**
 * Create mock referral stats for testing
 */
export function createMockReferralStats(overrides = {}) {
    return {
        id: 'stats-1',
        userId: 'user-1',
        totalReferrals: 5,
        activeReferrals: 3,
        totalEarned: 1000,
        currentTier: 1,
        commissionRate: 0.05,
        ...overrides,
    }
}

/**
 * Create mock game for testing
 */
export function createMockGame(overrides = {}) {
    return {
        id: 'game-1',
        slug: 'test-game',
        name: 'Test Game',
        description: 'A test game',
        coverImage: '/images/test.png',
        category: 'ACTION',
        playerCount: 1000,
        rating: 4.5,
        rewardMin: 10,
        rewardMax: 100,
        status: 'ACTIVE',
        releaseDate: new Date('2024-01-01'),
        ...overrides,
    }
}

// ============================================================================
// TEST LIFECYCLE HOOKS
// ============================================================================

beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
})

afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks()
})

// ============================================================================
// FUTURE TESTING PATTERNS
// ============================================================================
// 
// TESTING REPOSITORIES:
// 
// ```typescript
// import { describe, it, expect } from 'vitest'
// import { mockPrisma } from '../setup/mocks'
// import { userRepo } from '@/src/lib/repositories/userRepo'
// 
// describe('userRepo', () => {
//   it('findByClerkId calls prisma with correct params', async () => {
//     mockPrisma.user.findUnique.mockResolvedValue({ id: '1' })
//     
//     const result = await userRepo.findByClerkId('clerk-123')
//     
//     expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
//       where: { clerkId: 'clerk-123' },
//     })
//     expect(result).toEqual({ id: '1' })
//   })
// })
// ```
// 
// TESTING SERVICES:
// 
// ```typescript
// import { describe, it, expect, vi } from 'vitest'
// import { userService } from '@/src/lib/services/userService'
// 
// vi.mock('@/src/lib/repositories/userRepo', () => ({
//   userRepo: {
//     findByClerkIdWithStats: vi.fn(),
//   },
// }))
// 
// describe('userService', () => {
//   it('getUserProfile returns formatted profile', async () => {
//     const { userRepo } = await import('@/src/lib/repositories/userRepo')
//     vi.mocked(userRepo.findByClerkIdWithStats).mockResolvedValue({
//       user: createMockUser(),
//       totalPlayTimeSeconds: 3600,
//       totalReferrals: 5,
//     })
//     
//     const result = await userService.getUserProfile('clerk-1', mockClerkData)
//     
//     expect(result).toBeDefined()
//     expect(result?.username).toBe('testuser')
//   })
// })
// ```
// 
// TESTING HELPERS:
// 
// ```typescript
// import { describe, it, expect } from 'vitest'
// import { calculateXPForLevel } from '@/src/lib/helpers/xpLogic'
// 
// describe('xpLogic', () => {
//   it('calculateXPForLevel returns correct XP', () => {
//     expect(calculateXPForLevel(1)).toBe(1000)
//     expect(calculateXPForLevel(2)).toBe(1200)
//   })
// })
// ```
// 
