/**
 * ============================================================================
 * STREAK REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma DailyStreak and StreakReward models.
 * 
 * PRISMA MODELS ACCESSED:
 * - DailyStreak (user streak tracking)
 * - StreakReward (reward configuration)
 * 
 * ALLOWED:
 * - Prisma CRUD on DailyStreak
 * - Prisma read on StreakReward
 * - Date-based queries for claim status
 * - Transaction client support
 * 
 * FORBIDDEN:
 * - Reward calculations (use rewardLogic)
 * - Claim eligibility logic (service responsibility)
 * - Reward configuration changes (admin)
 * - Token operations (use tokenService)
 * 
 * ============================================================================
 */

export const streakRepo = {
    /**
     * Find streak by user ID
     * @prisma db.dailyStreak.findUnique({ where: { userId } })
     */
    findByUserId: async (userId: string) => {
        // Basic Prisma query
        throw new Error('Not implemented')
    },

    /**
     * Create streak record for a new user
     * @prisma db.dailyStreak.create({ data })
     */
    create: async (userId: string) => {
        // Prisma create with defaults
        throw new Error('Not implemented')
    },

    /**
     * Update streak record
     * @prisma db.dailyStreak.update({ where: { userId }, data })
     */
    update: async (userId: string, data: {
        currentStreak?: number
        longestStreak?: number
        lastClaimDate?: Date
        streakStartDate?: Date
        claimedDays?: number[]
    }) => {
        // Prisma update
        throw new Error('Not implemented')
    },

    /**
     * Update within transaction
     * @param tx - Prisma transaction client
     */
    updateInTx: async (tx: unknown, userId: string, data: {
        currentStreak?: number
        longestStreak?: number
        lastClaimDate?: Date
        claimedDays?: number[]
    }) => {
        // Prisma update using tx client
        throw new Error('Not implemented')
    },

    /**
     * Find streak reward config by day
     * @prisma db.streakReward.findUnique({ where: { day } })
     */
    findRewardByDay: async (day: number) => {
        // Prisma query
        throw new Error('Not implemented')
    },

    /**
     * Find all streak reward configs
     * @prisma db.streakReward.findMany({ orderBy: { day: 'asc' } })
     */
    findAllRewards: async () => {
        // Prisma query ordered by day
        throw new Error('Not implemented')
    },

    /**
     * Get leaderboard by current streak
     * @prisma db.dailyStreak.findMany({ orderBy: { currentStreak: 'desc' }, take })
     */
    getLeaderboard: async (limit?: number) => {
        // Prisma query with limit
        throw new Error('Not implemented')
    },
}
