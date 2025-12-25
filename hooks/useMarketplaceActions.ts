'use client'

/**
 * ============================================================================
 * USE MARKETPLACE ACTIONS HOOK
 * ============================================================================
 *
 * Thin coordinator hook for marketplace contract transactions.
 * Bridges UI layer with client-side blockchain operations.
 *
 * RESPONSIBILITIES:
 * - Coordinate wallet signing via marketplaceClient
 * - Manage loading/error/success states
 * - Trigger data refresh after successful transactions
 * - Provide type-safe action functions to UI
 *
 * FORBIDDEN:
 * - Business logic (belongs in services)
 * - Direct blockchain interaction (use marketplaceClient)
 * - Complex state management (use Redux for global state)
 *
 * ============================================================================
 */

import { useCallback, useState } from 'react'
import { marketplaceClient, isSubWalletAvailable, TransactionResult } from '@/lib/marketplace/client'

// ============================================================================
// TYPES
// ============================================================================

export type TransactionStatus = 'idle' | 'pending' | 'signing' | 'confirming' | 'success' | 'error'

export interface MarketplaceActionState {
    status: TransactionStatus
    error: string | null
    txHash: string | null
}

export interface UseMarketplaceActionsResult {
    // State
    state: MarketplaceActionState
    isWalletAvailable: boolean

    // Actions
    finalizeAuction: (auctionId: string) => Promise<boolean>
    placeBid: (auctionId: string, amount: bigint) => Promise<boolean>
    claimRefund: () => Promise<boolean>
    claimPayout: () => Promise<boolean>

    // Utilities
    reset: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useMarketplaceActions(
    walletAddress: string | null,
    onSuccess?: () => void
): UseMarketplaceActionsResult {
    const [state, setState] = useState<MarketplaceActionState>({
        status: 'idle',
        error: null,
        txHash: null,
    })

    const reset = useCallback(() => {
        setState({
            status: 'idle',
            error: null,
            txHash: null,
        })
    }, [])

    // Wrap action with common error handling and state management
    const executeAction = useCallback(
        async (
            actionName: string,
            action: () => Promise<TransactionResult>
        ): Promise<boolean> => {
            console.log(`[useMarketplaceActions] executeAction called:`, {
                actionName,
                walletAddress,
                isSubWalletAvailable: isSubWalletAvailable()
            })

            // Pre-flight checks
            if (!walletAddress) {
                console.log('[useMarketplaceActions] FAILED: No wallet address')
                setState({
                    status: 'error',
                    error: 'Please connect your wallet first',
                    txHash: null,
                })
                return false
            }

            if (!isSubWalletAvailable()) {
                console.log('[useMarketplaceActions] FAILED: SubWallet not available')
                setState({
                    status: 'error',
                    error: 'SubWallet not found. Please install the SubWallet browser extension.',
                    txHash: null,
                })
                return false
            }

            // Start transaction
            console.log('[useMarketplaceActions] Starting transaction...')
            setState({
                status: 'signing',
                error: null,
                txHash: null,
            })

            try {
                console.log(`[useMarketplaceActions] Executing ${actionName}...`)

                const result = await action()

                if (result.success) {
                    setState({
                        status: 'success',
                        error: null,
                        txHash: result.blockHash || result.txHash || null,
                    })

                    // Trigger callback for data refresh
                    onSuccess?.()

                    return true
                } else {
                    setState({
                        status: 'error',
                        error: result.error || `${actionName} failed`,
                        txHash: null,
                    })
                    return false
                }
            } catch (error) {
                console.error(`[useMarketplaceActions] ${actionName} error:`, error)

                let errorMessage = 'Transaction failed'
                if (error instanceof Error) {
                    errorMessage = error.message

                    // User cancelled in SubWallet
                    if (errorMessage.includes('Cancelled') || errorMessage.includes('Rejected')) {
                        errorMessage = 'Transaction cancelled by user'
                    }
                }

                setState({
                    status: 'error',
                    error: errorMessage,
                    txHash: null,
                })
                return false
            }
        },
        [walletAddress, onSuccess]
    )

    // ========================================================================
    // ACTIONS
    // ========================================================================

    const finalizeAuction = useCallback(
        async (auctionId: string): Promise<boolean> => {
            return executeAction('FinalizeAuction', () =>
                marketplaceClient.finalizeAuction(auctionId, walletAddress!)
            )
        },
        [executeAction, walletAddress]
    )

    const placeBid = useCallback(
        async (auctionId: string, amount: bigint): Promise<boolean> => {
            // Validate amount
            if (amount <= 0n) {
                setState({
                    status: 'error',
                    error: 'Bid amount must be greater than 0',
                    txHash: null,
                })
                return false
            }

            return executeAction('Bid', () =>
                marketplaceClient.placeBid(auctionId, amount, walletAddress!)
            )
        },
        [executeAction, walletAddress]
    )

    const claimRefund = useCallback(
        async (): Promise<boolean> => {
            return executeAction('ClaimRefund', () =>
                marketplaceClient.claimRefund(walletAddress!)
            )
        },
        [executeAction, walletAddress]
    )

    const claimPayout = useCallback(
        async (): Promise<boolean> => {
            return executeAction('ClaimPayout', () =>
                marketplaceClient.claimPayout(walletAddress!)
            )
        },
        [executeAction, walletAddress]
    )

    return {
        state,
        isWalletAvailable: isSubWalletAvailable(),
        finalizeAuction,
        placeBid,
        claimRefund,
        claimPayout,
        reset,
    }
}
