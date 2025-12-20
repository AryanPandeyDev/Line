/**
 * POST /api/withdrawals/authorize
 * 
 * Request a withdrawal authorization from the backend.
 * Returns signed data that user can submit to the LINE token contract.
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
        const { amount } = body

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            )
        }

        const result = await withdrawalService.requestWithdrawal({
            clerkId,
            amount
        })

        if (!result.success) {
            return NextResponse.json(result, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Withdrawal authorization error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
