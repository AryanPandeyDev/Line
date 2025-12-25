'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { POLLING } from '@/lib/contracts/config'
import { parseLineRaw } from '@/lib/contracts/decimals'
import {
    fetchActiveAuctions,
    fetchPendingRefund,
    fetchPendingPayout,
    selectPendingRefund,
    selectPendingPayout,
    selectPendingTx,
    setPendingTx,
} from '@/lib/redux/slices/auctions-slice'
import type { AppDispatch, RootState } from '@/lib/redux/store'
import { usePolling } from './usePolling'

/**
 * =============================================================================
 * USE AUCTIONS HOOK
 * =============================================================================
 *
 * Thin coordinator hook between Redux state and UI.
 *
 * RESPONSIBILITIES:
 * - Coordinate polling for auction data
 * - Expose Redux state to components
 * - Dispatch actions
 *
 * ARCHITECTURE:
 * - Business logic lives in services (auctionService, lineTokenService)
 * - This hook is a thin coordinator, not a logic container
 * - API routes call services; this hook calls API routes via Redux thunks
 */

interface UseAuctionsOptions {
    walletAddress?: string | null
    autoFetch?: boolean
}

interface UseAuctionsResult {
    // State
    isLoading: boolean
    error: string | null
    pendingRefund: bigint
    pendingPayout: bigint
    hasPendingItems: boolean
    pendingTx: ReturnType<typeof selectPendingTx>

    // Actions
    refreshAuctions: () => Promise<void>
    refreshPending: () => Promise<void>
    clearPendingTx: () => void
}

export function useAuctions(options: UseAuctionsOptions = {}): UseAuctionsResult {
    const { walletAddress, autoFetch = true } = options
    const dispatch = useDispatch<AppDispatch>()

    // Redux state
    const isLoading = useSelector((state: RootState) => state.auctions.isLoading)
    const error = useSelector((state: RootState) => state.auctions.error)
    const pendingRefund = useSelector(selectPendingRefund)
    const pendingPayout = useSelector(selectPendingPayout)
    const pendingTx = useSelector(selectPendingTx)

    // Fetch auctions
    const refreshAuctions = useCallback(async () => {
        await dispatch(fetchActiveAuctions())
    }, [dispatch])

    // Fetch pending refund/payout
    const refreshPending = useCallback(async () => {
        if (!walletAddress) return
        await dispatch(fetchPendingRefund(walletAddress))
        await dispatch(fetchPendingPayout(walletAddress))
    }, [dispatch, walletAddress])

    // Poll auctions list
    usePolling(refreshAuctions, POLLING.AUCTION_LIST, autoFetch)

    // Poll pending items when wallet connected
    usePolling(refreshPending, POLLING.WALLET_STATE, !!walletAddress && autoFetch)

    // Initial fetch of pending items
    useEffect(() => {
        if (walletAddress && autoFetch) {
            refreshPending()
        }
    }, [walletAddress, autoFetch, refreshPending])

    // Clear pending transaction
    const clearPendingTx = useCallback(() => {
        dispatch(setPendingTx(null))
    }, [dispatch])

    return {
        isLoading,
        error,
        pendingRefund,
        pendingPayout,
        hasPendingItems: pendingRefund > 0n || pendingPayout > 0n,
        pendingTx,
        refreshAuctions,
        refreshPending,
        clearPendingTx,
    }
}
