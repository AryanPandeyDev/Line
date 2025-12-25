/**
 * ============================================================================
 * AUCTION SERVICE
 * ============================================================================
 *
 * Business logic layer for NFT Marketplace auction operations.
 * Encapsulates all blockchain queries and business rules.
 *
 * RESPONSIBILITIES:
 * - Query marketplace contract for auction data
 * - Query NFT contract for metadata URIs
 * - Fetch and parse IPFS metadata
 * - Apply business transformations (formatting, time calculations)
 *
 * FORBIDDEN:
 * - Direct database access (use repositories)
 * - Signing transactions (client-side only)
 * - Storing state (stateless service)
 *
 * ============================================================================
 */

import { CONTRACTS, VARA_RPC } from '@/lib/contracts/config'

// Types for auction data
export interface AuctionData {
    auctionId: string
    nftProgramId: string
    tokenId: string
    seller: string
    startPrice: string      // BigInt as string (base units)
    highestBid: string      // BigInt as string (base units)
    highestBidder: string | null
    endTimeMs: number
    settled: boolean
    extensionWindowMs: number
    minBidIncrement: string // BigInt as string (base units)
}

export interface NFTMetadata {
    name: string
    description: string
    image: string
    creator: string
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
    attributes?: Array<{ trait_type: string; value: string | number }>
    external_url?: string
}

export interface AuctionWithMetadata extends AuctionData {
    metadata: NFTMetadata | null
    metadataError?: string
}

// Simple in-memory cache
interface CacheEntry<T> {
    data: T
    timestamp: number
}

const cache = {
    auctions: null as CacheEntry<AuctionWithMetadata[]> | null,
    AUCTION_TTL: 30_000, // 30 seconds
}

/**
 * Initialize blockchain connection and sails client
 * Uses dynamic imports to avoid SSR issues
 */
async function createSailsClient(idlPath: string, programId: string) {
    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')
    const fs = await import('fs')
    const path = await import('path')

    // Connect to Vara
    const api = await GearApi.create({ providerAddress: VARA_RPC })

    // Load IDL
    const fullPath = path.join(process.cwd(), 'public', 'contracts', idlPath)
    const idl = fs.readFileSync(fullPath, 'utf-8')

    // Initialize Sails
    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(programId as `0x${string}`)

    return { api, sails }
}

/**
 * Cleanup blockchain connection
 */
async function disconnect(api: { disconnect: () => Promise<void> }) {
    try {
        await api.disconnect()
    } catch (error) {
        console.warn('[AuctionService] Disconnect warning:', error)
    }
}

// ============================================================================
// PUBLIC SERVICE METHODS
// ============================================================================

export const auctionService = {
    /**
     * Fetch all active auctions from the marketplace contract
     *
     * @param useCache - Whether to use cached data if available (default: true)
     * @returns Array of auctions with metadata
     */
    getActiveAuctions: async (useCache = true): Promise<AuctionWithMetadata[]> => {
        // Check config
        if (!CONTRACTS.MARKETPLACE || !CONTRACTS.NFT) {
            throw new Error('Marketplace or NFT contract not configured. Check environment variables.')
        }

        // Check cache
        if (useCache && cache.auctions) {
            const age = Date.now() - cache.auctions.timestamp
            if (age < cache.AUCTION_TTL) {
                return cache.auctions.data
            }
        }

        const { api, sails: marketplaceSails } = await createSailsClient(
            'marketplace.idl',
            CONTRACTS.MARKETPLACE
        )

        try {
            const { u8aToHex, hexToU8a, u8aToBn } = await import('@polkadot/util')

            // Get next auction ID to determine count
            const nextIdQuery = marketplaceSails.services.Marketplace.queries.NextAuctionId()
            const payload = (nextIdQuery as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: CONTRACTS.MARKETPLACE as `0x${string}`,
                destination: CONTRACTS.MARKETPLACE as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) {
                return []
            }

            const replyPayload = hexToU8a(result.payload.toHex())
            const nextAuctionId = Number(
                replyPayload.length >= 8
                    ? u8aToBn(replyPayload.slice(-8), { isLe: true })
                    : 0
            )

            // Fetch each auction
            const auctions: AuctionWithMetadata[] = []

            for (let id = 1; id < nextAuctionId; id++) {
                try {
                    const auctionData = await auctionService.getAuctionById(String(id))
                    if (auctionData && !auctionData.settled) {
                        auctions.push(auctionData)
                    }
                } catch (error) {
                    console.warn(`[AuctionService] Failed to fetch auction ${id}:`, error)
                }
            }

            // Update cache
            cache.auctions = { data: auctions, timestamp: Date.now() }

            return auctions
        } finally {
            await disconnect(api)
        }
    },

    /**
     * Fetch a single auction by ID
     *
     * @param auctionId - The auction ID
     * @returns Auction data with metadata, or null if not found
     */
    getAuctionById: async (auctionId: string): Promise<AuctionWithMetadata | null> => {
        if (!CONTRACTS.MARKETPLACE) {
            throw new Error('Marketplace contract not configured')
        }

        const { api, sails } = await createSailsClient('marketplace.idl', CONTRACTS.MARKETPLACE)

        try {
            const { u8aToHex } = await import('@polkadot/util')

            const query = sails.services.Marketplace.queries.GetAuction(BigInt(auctionId))
            const payload = (query as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: CONTRACTS.MARKETPLACE as `0x${string}`,
                destination: CONTRACTS.MARKETPLACE as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) {
                return null
            }

            // Parse auction data from SCALE response
            // For now, return placeholder - actual parsing would decode SCALE
            const auctionData: AuctionWithMetadata = {
                auctionId,
                nftProgramId: CONTRACTS.NFT || '',
                tokenId: auctionId,
                seller: '',
                startPrice: '0',
                highestBid: '0',
                highestBidder: null,
                endTimeMs: Date.now() + 86400000,
                settled: false,
                extensionWindowMs: 300000,
                minBidIncrement: '1000000000',
                metadata: null,
            }

            // Try to fetch NFT metadata
            try {
                auctionData.metadata = await auctionService.getNftMetadata(
                    auctionData.nftProgramId,
                    auctionData.tokenId
                )
            } catch (metadataError) {
                auctionData.metadataError = (metadataError as Error).message
            }

            return auctionData
        } finally {
            await disconnect(api)
        }
    },

    /**
     * Get pending refund amount for a user
     *
     * @param userAddress - User's wallet address (hex or SS58)
     * @returns Pending refund amount as BigInt string
     */
    getPendingRefund: async (userAddress: string): Promise<string> => {
        return auctionService._getPendingAmount(userAddress, 'GetPendingRefund')
    },

    /**
     * Get pending payout amount for a user (seller)
     *
     * @param userAddress - User's wallet address (hex or SS58)
     * @returns Pending payout amount as BigInt string
     */
    getPendingPayout: async (userAddress: string): Promise<string> => {
        return auctionService._getPendingAmount(userAddress, 'GetPendingPayout')
    },

    /**
     * Fetch NFT metadata from IPFS or HTTP
     *
     * @param nftProgramId - NFT contract program ID
     * @param tokenId - Token ID
     * @returns Parsed NFT metadata
     */
    getNftMetadata: async (nftProgramId: string, tokenId: string): Promise<NFTMetadata | null> => {
        if (!nftProgramId) return null

        const { api, sails } = await createSailsClient('nft.idl', nftProgramId)

        try {
            const { u8aToHex } = await import('@polkadot/util')

            const query = sails.services.Nft.queries.TokenUri(BigInt(tokenId))
            const payload = (query as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: nftProgramId as `0x${string}`,
                destination: nftProgramId as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) return null

            // Parse token URI from response and fetch metadata
            // This would decode the SCALE response to get the URI
            // Then fetch and parse the JSON metadata
            // For now, return null - actual implementation needs SCALE decoding
            return null
        } finally {
            await disconnect(api)
        }
    },

    /**
     * Invalidate auction cache
     */
    invalidateCache: () => {
        cache.auctions = null
    },

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Internal helper to get pending amount (refund or payout)
     */
    _getPendingAmount: async (userAddress: string, queryName: string): Promise<string> => {
        if (!CONTRACTS.MARKETPLACE) {
            throw new Error('Marketplace contract not configured')
        }

        // Normalize address to hex
        let hexAddress = userAddress
        if (!/^0x[a-fA-F0-9]{64}$/.test(userAddress)) {
            const { decodeAddress } = await import('@polkadot/util-crypto')
            const { u8aToHex } = await import('@polkadot/util')
            const publicKey = decodeAddress(userAddress)
            hexAddress = u8aToHex(publicKey)
        }

        const { api, sails } = await createSailsClient('marketplace.idl', CONTRACTS.MARKETPLACE)

        try {
            const { u8aToHex, hexToU8a, u8aToBn } = await import('@polkadot/util')

            const queryFn = sails.services.Marketplace.queries[queryName]
            if (!queryFn) {
                throw new Error(`Query ${queryName} not found`)
            }

            const query = queryFn(hexAddress as `0x${string}`)
            const payload = (query as unknown as { _payload: Uint8Array })._payload

            const result = await api.message.calculateReply({
                origin: hexAddress as `0x${string}`,
                destination: CONTRACTS.MARKETPLACE as `0x${string}`,
                payload: u8aToHex(payload) as `0x${string}`,
                value: 0,
                gasLimit: api.blockGasLimit.toBigInt(),
            })

            if (!result?.payload) return '0'

            // Decode U256 from reply (last 32 bytes)
            const replyPayload = hexToU8a(result.payload.toHex())
            if (replyPayload.length >= 32) {
                const amountBytes = replyPayload.slice(-32)
                return u8aToBn(amountBytes, { isLe: true }).toString()
            }

            return '0'
        } finally {
            await disconnect(api)
        }
    },
}
