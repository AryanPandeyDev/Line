/**
 * ============================================================================
 * NFT SERVICE
 * ============================================================================
 * 
 * Business logic for NFT marketplace operations.
 * 
 * DOMAIN SCOPE:
 * - NFT listing retrieval
 * - Bidding
 * - Likes
 * 
 * ALLOWED:
 * - Call nftRepo
 * - Use nftLogic helpers
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * 
 * ============================================================================
 */

import { nftRepo } from '@/src/lib/repositories/nftRepo'
import { getUserByClerkId } from '@/lib/db-helpers'

/**
 * Format time left for auction
 */
function formatTimeLeft(expiresAt: Date): string {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}hrs ${minutes}min`
    if (hours > 0) return `${hours}hrs ${minutes}min`
    return `${minutes}min`
}

export interface NFTResponse {
    id: string
    name: string
    creator: string
    image: string
    currentBid: number
    timeLeft: string
    likes: number
    rarity: string
    description: string | null
}

export interface NFTActionResult {
    success: boolean
    message: string
    nftId?: string
    newBid?: number
}

export const nftService = {
    /**
     * Get all NFTs with optional filters
     */
    getNFTs: async (options?: {
        rarity?: string
        sortBy?: string
        category?: string
    }): Promise<NFTResponse[]> => {
        const nfts = await nftRepo.findAll({
            rarity: options?.rarity,
            sortBy: options?.sortBy,
        })

        return nfts.map((nft) => ({
            id: nft.id,
            name: nft.name,
            creator: nft.creatorName,
            image: nft.image,
            currentBid: nft.activeListing?.price || nft.currentPrice || 0,
            timeLeft: nft.activeListing?.expiresAt
                ? formatTimeLeft(nft.activeListing.expiresAt)
                : 'No active listing',
            likes: nft.likes,
            rarity: nft.rarity.charAt(0) + nft.rarity.slice(1).toLowerCase(),
            description: nft.description,
        }))
    },

    /**
     * Place a bid on an NFT
     */
    placeBid: async (clerkId: string, nftId: string, bidAmount: number): Promise<NFTActionResult> => {
        const user = await getUserByClerkId(clerkId)
        if (!user) return { success: false, message: 'User not found' }

        const nft = await nftRepo.findByIdWithListing(nftId)
        if (!nft) return { success: false, message: 'NFT not found' }

        const activeListing = nft.listings[0]
        if (!activeListing) return { success: false, message: 'No active listing' }

        const currentHighestBid = await nftRepo.getHighestBid(activeListing.id)
        const minBid = currentHighestBid?.amount || activeListing.price

        if (bidAmount <= minBid) {
            return { success: false, message: `Bid must be higher than ${minBid}` }
        }

        // Create bid
        await nftRepo.createBid({
            listingId: activeListing.id,
            nftId: nft.id,
            bidderId: user.id,
            amount: bidAmount,
            tokenType: 'LINE',
        })

        // Mark previous winning bid as not winning
        if (currentHighestBid) {
            await nftRepo.markBidNotWinning(currentHighestBid.id)
        }

        // Update NFT current price
        await nftRepo.updateCurrentPrice(nftId, bidAmount)

        return {
            success: true,
            message: `Bid of ${bidAmount} LINE placed successfully!`,
            nftId,
            newBid: bidAmount,
        }
    },

    /**
     * Like an NFT
     */
    likeNFT: async (nftId: string): Promise<NFTActionResult> => {
        await nftRepo.incrementLikes(nftId)
        return { success: true, message: 'NFT liked!' }
    },
}
