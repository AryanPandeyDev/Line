/**
 * ============================================================================
 * GAME SERVICE UNIT TESTS
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    gameRepo: {
        findAll: vi.fn(),
    },
}))

vi.mock('@/src/lib/repositories/gameRepo', () => ({ gameRepo: mocks.gameRepo }))

import { gameService } from '@/src/lib/services/gameService'

function createMockGame(overrides = {}) {
    return {
        id: 'game-1',
        name: 'Test Game',
        description: 'A test game',
        coverImage: '/images/game.png',
        category: 'ACTION',
        playerCount: 5000,
        rating: 4.5,
        rewardMin: 10,
        rewardMax: 100,
        status: 'ACTIVE',
        releaseDate: new Date('2024-01-15'),
        ...overrides,
    }
}

describe('gameService', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('getAllGames', () => {
        it('returns empty array when no games', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([])
            const result = await gameService.getAllGames()
            expect(result).toEqual([])
        })

        it('returns all games formatted correctly', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([
                createMockGame(),
                createMockGame({ id: 'game-2', name: 'Another Game' }),
            ])

            const result = await gameService.getAllGames()

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                id: 'game-1',
                name: 'Test Game',
                category: 'Action',
                players: 5000,
                rating: 4.5,
                rewards: { min: 10, max: 100 },
                status: 'active',
                releaseDate: '2024-01-15',
            })
        })

        it('formats category with proper casing', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([
                createMockGame({ category: 'ACTION' }),
                createMockGame({ id: 'game-2', category: 'PUZZLE' }),
            ])

            const result = await gameService.getAllGames()

            expect(result[0].category).toBe('Action')
            expect(result[1].category).toBe('Puzzle')
        })

        it('formats status correctly', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([
                createMockGame({ status: 'COMING_SOON' }),
            ])

            const result = await gameService.getAllGames()

            expect(result[0].status).toBe('coming-soon')
        })

        it('handles null releaseDate', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([
                createMockGame({ releaseDate: null }),
            ])

            const result = await gameService.getAllGames()

            expect(result[0].releaseDate).toBeNull()
        })

        it('uses coverImage as image field', async () => {
            mocks.gameRepo.findAll.mockResolvedValue([
                createMockGame({ coverImage: '/custom/image.png' }),
            ])

            const result = await gameService.getAllGames()

            expect(result[0].image).toBe('/custom/image.png')
        })
    })
})
