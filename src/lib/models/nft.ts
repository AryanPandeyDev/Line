/**
 * ============================================================================
 * NFT TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for NFT marketplace.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * NFT rarity levels
 */
export type NFTRarity =
    | 'COMMON'
    | 'RARE'
    | 'EPIC'
    | 'LEGENDARY'
    | 'MYTHIC'

/**
 * Listing status
 */
export type ListingStatus =
    | 'LISTED'
    | 'SOLD'
    | 'CANCELLED'
    | 'EXPIRED'

/**
 * Token type for NFT transactions
 */
export type NFTTokenType = 'VARA' | 'LINE'

/**
 * NFT entity
 */
export interface NFT {
    id: string
    tokenId: string
    contractAddress: string
    name: string
    description: string | null
    image: string
    rarity: NFTRarity
    collection: string | null
    attributes: Record<string, unknown>[]
}

/**
 * Owned NFT with acquisition info
 */
export interface OwnedNFT extends NFT {
    acquiredAt: Date
    acquiredFor: number
    isFavorite: boolean
    isListed: boolean
}

/**
 * NFT marketplace listing
 */
export interface NFTListing {
    id: string
    nft: NFT
    sellerId: string
    sellerUsername: string
    sellerAvatarUrl: string | null
    price: number
    tokenType: NFTTokenType
    status: ListingStatus
    listedAt: Date
    expiresAt: Date | null
    highestBid: number | null
    bidCount: number
}

/**
 * Bid on an NFT listing
 */
export interface NFTBid {
    id: string
    listingId: string
    bidderId: string
    bidderUsername: string
    amount: number
    tokenType: NFTTokenType
    isWinning: boolean
    createdAt: Date
}

/**
 * Marketplace response
 */
export interface MarketplaceResponse {
    listings: NFTListing[]
    total: number
    hasMore: boolean
    filters: {
        rarities: NFTRarity[]
        collections: string[]
        priceRange: { min: number; max: number }
    }
}

/**
 * Purchase result
 */
export interface NFTPurchaseResult {
    success: boolean
    nftId: string
    pricePaid: number
    fee: number
    newOwner: string
}

/**
 * Create listing input
 */
export interface CreateListingInput {
    nftId: string
    price: number
    tokenType: NFTTokenType
    expiresInDays?: number
}
