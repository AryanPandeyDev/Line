/**
 * ============================================================================
 * MARKETPLACE SERVICE
 * ============================================================================
 *
 * Pure on-chain queries for the Marketplace contract using Sails.
 * Properly decodes SCALE-encoded auction data.
 *
 * ============================================================================
 */

import { CONTRACTS, VARA_RPC } from '@/lib/contracts/config'

const MARKETPLACE_PROGRAM_ID = CONTRACTS.MARKETPLACE
const NFT_PROGRAM_ID = CONTRACTS.NFT

// =============================================================================
// TYPES
// =============================================================================

export interface OnChainAuction {
    auctionId: bigint
    nftProgramId: string
    tokenId: bigint
    seller: string
    startPrice: bigint
    highestBid: bigint
    highestBidder: string | null
    endTimeMs: bigint
    settled: boolean
    extensionWindowMs: bigint
    minBidIncrement: bigint
    isEnded: boolean
}

export interface SerializedAuction {
    auctionId: string
    nftProgramId: string
    tokenId: string
    seller: string
    startPrice: string
    highestBid: string
    highestBidder: string | null
    endTimeMs: string
    settled: boolean
    extensionWindowMs: string
    minBidIncrement: string
    isEnded: boolean
}

// =============================================================================
// SCALE DECODER HELPERS
// =============================================================================

/**
 * Read u64 (8 bytes, little-endian) from buffer
 */
function readU64(bytes: Uint8Array, offset: number): bigint {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8)
    return view.getBigUint64(0, true)
}

/**
 * Read u256 (32 bytes, little-endian) from buffer
 */
function readU256(bytes: Uint8Array, offset: number): bigint {
    let result = 0n
    for (let i = 31; i >= 0; i--) {
        result = (result << 8n) | BigInt(bytes[offset + i])
    }
    return result
}

/**
 * Read actor_id (32 bytes) as hex string
 */
function readActorId(bytes: Uint8Array, offset: number): string {
    const slice = bytes.slice(offset, offset + 32)
    return '0x' + Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Read bool (1 byte)
 */
function readBool(bytes: Uint8Array, offset: number): boolean {
    return bytes[offset] !== 0
}

/**
 * Decode Auction struct from SCALE bytes
 * 
 * Struct layout:
 *   nft_program_id: actor_id (32 bytes)
 *   token_id: u64 (8 bytes)
 *   seller: actor_id (32 bytes)
 *   start_price: u256 (32 bytes)
 *   highest_bid: u256 (32 bytes)
 *   highest_bidder: opt actor_id (1 + 32 bytes)
 *   end_time_ms: u64 (8 bytes)
 *   settled: bool (1 byte)
 *   extension_window_ms: u64 (8 bytes)
 *   min_bid_increment: u256 (32 bytes)
 */
function decodeAuction(bytes: Uint8Array, auctionId: bigint): OnChainAuction | null {
    // Minimum size for Option<Auction> with None highest_bidder
    // 32 + 8 + 32 + 32 + 32 + 1 + 8 + 1 + 8 + 32 = 186 bytes (plus response prefix)

    // Find the start of auction data (after response prefix and Option discriminant)
    // Response format: "Marketplace/GetAuction" prefix + Option<Auction>

    // Look for 0x01 (Some) followed by valid data
    // The prefix "Marketplace/GetAuction" is about 24 bytes
    let offset = 0

    // Skip the service/method prefix - find where struct data begins
    // In Sails responses, after the method name there's the return value
    // For Option<T>, it's: 0x00 (None) or 0x01 (Some) + T

    // Search for the pattern: the auction struct should have recognizable data
    // The nft_program_id should start with valid bytes

    // Try different offsets to find the valid auction data
    const prefixLen = "Marketplace/GetAuction".length

    // Check if this is a None response
    for (let i = prefixLen; i < bytes.length; i++) {
        if (bytes[i] === 0x00) {
            // Could be None - check if rest is just zeros or minimal
            if (i + 1 >= bytes.length || bytes.slice(i + 1).every(b => b === 0)) {
                console.log('[SCALE] GetAuction returned None at offset', i)
                return null
            }
        }
        if (bytes[i] === 0x01) {
            // Found Some discriminant, auction data starts after this
            offset = i + 1
            break
        }
    }

    // Verify we have enough bytes
    const minSize = 32 + 8 + 32 + 32 + 32 + 1 + 8 + 1 + 8 + 32 // 186 bytes minimum
    if (bytes.length < offset + minSize) {
        console.log('[SCALE] Not enough bytes for auction struct. Have:', bytes.length - offset, 'Need:', minSize)
        return null
    }

    let pos = offset

    // Read fields in order
    const nftProgramId = readActorId(bytes, pos)
    pos += 32

    const tokenId = readU64(bytes, pos)
    pos += 8

    const seller = readActorId(bytes, pos)
    pos += 32

    const startPrice = readU256(bytes, pos)
    pos += 32

    const highestBid = readU256(bytes, pos)
    pos += 32

    // highest_bidder: Option<actor_id>
    const hasBidder = bytes[pos] === 0x01
    pos += 1

    let highestBidder: string | null = null
    if (hasBidder) {
        highestBidder = readActorId(bytes, pos)
        pos += 32
    }

    const endTimeMs = readU64(bytes, pos)
    pos += 8

    const settled = readBool(bytes, pos)
    pos += 1

    const extensionWindowMs = readU64(bytes, pos)
    pos += 8

    const minBidIncrement = readU256(bytes, pos)

    const now = BigInt(Date.now())

    console.log('[SCALE] Decoded auction:', {
        auctionId: auctionId.toString(),
        nftProgramId,
        tokenId: tokenId.toString(),
        seller,
        startPrice: startPrice.toString(),
        highestBid: highestBid.toString(),
        endTimeMs: endTimeMs.toString(),
        settled,
    })

    return {
        auctionId,
        nftProgramId,
        tokenId,
        seller,
        startPrice,
        highestBid,
        highestBidder,
        endTimeMs,
        settled,
        extensionWindowMs,
        minBidIncrement,
        isEnded: now >= endTimeMs,
    }
}

// =============================================================================
// SAILS CLIENT HELPER
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createMarketplaceSails(): Promise<{ api: any; sails: any }> {
    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')
    const fs = await import('fs')
    const path = await import('path')

    console.log('[MarketplaceService] Connecting to:', VARA_RPC)
    const api = await GearApi.create({ providerAddress: VARA_RPC })
    console.log('[MarketplaceService] Connected!')

    const idlPath = path.join(process.cwd(), 'public', 'contracts', 'marketplace.idl')
    const idl = fs.readFileSync(idlPath, 'utf-8')

    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(MARKETPLACE_PROGRAM_ID as `0x${string}`)

    return { api, sails }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function disconnect(api: any) {
    try {
        await api.disconnect()
    } catch {
        // Ignore
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeQuery(api: any, query: any, origin: string): Promise<Uint8Array | null> {
    const { u8aToHex, hexToU8a } = await import('@polkadot/util')

    const payload = query._payload || query.payload
    if (!payload) {
        console.error('[MarketplaceService] No payload in query')
        return null
    }

    const payloadHex = u8aToHex(payload)

    const calcResult = await api.message.calculateReply({
        origin: origin as `0x${string}`,
        destination: MARKETPLACE_PROGRAM_ID as `0x${string}`,
        payload: payloadHex as `0x${string}`,
        value: 0,
        gasLimit: api.blockGasLimit.toBigInt(),
    })

    if (!calcResult?.payload) {
        return null
    }

    return hexToU8a(calcResult.payload.toHex())
}

// =============================================================================
// SERVICE
// =============================================================================

export const marketplaceService = {
    isConfigured(): boolean {
        return !!MARKETPLACE_PROGRAM_ID
    },

    async getNextAuctionId(): Promise<bigint> {
        if (!MARKETPLACE_PROGRAM_ID) {
            return 0n
        }

        const { api, sails } = await createMarketplaceSails()

        try {
            const query = sails.services.Marketplace.queries.NextAuctionId()
            const replyBytes = await executeQuery(api, query, MARKETPLACE_PROGRAM_ID)

            if (!replyBytes || replyBytes.length < 8) {
                return 0n
            }

            // NextAuctionId returns u64 - last 8 bytes
            const result = readU64(replyBytes, replyBytes.length - 8)
            console.log('[MarketplaceService] NextAuctionId:', result)
            return result
        } catch (error) {
            console.error('[MarketplaceService] getNextAuctionId error:', error)
            return 0n
        } finally {
            await disconnect(api)
        }
    },

    async getAuction(auctionId: bigint): Promise<OnChainAuction | null> {
        if (!MARKETPLACE_PROGRAM_ID) {
            return null
        }

        const { api, sails } = await createMarketplaceSails()

        try {
            const query = sails.services.Marketplace.queries.GetAuction(auctionId)
            const replyBytes = await executeQuery(api, query, MARKETPLACE_PROGRAM_ID)

            if (!replyBytes) {
                return null
            }

            console.log('[MarketplaceService] GetAuction reply length:', replyBytes.length)

            // Decode the auction struct from SCALE bytes
            return decodeAuction(replyBytes, auctionId)
        } catch (error) {
            console.error(`[MarketplaceService] getAuction(${auctionId}) error:`, error)
            return null
        } finally {
            await disconnect(api)
        }
    },

    async getAllUnsettledAuctions(): Promise<OnChainAuction[]> {
        if (!MARKETPLACE_PROGRAM_ID) {
            return []
        }

        try {
            const nextAuctionId = await marketplaceService.getNextAuctionId()

            if (nextAuctionId === 0n) {
                console.log('[MarketplaceService] No auctions exist')
                return []
            }

            const auctions: OnChainAuction[] = []
            const now = BigInt(Date.now())

            for (let id = 1n; id < nextAuctionId; id++) {
                const auction = await marketplaceService.getAuction(id)
                if (!auction) continue
                if (auction.settled) continue

                auctions.push({
                    ...auction,
                    isEnded: now >= auction.endTimeMs,
                })
            }

            console.log(`[MarketplaceService] Found ${auctions.length} unsettled auctions`)
            return auctions
        } catch (error) {
            console.error('[MarketplaceService] getAllUnsettledAuctions error:', error)
            return []
        }
    },

    async getPendingRefund(userAddress: string): Promise<bigint> {
        if (!MARKETPLACE_PROGRAM_ID) {
            return 0n
        }

        const { api, sails } = await createMarketplaceSails()

        try {
            const query = sails.services.Marketplace.queries.GetPendingRefund(userAddress as `0x${string}`)
            const replyBytes = await executeQuery(api, query, userAddress)

            if (!replyBytes || replyBytes.length < 32) {
                return 0n
            }

            return readU256(replyBytes, replyBytes.length - 32)
        } catch (error) {
            console.error('[MarketplaceService] getPendingRefund error:', error)
            return 0n
        } finally {
            await disconnect(api)
        }
    },

    async getPendingPayout(userAddress: string): Promise<bigint> {
        if (!MARKETPLACE_PROGRAM_ID) {
            return 0n
        }

        const { api, sails } = await createMarketplaceSails()

        try {
            const query = sails.services.Marketplace.queries.GetPendingPayout(userAddress as `0x${string}`)
            const replyBytes = await executeQuery(api, query, userAddress)

            if (!replyBytes || replyBytes.length < 32) {
                return 0n
            }

            return readU256(replyBytes, replyBytes.length - 32)
        } catch (error) {
            console.error('[MarketplaceService] getPendingPayout error:', error)
            return 0n
        } finally {
            await disconnect(api)
        }
    },

    serializeAuction(auction: OnChainAuction): SerializedAuction {
        return {
            auctionId: auction.auctionId.toString(),
            nftProgramId: auction.nftProgramId,
            tokenId: auction.tokenId.toString(),
            seller: auction.seller,
            startPrice: auction.startPrice.toString(),
            highestBid: auction.highestBid.toString(),
            highestBidder: auction.highestBidder,
            endTimeMs: auction.endTimeMs.toString(),
            settled: auction.settled,
            extensionWindowMs: auction.extensionWindowMs.toString(),
            minBidIncrement: auction.minBidIncrement.toString(),
            isEnded: auction.isEnded,
        }
    },
}
