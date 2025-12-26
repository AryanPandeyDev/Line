/**
 * ============================================================================
 * MARKETPLACE CLIENT
 * ============================================================================
 *
 * Client-side service for marketplace contract transactions.
 * Handles wallet connection and transaction signing via SubWallet.
 *
 * RESPONSIBILITIES:
 * - Connect to SubWallet browser extension
 * - Build Sails transactions for marketplace operations
 * - Sign and send transactions
 * - Return transaction results
 *
 * FORBIDDEN:
 * - Business logic (belongs in services)
 * - Server-side execution (browser-only)
 * - Direct state management (use hooks)
 *
 * ============================================================================
 */

import { CONTRACTS, VARA_RPC } from '@/lib/contracts/config'

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionResult {
    success: boolean
    blockHash?: string
    txHash?: string
    msgId?: string
    error?: string
}

export interface WalletAccount {
    address: string
    name?: string
}

// ============================================================================
// SUBWALLET DETECTION
// ============================================================================

/**
 * Check if SubWallet extension is available
 */
export function isSubWalletAvailable(): boolean {
    if (typeof window === 'undefined') return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const injectedWeb3 = (window as any).injectedWeb3
    return !!injectedWeb3?.['subwallet-js']
}

/**
 * Get SubWallet extension instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSubWallet(): Promise<any> {
    if (!isSubWalletAvailable()) {
        throw new Error(
            'SubWallet not found. Please install the SubWallet browser extension.'
        )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const injectedWeb3 = (window as any).injectedWeb3
    const subwallet = injectedWeb3['subwallet-js']
    return await subwallet.enable()
}

/**
 * Find matching account in SubWallet by address
 */
async function findAccount(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extension: any,
    targetAddress: string
): Promise<WalletAccount> {
    const { decodeAddress } = await import('@polkadot/util-crypto')
    const { u8aToHex } = await import('@polkadot/util')

    const accounts = await extension.accounts.get()

    // Normalize target address to hex
    let targetHex = targetAddress
    if (!targetAddress.startsWith('0x')) {
        try {
            targetHex = u8aToHex(decodeAddress(targetAddress))
        } catch {
            targetHex = targetAddress
        }
    }

    // Find matching account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = accounts.find((a: any) => {
        try {
            const accountHex = u8aToHex(decodeAddress(a.address))
            return accountHex.toLowerCase() === targetHex.toLowerCase()
        } catch {
            return a.address.toLowerCase() === targetAddress.toLowerCase()
        }
    })

    if (!account) {
        console.error('[MarketplaceClient] Available accounts:', accounts.map((a: { address: string }) => a.address))
        console.error('[MarketplaceClient] Looking for:', targetAddress, targetHex)
        throw new Error(
            'Account not found in SubWallet. Make sure you\'re using the connected wallet.'
        )
    }

    return { address: account.address, name: account.name }
}

// ============================================================================
// SAILS CLIENT SETUP
// ============================================================================

/**
 * Create Sails client for marketplace contract (client-side)
 */
async function createMarketplaceSails() {
    if (!CONTRACTS.MARKETPLACE) {
        throw new Error('Marketplace contract not configured. Check NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID.')
    }

    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')

    // Connect to Vara network
    const api = await GearApi.create({ providerAddress: VARA_RPC })

    // Fetch IDL from public folder
    const idlResponse = await fetch('/contracts/marketplace.idl')
    if (!idlResponse.ok) {
        throw new Error('Failed to fetch marketplace IDL')
    }
    const idl = await idlResponse.text()

    // Initialize Sails
    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(CONTRACTS.MARKETPLACE as `0x${string}`)

    return { api, sails }
}

/**
 * Create Sails client for LINE token contract (client-side)
 */
async function createLineTokenSails() {
    if (!CONTRACTS.LINE_TOKEN) {
        throw new Error('LINE Token contract not configured. Check NEXT_PUBLIC_LINE_PROGRAM_ID.')
    }

    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')

    // Connect to Vara network
    const api = await GearApi.create({ providerAddress: VARA_RPC })

    // Fetch IDL from public folder
    const idlResponse = await fetch('/contracts/line_token.idl')
    if (!idlResponse.ok) {
        throw new Error('Failed to fetch LINE token IDL')
    }
    const idl = await idlResponse.text()

    // Initialize Sails
    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(CONTRACTS.LINE_TOKEN as `0x${string}`)

    return { api, sails }
}

// ============================================================================
// LINE TOKEN OPERATIONS  
// ============================================================================

export const lineTokenClient = {
    /**
     * Query current allowance for a spender
     * This is a read-only query, no signature needed
     *
     * @param owner - Owner's wallet address (SS58 or hex format)
     * @param spender - Spender's contract address (hex format)
     * @returns Current allowance as bigint
     */
    async getAllowance(
        owner: string,
        spender: string
    ): Promise<bigint> {
        console.log('[LineTokenClient] Querying allowance:', { owner, spender })

        const { api, sails } = await createLineTokenSails()

        try {
            // Convert owner address to hex if it's SS58 encoded
            const { decodeAddress } = await import('@polkadot/util-crypto')
            const { u8aToHex } = await import('@polkadot/util')

            let ownerHex = owner
            if (!owner.startsWith('0x')) {
                try {
                    ownerHex = u8aToHex(decodeAddress(owner))
                } catch {
                    console.error('[LineTokenClient] Failed to decode owner address:', owner)
                    return 0n
                }
            }

            console.log('[LineTokenClient] Using owner hex:', ownerHex)

            // LINE token Allowance query: Allowance(owner: actor_id, spender: actor_id) -> u256
            // Sails queries return a QueryBuilder - must call .call() to execute
            const queryBuilder = sails.services.Line.queries.Allowance(
                ownerHex as `0x${string}`,
                spender as `0x${string}`
            )

            // Execute the query with origin address
            const result = await queryBuilder
                .withAddress(ownerHex as `0x${string}`)
                .call()

            console.log('[LineTokenClient] Raw allowance result:', result, typeof result)

            // Extract the actual value - result should be the u256 value
            let allowanceValue: bigint = 0n
            if (result !== null && result !== undefined) {
                if (typeof result === 'bigint') {
                    allowanceValue = result
                } else if (typeof result === 'string' || typeof result === 'number') {
                    allowanceValue = BigInt(result)
                } else if (typeof result === 'object') {
                    // Could be wrapped in an object or array - cast through unknown first
                    const resultObj = result as unknown as Record<string, unknown>
                    const val = resultObj.value ?? resultObj.ok ??
                        (Array.isArray(result) ? result[0] : result)
                    if (val !== null && val !== undefined && typeof val !== 'object') {
                        allowanceValue = BigInt(String(val))
                    }
                }
            }

            console.log('[LineTokenClient] Parsed allowance:', allowanceValue.toString())
            return allowanceValue
        } catch (error) {
            console.error('[LineTokenClient] Allowance query error:', error)
            return 0n
        } finally {
            await api.disconnect()
        }
    },

    /**
     * Approve marketplace to spend LINE tokens
     * This must complete before placing a bid
     *
     * @param amount - Amount to approve in raw units
     * @param walletAddress - User's wallet address for signing
     * @returns Transaction result
     */
    async approveMarketplace(
        amount: bigint,
        walletAddress: string
    ): Promise<TransactionResult> {
        console.log('[LineTokenClient] Approving marketplace for amount:', amount.toString())

        if (!CONTRACTS.MARKETPLACE) {
            return { success: false, error: 'Marketplace contract not configured' }
        }

        const extension = await getSubWallet()
        const account = await findAccount(extension, walletAddress)
        const { api, sails } = await createLineTokenSails()

        try {
            // LINE token Approve function: Approve(spender: actor_id, value: u256)
            const transaction = sails.services.Line.functions.Approve(
                CONTRACTS.MARKETPLACE as `0x${string}`,  // spender = marketplace
                amount
            )

            transaction.withAccount(account.address, { signer: extension.signer })

            console.log('[LineTokenClient] Calculating gas...')
            await transaction.calculateGas()

            console.log('[LineTokenClient] Signing approval (check SubWallet popup)...')
            const result = await transaction.signAndSend()
            console.log('[LineTokenClient] Approval sent:', result)

            // Wait for the contract response to ensure it's confirmed
            if (result.response && typeof result.response === 'function') {
                try {
                    console.log('[LineTokenClient] Waiting for approval confirmation...')
                    const contractResponse = await result.response()
                    console.log('[LineTokenClient] Approval response:', contractResponse)

                    if (contractResponse === false) {
                        throw new Error('Approval rejected by contract')
                    }
                } catch (responseError) {
                    console.error('[LineTokenClient] Response error:', responseError)
                    // If we can't get response but block hash exists, consider it successful
                    if (!result.blockHash) {
                        throw responseError
                    }
                }
            }

            return {
                success: true,
                blockHash: result.blockHash,
                txHash: result.txHash,
                msgId: result.msgId,
            }
        } catch (error) {
            console.error('[LineTokenClient] Approve error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Approval failed',
            }
        } finally {
            await api.disconnect()
        }
    },
}

// ============================================================================
// MARKETPLACE OPERATIONS
// ============================================================================

export const marketplaceClient = {
    /**
     * Finalize an ended auction
     * This is permissionless - anyone can call it after auction ends
     *
     * @param auctionId - The auction ID to finalize
     * @param walletAddress - User's wallet address for signing
     * @returns Transaction result
     */
    async finalizeAuction(
        auctionId: string,
        walletAddress: string
    ): Promise<TransactionResult> {
        console.log('[MarketplaceClient] Finalizing auction:', auctionId)

        // Step 1: Get SubWallet
        const extension = await getSubWallet()
        console.log('[MarketplaceClient] SubWallet connected')

        // Step 2: Find account
        const account = await findAccount(extension, walletAddress)
        console.log('[MarketplaceClient] Using account:', account.address)

        // Step 3: Create Sails client
        const { api, sails } = await createMarketplaceSails()
        console.log('[MarketplaceClient] Sails initialized')

        try {
            // Step 4: Build transaction
            const transaction = sails.services.Marketplace.functions.FinalizeAuction(
                BigInt(auctionId)
            )
            console.log('[MarketplaceClient] Transaction built')

            // Step 5: Set account and signer
            transaction.withAccount(account.address, { signer: extension.signer })

            // Step 6: Calculate gas
            console.log('[MarketplaceClient] Calculating gas...')
            try {
                await transaction.calculateGas()
                console.log('[MarketplaceClient] Gas calculated')
            } catch (gasError) {
                const errorMsg = gasError instanceof Error ? gasError.message : String(gasError)
                if (errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('balance')) {
                    throw new Error('Insufficient VARA balance to pay for gas. Please add more VARA to your wallet.')
                }
                throw new Error(`Gas calculation failed: ${errorMsg}`)
            }

            // Step 7: Check VARA balance for gas
            const accountInfo = await api.query.system.account(account.address)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const freeBalance = (accountInfo as any).data.free.toBigInt()
            console.log('[MarketplaceClient] VARA balance:', freeBalance.toString())

            // Get estimated gas from transaction
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txAny = transaction as any
            const gasLimit = txAny._gas || txAny._gasLimit || txAny.gasLimit || BigInt(0)

            if (gasLimit > BigInt(0) && freeBalance < gasLimit) {
                const gasInVara = Number(gasLimit) / 1e12
                const balanceInVara = Number(freeBalance) / 1e12
                throw new Error(
                    `Insufficient VARA balance for gas. You have ${balanceInVara.toFixed(4)} VARA but need approximately ${gasInVara.toFixed(4)} VARA.`
                )
            }

            // Step 8: Sign and send
            console.log('[MarketplaceClient] Requesting signature (check SubWallet popup)...')

            // Small delay for UI
            await new Promise(resolve => setTimeout(resolve, 100))

            const result = await transaction.signAndSend()
            console.log('[MarketplaceClient] Transaction sent:', result)

            // Step 9: Wait for response
            if (result.response && typeof result.response === 'function') {
                try {
                    console.log('[MarketplaceClient] Waiting for contract response...')
                    const contractResponse = await result.response()
                    console.log('[MarketplaceClient] Contract response:', contractResponse)

                    if (contractResponse === false) {
                        throw new Error('Contract returned false - finalization failed')
                    }
                } catch (responseError) {
                    console.error('[MarketplaceClient] Response error:', responseError)
                    // Don't throw - transaction might have succeeded
                }
            }

            return {
                success: true,
                blockHash: result.blockHash,
                txHash: result.txHash,
                msgId: result.msgId,
            }
        } catch (error) {
            console.error('[MarketplaceClient] Finalize error:', error)

            // Extract meaningful error message
            let errorMessage = 'Transaction failed'
            if (error instanceof Error) {
                errorMessage = error.message
            } else if (typeof error === 'object' && error !== null) {
                const errObj = error as Record<string, unknown>
                if (errObj.docs && typeof errObj.docs === 'string') {
                    errorMessage = errObj.docs
                } else if (errObj.message && typeof errObj.message === 'string') {
                    errorMessage = errObj.message
                } else if (errObj.method && typeof errObj.method === 'string') {
                    errorMessage = errObj.method.replace(/([A-Z])/g, ' $1').trim()
                }
            }

            return {
                success: false,
                error: errorMessage,
            }
        } finally {
            // Cleanup
            try {
                await api.disconnect()
            } catch {
                // Ignore disconnect errors
            }
        }
    },

    /**
     * Place a bid on an auction
     *
     * @param auctionId - The auction ID to bid on
     * @param amount - Bid amount in raw units (with decimals)
     * @param walletAddress - User's wallet address
     * @returns Transaction result
     */
    async placeBid(
        auctionId: string,
        amount: bigint,
        walletAddress: string
    ): Promise<TransactionResult> {
        console.log('[MarketplaceClient] Placing bid:', { auctionId, amount: amount.toString() })

        const extension = await getSubWallet()
        const account = await findAccount(extension, walletAddress)
        const { api, sails } = await createMarketplaceSails()

        try {
            const transaction = sails.services.Marketplace.functions.Bid(
                BigInt(auctionId),
                amount
            )

            transaction.withAccount(account.address, { signer: extension.signer })

            try {
                await transaction.calculateGas()
            } catch (gasError) {
                // Parse contract error messages for user-friendly display
                const errorStr = String(gasError)
                console.log('[MarketplaceClient] Gas calculation error:', errorStr)

                if (errorStr.includes('Cannot outbid yourself')) {
                    throw new Error('You are already the highest bidder. You cannot outbid yourself.')
                }
                if (errorStr.includes('Auction ended') || errorStr.includes('auction has ended')) {
                    throw new Error('This auction has ended. You can no longer place bids.')
                }
                if (errorStr.includes('Insufficient allowance')) {
                    throw new Error('Insufficient LINE token allowance. Please approve more tokens.')
                }
                if (errorStr.includes('Bid too low') || errorStr.includes('bid is too low')) {
                    throw new Error('Your bid is too low. Please enter a higher amount.')
                }
                if (errorStr.includes('Insufficient balance')) {
                    throw new Error('Insufficient LINE token balance for this bid.')
                }
                // Re-throw original error if not matched
                throw gasError
            }

            console.log('[MarketplaceClient] Requesting bid signature...')
            const result = await transaction.signAndSend()

            if (result.response && typeof result.response === 'function') {
                const contractResponse = await result.response()
                if (contractResponse === false) {
                    throw new Error('Bid rejected by contract')
                }
            }

            return {
                success: true,
                blockHash: result.blockHash,
                txHash: result.txHash,
                msgId: result.msgId,
            }
        } catch (error) {
            console.error('[MarketplaceClient] Bid error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bid failed',
            }
        } finally {
            await api.disconnect()
        }
    },

    /**
     * Claim pending refund
     *
     * @param walletAddress - User's wallet address
     * @returns Transaction result
     */
    async claimRefund(walletAddress: string): Promise<TransactionResult> {
        console.log('[MarketplaceClient] Claiming refund')

        const extension = await getSubWallet()
        const account = await findAccount(extension, walletAddress)
        const { api, sails } = await createMarketplaceSails()

        try {
            const transaction = sails.services.Marketplace.functions.ClaimRefund()

            transaction.withAccount(account.address, { signer: extension.signer })
            await transaction.calculateGas()

            const result = await transaction.signAndSend()

            if (result.response && typeof result.response === 'function') {
                const contractResponse = await result.response()
                if (contractResponse === false) {
                    throw new Error('No refund available')
                }
            }

            return {
                success: true,
                blockHash: result.blockHash,
                txHash: result.txHash,
            }
        } catch (error) {
            console.error('[MarketplaceClient] Claim refund error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Claim failed',
            }
        } finally {
            await api.disconnect()
        }
    },

    /**
     * Claim pending payout (for sellers)
     *
     * @param walletAddress - User's wallet address
     * @returns Transaction result
     */
    async claimPayout(walletAddress: string): Promise<TransactionResult> {
        console.log('[MarketplaceClient] Claiming payout')

        const extension = await getSubWallet()
        const account = await findAccount(extension, walletAddress)
        const { api, sails } = await createMarketplaceSails()

        try {
            const transaction = sails.services.Marketplace.functions.ClaimPayout()

            transaction.withAccount(account.address, { signer: extension.signer })
            await transaction.calculateGas()

            const result = await transaction.signAndSend()

            if (result.response && typeof result.response === 'function') {
                const contractResponse = await result.response()
                if (contractResponse === false) {
                    throw new Error('No payout available')
                }
            }

            return {
                success: true,
                blockHash: result.blockHash,
                txHash: result.txHash,
            }
        } catch (error) {
            console.error('[MarketplaceClient] Claim payout error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Claim failed',
            }
        } finally {
            await api.disconnect()
        }
    },
}
