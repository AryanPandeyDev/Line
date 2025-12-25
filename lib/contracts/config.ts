/**
 * =============================================================================
 * SMART CONTRACT CONFIGURATION
 * =============================================================================
 *
 * Central configuration for all blockchain contract addresses and network settings.
 * Program IDs must be set in environment variables for deployment.
 */

/** Contract Program IDs from environment */
export const CONTRACTS = {
    /** Marketplace contract - handles auctions */
    MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID || '',
    /** NFT contract - handles token ownership */
    NFT: process.env.NEXT_PUBLIC_NFT_PROGRAM_ID || '',
    /** LINE Token contract - ERC20-like fungible token */
    LINE_TOKEN: process.env.NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID || '',
} as const

/** LINE token decimal places */
export const LINE_DECIMALS = 9

/** Vara network RPC endpoint */
export const VARA_RPC = process.env.NEXT_PUBLIC_VARA_RPC || 'wss://testnet.vara.network'

/** Polling intervals in milliseconds */
export const POLLING = {
    /** Auction list refresh */
    AUCTION_LIST: 15_000,
    /** Open auction modal refresh */
    AUCTION_DETAIL: 5_000,
    /** Wallet balances, pending refund/payout */
    WALLET_STATE: 10_000,
    /** Transaction confirmation polling */
    TX_CONFIRMATION: 3_000,
} as const

/**
 * Validate that required contract addresses are configured
 */
export function validateContractConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = []

    if (!CONTRACTS.MARKETPLACE) missing.push('NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID')
    if (!CONTRACTS.NFT) missing.push('NEXT_PUBLIC_NFT_PROGRAM_ID')
    if (!CONTRACTS.LINE_TOKEN) missing.push('NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID')

    return { valid: missing.length === 0, missing }
}
