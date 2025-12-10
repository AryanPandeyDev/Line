/**
 * ============================================================================
 * GAME TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for game and gameplay data.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Game categories
 */
export type GameCategory =
    | 'RACING'
    | 'ACTION'
    | 'ADVENTURE'
    | 'CARDS'
    | 'STRATEGY'
    | 'PUZZLE'
    | 'RPG'
    | 'SIMULATION'

/**
 * Game status
 */
export type GameStatus =
    | 'ACTIVE'
    | 'COMING_SOON'
    | 'MAINTENANCE'
    | 'DEPRECATED'

/**
 * Game entity
 */
export interface Game {
    id: string
    name: string
    description: string
    category: GameCategory
    status: GameStatus
    imageUrl: string | null
    rewardMin: number
    rewardMax: number
    xpReward: number
    playerCount: number
}

/**
 * User's progress in a game
 */
export interface GameProgress {
    userId: string
    gameId: string
    gamesPlayed: number
    wins: number
    losses: number
    highScore: number
    totalPlayTime: number
    tokensEarned: number
    lastPlayedAt: Date | null
}

/**
 * Game with user's progress
 */
export interface GameWithProgress extends Game {
    progress: GameProgress | null
}

/**
 * Input from game completion
 */
export interface GameResult {
    score: number
    won: boolean
    playTimeSeconds: number
}

/**
 * Result after recording game
 */
export interface GameRewardSummary {
    tokensEarned: number
    xpEarned: number
    newHighScore: boolean
    previousHighScore: number | null
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
    rank: number
    userId: string
    username: string
    displayName: string
    avatarUrl: string | null
    highScore: number
}
