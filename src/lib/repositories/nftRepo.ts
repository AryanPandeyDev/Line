/**
 * ============================================================================
 * NFT REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma NFT, NFTListing, and NFTBid models.
 * 
 * PRISMA MODELS ACCESSED:
 * - NFT (primary)
 * - NFTListing (marketplace listings)
 * - NFTBid (bids on listings)
 * - UserNFT (ownership)
 * 
 * FORBIDDEN:
 * - Price validation
 * - Fee calculations
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { TokenType } from '@/lib/generated/prisma'

export interface NFTWithListing {
    id: string
    name: string
    creatorName: string
    image: string
    currentPrice: number | null
    likes: number
    rarity: string
    description: string | null
    activeListing: {
        price: number
        expiresAt: Date | null
    } | null
}

export const nftRepo = {
    /**
     * Find all NFTs with optional filters
     */
    findAll: async (options?: {
        rarity?: string
        sortBy?: string
        limit?: number
    }): Promise<NFTWithListing[]> => {
        const where: Record<string, unknown> = {}
        if (options?.rarity && options.rarity !== 'all') {
            where.rarity = options.rarity.toUpperCase()
        }

        let orderBy: Record<string, string>[] = [{ likes: 'desc' }]
        if (options?.sortBy === 'price_high') {
            orderBy = [{ currentPrice: 'desc' }]
        } else if (options?.sortBy === 'price_low') {
            orderBy = [{ currentPrice: 'asc' }]
        } else if (options?.sortBy === 'newest') {
            orderBy = [{ createdAt: 'desc' }]
        }

        const nfts = await db.nFT.findMany({
            where,
            orderBy,
            include: {
                listings: {
                    where: { status: 'LISTED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            take: options?.limit || 50,
        })

        return nfts.map((nft) => ({
            id: nft.id,
            name: nft.name,
            creatorName: nft.creatorName,
            image: nft.image,
            currentPrice: nft.currentPrice,
            likes: nft.likes,
            rarity: nft.rarity,
            description: nft.description,
            activeListing: nft.listings[0]
                ? { price: nft.listings[0].price, expiresAt: nft.listings[0].expiresAt }
                : null,
        }))
    },

    /**
     * Find NFT by ID with active listing
     */
    findByIdWithListing: async (id: string) => {
        return db.nFT.findUnique({
            where: { id },
            include: {
                listings: {
                    where: { status: 'LISTED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        })
    },

    /**
     * Get highest bid for a listing
     */
    getHighestBid: async (listingId: string) => {
        return db.nFTBid.findFirst({
            where: { listingId },
            orderBy: { amount: 'desc' },
        })
    },

    /**
     * Create a bid
     */
    createBid: async (data: {
        listingId: string
        nftId: string
        bidderId: string
        amount: number
        tokenType: TokenType
    }) => {
        return db.nFTBid.create({
            data: {
                listingId: data.listingId,
                nftId: data.nftId,
                bidderId: data.bidderId,
                amount: data.amount,
                tokenType: data.tokenType,
                isWinning: true,
            },
        })
    },

    /**
     * Mark previous winning bid as not winning
     */
    markBidNotWinning: async (bidId: string) => {
        return db.nFTBid.update({
            where: { id: bidId },
            data: { isWinning: false },
        })
    },

    /**
     * Update NFT current price
     */
    updateCurrentPrice: async (nftId: string, price: number) => {
        return db.nFT.update({
            where: { id: nftId },
            data: { currentPrice: price },
        })
    },

    /**
     * Increment NFT likes
     */
    incrementLikes: async (nftId: string) => {
        return db.nFT.update({
            where: { id: nftId },
            data: { likes: { increment: 1 } },
        })
    },
}
