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

        // Convert SS58 to hex if needed (contract requires hex format)
        let addressHex = address
        const isHexAddress = /^0x[a-fA-F0-9]{64}$/.test(address)

        if (!isHexAddress) {
            try {
                const { decodeAddress } = await import('@polkadot/util-crypto')
                const { u8aToHex } = await import('@polkadot/util')
                const publicKey = decodeAddress(address)
                addressHex = u8aToHex(publicKey)
                console.log('[/api/user/pending] Converted SS58 to hex:', addressHex)
            } catch (err) {
                console.error('[/api/user/pending] Failed to decode SS58 address:', err)
                return NextResponse.json(
                    { success: false, error: 'Invalid address format' },
                    { status: 400 }
                )
            }
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

        // Query contract with hex address
        const amount = type === 'refund'
            ? await marketplaceService.getPendingRefund(addressHex)
            : await marketplaceService.getPendingPayout(addressHex)

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
