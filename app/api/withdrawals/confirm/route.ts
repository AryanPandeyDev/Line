/**
 * POST /api/withdrawals/confirm
 * 
 * Confirm a withdrawal after on-chain transaction is complete.
 * Deducts the balance from the user's DB account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { withdrawalService } from '@/src/lib/services/withdrawalService'

export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth()

        if (!clerkId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { withdrawalId, txHash, amount } = body

        if (!withdrawalId || !txHash || !amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: withdrawalId, txHash, amount' },
                { status: 400 }
            )
        }

        const result = await withdrawalService.confirmWithdrawal({
            clerkId,
            withdrawalId,
            txHash,
            amount
        })

        if (!result.success) {
            return NextResponse.json(result, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Withdrawal confirmation error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
