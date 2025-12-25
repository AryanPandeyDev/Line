/**
 * =============================================================================
 * AUCTIONS API ROUTE
 * =============================================================================
 *
 * GET /api/auctions - Fetch all unsettled auctions from Marketplace contract
 *
 * RETURNS:
 * - All auctions where settled === false
 * - Includes both active AND ended-but-not-finalized
 * - isEnded flag indicates if auction has ended
 * - All amounts as strings (BigInt serialized)
 *
 * NO MOCK DATA. If contract fails, returns empty array.
 */

import { NextResponse } from 'next/server'
import { marketplaceService, type SerializedAuction } from '@/src/lib/services/marketplaceService'
import { nftTokenService, type NFTMetadata } from '@/src/lib/services/nftTokenService'

export interface AuctionWithMetadata extends SerializedAuction {
    metadata: NFTMetadata | null
}

export async function GET() {
    try {
        // Check if contract is configured
        if (!marketplaceService.isConfigured()) {
            console.warn('[/api/auctions] Marketplace contract not configured')
            return NextResponse.json({
                success: true,
                auctions: [],
                count: 0,
                message: 'Contract not configured',
            })
        }

        // Fetch all unsettled auctions from contract
        const onChainAuctions = await marketplaceService.getAllUnsettledAuctions()

        // Serialize and enrich with metadata
        const auctionsWithMetadata: AuctionWithMetadata[] = await Promise.all(
            onChainAuctions.map(async (auction) => {
                const serialized = marketplaceService.serializeAuction(auction)

                // Attempt to fetch NFT metadata (may fail, that's ok)
                let metadata: NFTMetadata | null = null
                try {
                    metadata = await nftTokenService.getTokenMetadata(
                        auction.tokenId,
                        auction.nftProgramId
                    )
                } catch (error) {
                    console.warn(`[/api/auctions] Metadata fetch failed for token ${auction.tokenId}`)
                }

                return {
                    ...serialized,
                    metadata,
                }
            })
        )

        return NextResponse.json({
            success: true,
            auctions: auctionsWithMetadata,
            count: auctionsWithMetadata.length,
            timestamp: Date.now(),
        })
    } catch (error) {
        console.error('[/api/auctions] Error:', error)

        // Return empty array on error, not mock data
        return NextResponse.json({
            success: false,
            auctions: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Failed to fetch auctions',
        })
    }
}
