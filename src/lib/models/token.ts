/**
 * ============================================================================
 * TOKEN TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for LINE token operations.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Token transaction types
 */
export type TransactionType =
    | 'EARN'
    | 'SPEND'
    | 'TRANSFER'
    | 'CLAIM'
    | 'REFERRAL_BONUS'
    | 'GAME_REWARD'
    | 'DAILY_REWARD'
    | 'STREAK_BONUS'
    | 'ACHIEVEMENT_REWARD'

/**
 * Token transaction record
 */
export interface TokenTransaction {
    id: string
    userId: string
    type: TransactionType
    amount: number
    balance: number
    source: string
    metadata: Record<string, unknown> | null
    createdAt: Date
}

/**
 * Token transaction for API response
 */
export interface TokenTransactionResponse {
    id: string
    type: TransactionType
    amount: number
    balance: number
    source: string
    createdAt: string
}

/**
 * Token balance summary
 */
export interface TokenBalance {
    current: number
    totalEarned: number
    totalSpent: number
}

/**
 * Transaction history response
 */
export interface TransactionHistoryResponse {
    transactions: TokenTransactionResponse[]
    total: number
    hasMore: boolean
}

/**
 * Result of a token operation
 */
export interface TokenOperationResult {
    success: boolean
    newBalance: number
    transactionId: string
}

/**
 * Error for insufficient balance
 */
export interface InsufficientBalanceError {
    code: 'INSUFFICIENT_BALANCE'
    required: number
    available: number
}
