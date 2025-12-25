'use client'

import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useToast } from '@/components/ui/use-toast'
import { selectPendingTx, setPendingTx } from '@/lib/redux/slices/auctions-slice'
import type { RootState, AppDispatch } from '@/lib/redux/store'

/**
 * =============================================================================
 * TRANSACTION TOAST HOOK
 * =============================================================================
 *
 * Automatically shows toast notifications for transaction state changes.
 * Subscribes to Redux pendingTx state and displays appropriate messages.
 */

export function useTransactionToasts() {
    const dispatch = useDispatch<AppDispatch>()
    const pendingTx = useSelector((state: RootState) => state.auctions.pendingTx)
    const { toast } = useToast()

    useEffect(() => {
        if (!pendingTx) return

        switch (pendingTx.state) {
            case 'building':
                toast({
                    title: '🔧 Preparing Transaction',
                    description: pendingTx.message || 'Building transaction...',
                })
                break

            case 'signing':
                toast({
                    title: '✍️ Signature Required',
                    description: pendingTx.message || 'Please approve in your wallet',
                })
                break

            case 'pending':
                toast({
                    title: '⏳ Transaction Pending',
                    description: pendingTx.txHash
                        ? `TX: ${pendingTx.txHash.slice(0, 10)}...`
                        : 'Waiting for confirmation...',
                })
                break

            case 'confirmed':
                toast({
                    title: '✅ Transaction Confirmed',
                    description: pendingTx.message || 'Transaction completed successfully!',
                    variant: 'default',
                })
                // Clear after showing success
                setTimeout(() => dispatch(setPendingTx(null)), 3000)
                break

            case 'failed':
                toast({
                    title: '❌ Transaction Failed',
                    description: pendingTx.error || 'Something went wrong',
                    variant: 'destructive',
                })
                // Clear after showing error
                setTimeout(() => dispatch(setPendingTx(null)), 5000)
                break
        }
    }, [pendingTx, toast, dispatch])

    return null
}

/**
 * Component version for including in layout
 */
export function TransactionToastProvider({ children }: { children: React.ReactNode }) {
    useTransactionToasts()
    return <>{ children } </>
}
