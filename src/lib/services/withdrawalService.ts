/**
 * ============================================================================
 * WITHDRAWAL SERVICE
 * ============================================================================
 * 
 * Handles LINE token withdrawals from off-chain (DB) to on-chain.
 * 
 * FLOW:
 * 1. User requests withdrawal -> backend signs authorization
 * 2. User submits to contract (pays gas)
 * 3. User confirms with txHash -> backend deducts DB balance
 * 
 * ============================================================================
 */

import { sr25519PairFromSeed, blake2AsU8a, sr25519Sign, cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto'
import { hexToU8a, u8aToHex, stringToU8a, u8aConcat, bnToU8a, isHex } from '@polkadot/util'
import { BN } from '@polkadot/util'
import { db } from '@/lib/db'
import { getUserByClerkId } from '@/lib/db-helpers'
import { randomBytes } from 'crypto'

// Configuration
const LINE_DECIMALS = 9
const WITHDRAWAL_EXPIRY_MINUTES = 15
const LINE_TOKEN_PROGRAM_ID = process.env.NEXT_PUBLIC_LINE_TOKEN_PROGRAM_ID || '0x3b058266d408750140a71b4f82d969be2d10052d1a6ff556d2fa52e3f45ac921'

// Domain separator (must match contract)
const WITHDRAWAL_DOMAIN = stringToU8a('LINE_WITHDRAW_V1')

export interface WithdrawalAuthRequest {
    clerkId: string
    amount: number  // Human readable amount (e.g., 100 for 100 LINE)
}

export interface WithdrawalAuth {
    success: boolean
    message: string
    authorization?: {
        amount: string           // Raw amount with decimals
        amountHuman: number      // Human readable
        withdrawalId: string     // 32-byte hex
        expiry: number           // Unix timestamp ms
        signature: string        // 64-byte hex
        contractAddress: string
    }
    error?: string
}

export interface WithdrawalConfirmRequest {
    clerkId: string
    withdrawalId: string
    txHash: string
    amount: number  // Human readable
}

export interface WithdrawalConfirmResult {
    success: boolean
    message: string
    newBalance?: number
    error?: string
}

/**
 * Get backend keypair from seed
 */
async function getBackendKeypair() {
    await cryptoWaitReady()
    const seedHex = process.env.LINE_BACKEND_SIGNER_SEED
    if (!seedHex) {
        throw new Error('LINE_BACKEND_SIGNER_SEED not configured')
    }
    const seed = hexToU8a(seedHex)
    return sr25519PairFromSeed(seed)
}

/**
 * Create withdrawal payload exactly as the contract expects
 */
function createWithdrawalPayload(
    userAddress: string,
    amount: BN,
    withdrawalId: Uint8Array,
    expiry: number
): Uint8Array {
    // 1. Domain separator
    const domain = WITHDRAWAL_DOMAIN

    // 2. User address (32 bytes) - convert from SS58 or hex to raw bytes
    let addressBytes: Uint8Array
    if (isHex(userAddress)) {
        // Already hex format (0x...)
        addressBytes = hexToU8a(userAddress)
    } else {
        // SS58 format (5abc...) - decode to raw public key
        addressBytes = decodeAddress(userAddress)
    }

    console.log('[Withdrawal] Address conversion:', {
        input: userAddress,
        outputHex: u8aToHex(addressBytes),
        outputLength: addressBytes.length
    })

    // 3. Amount as big-endian 32 bytes
    const amountBytes = bnToU8a(amount, { bitLength: 256, isLe: false })

    // 4. Withdrawal ID (32 bytes)
    // 5. Expiry as big-endian 8 bytes
    const expiryBN = new BN(expiry)
    const expiryBytes = bnToU8a(expiryBN, { bitLength: 64, isLe: false })

    return u8aConcat(domain, addressBytes, amountBytes, withdrawalId, expiryBytes)
}

/**
 * Generate unique withdrawal ID
 */
function generateWithdrawalId(): Uint8Array {
    return new Uint8Array(randomBytes(32))
}

export const withdrawalService = {
    /**
     * Request a withdrawal authorization
     * User must have sufficient DB balance
     */
    requestWithdrawal: async (request: WithdrawalAuthRequest): Promise<WithdrawalAuth> => {
        const { clerkId, amount } = request

        // Validate amount
        if (!amount || amount <= 0) {
            return { success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' }
        }

        // Get user
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
        }

        // Check DB balance
        if (user.tokenBalance < amount) {
            return {
                success: false,
                message: `Insufficient balance. You have ${user.tokenBalance} LINE, trying to withdraw ${amount} LINE.`,
                error: 'INSUFFICIENT_BALANCE'
            }
        }

        // Get user's wallet
        const wallet = await db.wallet.findUnique({
            where: { userId: user.id }
        })

        if (!wallet || !wallet.isConnected) {
            return { success: false, message: 'Wallet not connected', error: 'WALLET_NOT_CONNECTED' }
        }

        try {
            // Get backend keypair
            const keypair = await getBackendKeypair()

            // Generate withdrawal ID
            const withdrawalIdBytes = generateWithdrawalId()
            const withdrawalId = u8aToHex(withdrawalIdBytes)

            // Set expiry
            const expiry = Date.now() + (WITHDRAWAL_EXPIRY_MINUTES * 60 * 1000)

            // Convert amount to raw (with decimals)
            const multiplier = new BN(10).pow(new BN(LINE_DECIMALS))
            const amountBN = new BN(amount).mul(multiplier)
            const amountRaw = amountBN.toString()

            console.log('[Withdrawal API] Signing parameters:', {
                walletAddress: wallet.address,
                amountHuman: amount,
                amountRaw: amountRaw,
                withdrawalId: withdrawalId,
                expiry: expiry,
                expiryDate: new Date(expiry).toISOString()
            })

            // Create payload
            const payload = createWithdrawalPayload(
                wallet.address,
                amountBN,
                withdrawalIdBytes,
                expiry
            )

            console.log('[Withdrawal API] Payload hex:', u8aToHex(payload))
            console.log('[Withdrawal API] Payload length:', payload.length)

            // Hash payload using blake2b-256
            const payloadHash = blake2AsU8a(payload, 256)
            console.log('[Withdrawal API] Payload hash:', u8aToHex(payloadHash))

            // Sign the hash
            const signature = sr25519Sign(payloadHash, keypair)
            console.log('[Withdrawal API] Signature:', u8aToHex(signature))
            console.log('[Withdrawal API] Signer pubkey:', u8aToHex(keypair.publicKey))

            // Store pending withdrawal in DB
            await db.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'WITHDRAW',
                    status: 'PENDING',
                    tokenType: 'LINE',
                    amount: amount,
                    fromAddress: wallet.address,
                    toAddress: wallet.address,  // Withdrawal is to same address on-chain
                    txHash: withdrawalId,  // Use withdrawalId as temporary identifier
                }
            })

            return {
                success: true,
                message: 'Withdrawal authorized. Submit to contract within 15 minutes.',
                authorization: {
                    amount: amountRaw,
                    amountHuman: amount,
                    withdrawalId,
                    expiry,
                    signature: u8aToHex(signature),
                    contractAddress: LINE_TOKEN_PROGRAM_ID,
                }
            }
        } catch (error) {
            console.error('Withdrawal authorization error:', error)
            return {
                success: false,
                message: 'Failed to create withdrawal authorization',
                error: 'SIGNING_ERROR'
            }
        }
    },

    /**
     * Confirm a withdrawal after on-chain transaction
     * This deducts the balance from the user's DB account
     */
    confirmWithdrawal: async (request: WithdrawalConfirmRequest): Promise<WithdrawalConfirmResult> => {
        const { clerkId, withdrawalId, txHash, amount } = request

        // Get user
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
        }

        // Get wallet
        const wallet = await db.wallet.findUnique({
            where: { userId: user.id },
            include: { transactions: true }
        })

        if (!wallet) {
            return { success: false, message: 'Wallet not found', error: 'WALLET_NOT_FOUND' }
        }

        // Find pending withdrawal transaction
        const pendingTx = await db.walletTransaction.findFirst({
            where: {
                walletId: wallet.id,
                txHash: withdrawalId,
                status: 'PENDING',
                type: 'WITHDRAW'
            }
        })

        if (!pendingTx) {
            return { success: false, message: 'Pending withdrawal not found', error: 'WITHDRAWAL_NOT_FOUND' }
        }

        // Verify amount matches
        if (pendingTx.amount !== amount) {
            return { success: false, message: 'Amount mismatch', error: 'AMOUNT_MISMATCH' }
        }

        // Double-check balance (in case it changed)
        if (user.tokenBalance < amount) {
            // Mark as failed
            await db.walletTransaction.update({
                where: { id: pendingTx.id },
                data: { status: 'FAILED' }
            })
            return { success: false, message: 'Insufficient balance', error: 'INSUFFICIENT_BALANCE' }
        }

        // Begin transaction - deduct balance and update transaction
        try {
            await db.$transaction([
                // Deduct from user balance
                db.user.update({
                    where: { id: user.id },
                    data: {
                        tokenBalance: { decrement: amount }
                    }
                }),
                // Update transaction with real txHash and confirm
                db.walletTransaction.update({
                    where: { id: pendingTx.id },
                    data: {
                        txHash: txHash,
                        status: 'CONFIRMED',
                        confirmedAt: new Date()
                    }
                }),
                // Create token transaction record
                db.tokenTransaction.create({
                    data: {
                        userId: user.id,
                        type: 'SPEND',
                        amount: -amount,
                        balance: user.tokenBalance - amount,
                        source: 'Withdrawal to on-chain',
                        metadata: { withdrawalId, txHash }
                    }
                })
            ])

            // Get updated balance
            const updatedUser = await db.user.findUnique({
                where: { id: user.id },
                select: { tokenBalance: true }
            })

            return {
                success: true,
                message: `Successfully withdrew ${amount} LINE tokens to on-chain!`,
                newBalance: updatedUser?.tokenBalance || 0
            }
        } catch (error) {
            console.error('Withdrawal confirmation error:', error)
            return { success: false, message: 'Failed to confirm withdrawal', error: 'CONFIRMATION_ERROR' }
        }
    },

    /**
     * Cancel a pending withdrawal (if not yet submitted on-chain)
     */
    cancelWithdrawal: async (clerkId: string, withdrawalId: string): Promise<{ success: boolean; message: string }> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) {
            return { success: false, message: 'User not found' }
        }

        const wallet = await db.wallet.findUnique({
            where: { userId: user.id }
        })

        if (!wallet) {
            return { success: false, message: 'Wallet not found' }
        }

        // Find and cancel pending withdrawal
        const result = await db.walletTransaction.updateMany({
            where: {
                walletId: wallet.id,
                txHash: withdrawalId,
                status: 'PENDING',
                type: 'WITHDRAW'
            },
            data: { status: 'CANCELLED' }
        })

        if (result.count === 0) {
            return { success: false, message: 'Pending withdrawal not found' }
        }

        return { success: true, message: 'Withdrawal cancelled' }
    },

    /**
     * Get pending withdrawals for a user
     */
    getPendingWithdrawals: async (clerkId: string) => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return []

        const wallet = await db.wallet.findUnique({
            where: { userId: user.id }
        })

        if (!wallet) return []

        return db.walletTransaction.findMany({
            where: {
                walletId: wallet.id,
                status: 'PENDING',
                type: 'WITHDRAW'
            },
            orderBy: { createdAt: 'desc' }
        })
    }
}
