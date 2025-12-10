/**
 * ============================================================================
 * GAME REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma Game and UserGameProgress models.
 * 
 * PRISMA MODELS ACCESSED:
 * - Game (primary)
 * - UserGameProgress (user progress)
 * 
 * FORBIDDEN:
 * - Reward calculations
 * - Response formatting
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'

export interface GameData {
    id: string
    slug: string
    name: string
    description: string
    coverImage: string
    category: string
    playerCount: number
    rating: number
    rewardMin: number
    rewardMax: number
    status: string
    releaseDate: Date | null
}

export const gameRepo = {
    /**
     * Find all games with optional filtering
     */
    findAll: async (): Promise<GameData[]> => {
        const games = await db.game.findMany({
            orderBy: [
                { status: 'asc' },
                { playerCount: 'desc' },
            ],
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                coverImage: true,
                category: true,
                playerCount: true,
                rating: true,
                rewardMin: true,
                rewardMax: true,
                status: true,
                releaseDate: true,
            },
        })

        return games
    },

    /**
     * Find game by ID
     */
    findById: async (id: string) => {
        return db.game.findUnique({
            where: { id },
        })
    },

    /**
     * Find user's progress for a game
     */
    findUserProgress: async (userId: string, gameId: string) => {
        return db.userGameProgress.findUnique({
            where: {
                userId_gameId: { userId, gameId },
            },
        })
    },

    /**
     * Aggregate total play time for a user
     */
    aggregateTotalPlayTime: async (userId: string): Promise<number> => {
        const result = await db.userGameProgress.aggregate({
            where: { userId },
            _sum: { totalPlayTime: true },
        })
        return result._sum.totalPlayTime || 0
    },
}
