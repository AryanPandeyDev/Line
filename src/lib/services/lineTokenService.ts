/**
 * ============================================================================
 * LINE TOKEN SERVICE
 * ============================================================================
 *
 * Business logic layer for LINE token operations.
 * Encapsulates all LINE token contract queries.
 *
 * RESPONSIBILITIES:
 * - Query LINE token balances
 * - Query allowances for marketplace spending
 * - Validate token amounts
 *
 * FORBIDDEN:
 * - Signing approve/transfer transactions (client-side only)
 * - Direct database access
 * - Storing state (stateless service)
 *
 * ============================================================================
 */

import { CONTRACTS, VARA_RPC } from '@/lib/contracts/config'

// Types
export interface TokenBalance {
    balance: string       // BigInt as string (base units)
    decimals: number
}

export interface Allowance {
    allowance: string     // BigInt as string (base units)
    spender: string
}

/**
 * Initialize sails client for LINE token contract
 */
async function createLineTokenClient() {
    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')
    const fs = await import('fs')
    const path = await import('path')

    if (!CONTRACTS.LINE_TOKEN) {
        throw new Error('LINE_TOKEN contract not configured. Check NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID.')
    }

    const api = await GearApi.create({ providerAddress: VARA_RPC })

    const idlPath = path.join(process.cwd(), 'public', 'contracts', 'line_token.idl')
    const idl = fs.readFileSync(idlPath, 'utf-8')

    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(CONTRACTS.LINE_TOKEN as `0x${string}`)

    return { api, sails }
}

/**
 * Normalize address to hex format
 */
async function normalizeAddress(address: string): Promise<string> {
    if (/^0x[a-fA-F0-9]{64}$/.test(address)) {
        return address
    }

    const { decodeAddress } = await import('@polkadot/util-crypto')
    const { u8aToHex } = await import('@polkadot/util')
    return u8aToHex(decodeAddress(address))
}

/**
 * Cleanup connection
 */
async function disconnect(api: { disconnect: () => Promise<void> }) {
    try {
        await api.disconnect()
    } catch {
        // Ignore disconnect errors
    }
}

// ============================================================================
// PUBLIC SERVICE METHODS
// ============================================================================

export const lineTokenService = {
    /**
     * Get LINE token balance for an address
     *
     * @param ownerAddress - Wallet address (hex or SS58)
     * @returns Balance info with amount as BigInt string
     */
    getBalance: async (ownerAddress: string): Promise<TokenBalance> => {
        const hexAddress = await normalizeAddress(ownerAddress)
        const { api, sails } = await createLineTokenClient()

        try {
            const { u8aToHex, hexToU8a, u8aToBn } = await import('@polkadot/util')

            const query = sails.services.LineToken.queries.BalanceOf(hexAddress as `0x${string}`)
            const payload = (query as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: hexAddress as `0x${string}`,
                destination: CONTRACTS.LINE_TOKEN as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) {
                return { balance: '0', decimals: 9 }
            }

            const replyPayload = hexToU8a(result.payload.toHex())
            // Decode U256 balance (last 32 bytes)
            if (replyPayload.length >= 32) {
                const balanceBytes = replyPayload.slice(-32)
                return {
                    balance: u8aToBn(balanceBytes, { isLe: true }).toString(),
                    decimals: 9,
                }
            }

            return { balance: '0', decimals: 9 }
        } finally {
            await disconnect(api)
        }
    },

    /**
     * Get allowance granted to marketplace contract
     *
     * @param ownerAddress - Token owner address
     * @returns Allowance info
     */
    getAllowanceForMarketplace: async (ownerAddress: string): Promise<Allowance> => {
        if (!CONTRACTS.MARKETPLACE) {
            throw new Error('Marketplace contract not configured')
        }

        return lineTokenService.getAllowance(ownerAddress, CONTRACTS.MARKETPLACE)
    },

    /**
     * Get allowance for any spender
     *
     * @param ownerAddress - Token owner address
     * @param spenderAddress - Spender address
     * @returns Allowance info
     */
    getAllowance: async (ownerAddress: string, spenderAddress: string): Promise<Allowance> => {
        const hexOwner = await normalizeAddress(ownerAddress)
        const hexSpender = await normalizeAddress(spenderAddress)
        const { api, sails } = await createLineTokenClient()

        try {
            const { u8aToHex, hexToU8a, u8aToBn } = await import('@polkadot/util')

            const query = sails.services.LineToken.queries.Allowance(
                hexOwner as `0x${string}`,
                hexSpender as `0x${string}`
            )
            const payload = (query as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: hexOwner as `0x${string}`,
                destination: CONTRACTS.LINE_TOKEN as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) {
                return { allowance: '0', spender: hexSpender }
            }

            const replyPayload = hexToU8a(result.payload.toHex())
            if (replyPayload.length >= 32) {
                const allowanceBytes = replyPayload.slice(-32)
                return {
                    allowance: u8aToBn(allowanceBytes, { isLe: true }).toString(),
                    spender: hexSpender,
                }
            }

            return { allowance: '0', spender: hexSpender }
        } finally {
            await disconnect(api)
        }
    },

    /**
     * Check if user has sufficient balance for a transaction
     *
     * @param ownerAddress - Wallet address
     * @param requiredAmount - Required amount as BigInt string
     * @returns True if balance >= requiredAmount
     */
    hasSufficientBalance: async (ownerAddress: string, requiredAmount: string): Promise<boolean> => {
        const { balance } = await lineTokenService.getBalance(ownerAddress)
        return BigInt(balance) >= BigInt(requiredAmount)
    },

    /**
     * Check if marketplace has sufficient allowance
     *
     * @param ownerAddress - Wallet address
     * @param requiredAmount - Required amount as BigInt string
     * @returns True if allowance >= requiredAmount
     */
    hasSufficientAllowance: async (ownerAddress: string, requiredAmount: string): Promise<boolean> => {
        const { allowance } = await lineTokenService.getAllowanceForMarketplace(ownerAddress)
        return BigInt(allowance) >= BigInt(requiredAmount)
    },

    /**
     * Validate that user can place a bid
     * Checks both balance and allowance
     *
     * @param ownerAddress - Wallet address
     * @param bidAmount - Bid amount as BigInt string
     * @returns Validation result with error message if invalid
     */
    validateBidFunds: async (
        ownerAddress: string,
        bidAmount: string
    ): Promise<{ valid: boolean; error?: string; needsApproval?: boolean }> => {
        // Check balance
        const { balance } = await lineTokenService.getBalance(ownerAddress)
        const bidBigInt = BigInt(bidAmount)
        const balanceBigInt = BigInt(balance)

        if (balanceBigInt < bidBigInt) {
            return {
                valid: false,
                error: `Insufficient balance. You have ${balance} LINE (base units), need ${bidAmount}.`,
            }
        }

        // Check allowance
        const { allowance } = await lineTokenService.getAllowanceForMarketplace(ownerAddress)
        const allowanceBigInt = BigInt(allowance)

        if (allowanceBigInt < bidBigInt) {
            return {
                valid: false,
                error: 'Insufficient allowance. Please approve LINE spending first.',
                needsApproval: true,
            }
        }

        return { valid: true }
    },
}
