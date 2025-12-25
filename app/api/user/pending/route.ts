/**
 * =============================================================================
 * USER PENDING ITEMS API
 * =============================================================================
 *
 * GET /api/user/pending?type=refund|payout&address=0x...
 *
 * Returns pending refund or payout amount from Marketplace contract.
 * Amount returned as string (BigInt serialized).
 *
 * NO MOCK DATA. If contract fails, returns 0.
 */

import { NextRequest, NextResponse } from 'next/server'
import { marketplaceService } from '@/src/lib/services/marketplaceService'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const address = searchParams.get('address')

        // Validate parameters
        if (!type || !['refund', 'payout'].includes(type)) {
            return NextResponse.json(
                { success: false, error: "Invalid 'type'. Must be 'refund' or 'payout'." },
                { status: 400 }
            )
        }

        if (!address) {
            return NextResponse.json(
                { success: false, error: "Missing 'address' parameter." },
                { status: 400 }
            )
        }

        // Check if contract is configured
        if (!marketplaceService.isConfigured()) {
            return NextResponse.json({
                success: true,
                type,
                address,
                amount: '0',
                message: 'Contract not configured',
            })
        }

        // Query contract
        const amount = type === 'refund'
            ? await marketplaceService.getPendingRefund(address)
            : await marketplaceService.getPendingPayout(address)

        return NextResponse.json({
            success: true,
            type,
            address,
            amount: amount.toString(), // BigInt → string for JSON
        })
    } catch (error) {
        console.error('[/api/user/pending] Error:', error)

        // Return 0 on error, not mock data
        return NextResponse.json({
            success: false,
            amount: '0',
            error: error instanceof Error ? error.message : 'Failed to fetch pending items',
        })
    }
}
