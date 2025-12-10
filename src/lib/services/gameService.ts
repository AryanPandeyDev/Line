/**
 * ============================================================================
 * GAME SERVICE
 * ============================================================================
 * 
 * Business logic for game-related operations.
 * 
 * DOMAIN SCOPE:
 * - Game catalog retrieval
 * - Response formatting
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { gameRepo } from '@/src/lib/repositories/gameRepo'

export interface GameResponse {
    id: string
    name: string
    description: string
    image: string
    category: string
    players: number
    rating: number
    rewards: { min: number; max: number }
    status: string
    releaseDate: string | null
}

export const gameService = {
    /**
     * Get all games formatted for frontend
     */
    getAllGames: async (): Promise<GameResponse[]> => {
        const games = await gameRepo.findAll()

        return games.map((game) => ({
            id: game.id,
            name: game.name,
            description: game.description,
            image: game.coverImage,
            category: game.category.charAt(0) + game.category.slice(1).toLowerCase(),
            players: game.playerCount,
            rating: game.rating,
            rewards: { min: game.rewardMin, max: game.rewardMax },
            status: game.status.toLowerCase().replace('_', '-'),
            releaseDate: game.releaseDate?.toISOString().split('T')[0] || null,
        }))
    },
}
