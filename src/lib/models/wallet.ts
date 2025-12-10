/**
 * ============================================================================
 * WALLET TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for Vara Network wallet operations.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Network options
 */
export type Network = 'VARA_TESTNET' | 'VARA_MAINNET'

/**
 * Wallet transaction types
 */
export type WalletTransactionType =
    | 'SEND'
    | 'RECEIVE'
    | 'NFT_PURCHASE'
    | 'NFT_SALE'
    | 'SWAP'
    | 'STAKE'
    | 'UNSTAKE'

/**
 * Transaction status
 */
export type TransactionStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'FAILED'

/**
 * Token types
 */
export type WalletTokenType = 'VARA' | 'LINE'

/**
 * Wallet entity
 */
export interface Wallet {
    id: string
    userId: string
    address: string
    network: Network
    isConnected: boolean
    varaBalance: number
    lineBalance: number
    connectedAt: Date | null
}

/**
 * Wallet transaction record
 */
export interface WalletTransaction {
    id: string
    walletId: string
    type: WalletTransactionType
    amount: number
    tokenType: WalletTokenType
    txHash: string | null
    fromAddress: string | null
    toAddress: string | null
    status: TransactionStatus
    createdAt: Date
    confirmedAt: Date | null
}

/**
 * Wallet info for API response
 */
export interface WalletInfoResponse {
    address: string
    network: Network
    isConnected: boolean
    balances: {
        vara: number
        line: number
    }
    connectedAt: string | null
    transactionCount: number
}

/**
 * Wallet connection input
 */
export interface ConnectWalletInput {
    address: string
    network?: Network
    signature?: string
    message?: string
}

/**
 * Wallet transaction response
 */
export interface WalletTransactionResponse {
    id: string
    type: WalletTransactionType
    amount: number
    tokenType: WalletTokenType
    txHash: string | null
    status: TransactionStatus
    createdAt: string
    confirmedAt: string | null
}

/**
 * Transaction history response
 */
export interface WalletHistoryResponse {
    transactions: WalletTransactionResponse[]
    total: number
    hasMore: boolean
}
