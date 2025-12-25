/**
 * ============================================================================
 * NFT TOKEN SERVICE
 * ============================================================================
 *
 * Pure on-chain queries for the NFT contract using Sails.
 * Fetches token URIs and metadata from IPFS/HTTP.
 *
 * ============================================================================
 */

import { CONTRACTS, VARA_RPC } from '@/lib/contracts/config'

const NFT_PROGRAM_ID = CONTRACTS.NFT

// =============================================================================
// TYPES
// =============================================================================

export interface NFTMetadata {
    name?: string
    description?: string
    image?: string
    external_url?: string
    attributes?: Array<{
        trait_type: string
        value: string | number
    }>
    creator?: string
    rarity?: string
}

// =============================================================================
// SAILS CLIENT HELPER
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNftSails(programId?: string): Promise<{ api: any; sails: any }> {
    const nftProgram = programId || NFT_PROGRAM_ID

    if (!nftProgram) {
        throw new Error('NFT program ID not provided')
    }

    const { GearApi } = await import('@gear-js/api')
    const { Sails } = await import('sails-js')
    const { SailsIdlParser } = await import('sails-js-parser')
    const fs = await import('fs')
    const path = await import('path')

    const api = await GearApi.create({ providerAddress: VARA_RPC })

    const idlPath = path.join(process.cwd(), 'public', 'contracts', 'nft.idl')
    const idl = fs.readFileSync(idlPath, 'utf-8')

    const parser = new SailsIdlParser()
    await parser.init()
    const sails = new Sails(parser)
    sails.parseIdl(idl)
    sails.setApi(api)
    sails.setProgramId(nftProgram as `0x${string}`)

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

// =============================================================================
// SERVICE
// =============================================================================

export const nftTokenService = {
    isConfigured(): boolean {
        return !!NFT_PROGRAM_ID
    },

    async getTokenUri(tokenId: bigint, programId?: string): Promise<string | null> {
        const nftProgram = programId || NFT_PROGRAM_ID

        console.log('[NFTTokenService] getTokenUri called:', { tokenId: tokenId.toString(), programId, nftProgram })

        if (!nftProgram) {
            console.warn('[NFTTokenService] NFT program ID not provided')
            return null
        }

        try {
            const { api, sails } = await createNftSails(nftProgram)
            const { u8aToHex, hexToU8a } = await import('@polkadot/util')

            try {
                console.log('[NFTTokenService] Creating query for TokenUri, tokenId:', tokenId.toString())
                console.log('[NFTTokenService] Sails services:', Object.keys(sails.services))

                const nftService = sails.services.Nft
                if (!nftService) {
                    console.error('[NFTTokenService] Nft service not found in sails')
                    return null
                }
                console.log('[NFTTokenService] Nft queries:', Object.keys(nftService.queries || {}))

                const query = nftService.queries.TokenUri(tokenId)
                const payload = query._payload || query.payload

                if (!payload) {
                    console.error('[NFTTokenService] No payload from TokenUri query')
                    return null
                }

                const payloadHex = u8aToHex(payload)
                console.log('[NFTTokenService] Query TokenUri for token:', tokenId.toString(), 'payload:', payloadHex.slice(0, 50) + '...')

                const calcResult = await api.message.calculateReply({
                    origin: nftProgram as `0x${string}`,
                    destination: nftProgram as `0x${string}`,
                    payload: payloadHex as `0x${string}`,
                    value: 0,
                    gasLimit: api.blockGasLimit.toBigInt(),
                })

                if (!calcResult?.payload) {
                    return null
                }

                const replyHex = calcResult.payload.toHex()
                const replyBytes = hexToU8a(replyHex)

                console.log('[NFTTokenService] Reply length:', replyBytes.length, 'hex:', replyHex.slice(0, 80))

                // Response format: "Nft/TokenUri" prefix + Option<String>
                // For Option<String>: 0x00 = None, 0x01 = Some followed by compact-encoded string
                // 
                // First, find the end of the method name prefix
                // The prefix is "Nft/TokenUri" (12 chars) but it's encoded with a length prefix too

                // Look for 0x01 (Some) followed by a reasonable string length
                // The string length is compact-encoded:
                // - If (byte & 0x03) == 0x00: single-byte mode, length = byte >> 2
                // - If (byte & 0x03) == 0x01: two-byte mode, length = (byte1 | byte2 << 8) >> 2

                for (let i = 10; i < replyBytes.length - 2; i++) {
                    // Look for 0x01 (Some) discriminant
                    if (replyBytes[i] === 0x01) {
                        const lenByte = replyBytes[i + 1]
                        const mode = lenByte & 0x03

                        let len = 0
                        let strStart = i + 2

                        if (mode === 0x00) {
                            // Single-byte mode
                            len = lenByte >> 2
                        } else if (mode === 0x01 && i + 2 < replyBytes.length) {
                            // Two-byte mode
                            len = ((lenByte | (replyBytes[i + 2] << 8)) >> 2)
                            strStart = i + 3
                        } else {
                            continue // Not a valid compact length
                        }

                        // Sanity check: string should be at least 10 chars (ipfs://...) and less than 500
                        if (len >= 10 && len < 500 && strStart + len <= replyBytes.length) {
                            const strBytes = replyBytes.slice(strStart, strStart + len)
                            const uri = new TextDecoder().decode(strBytes)

                            // Verify it looks like a URL
                            if (uri.startsWith('http') || uri.startsWith('ipfs://') || uri.startsWith('/')) {
                                console.log('[NFTTokenService] TokenUri:', uri)
                                return uri
                            }
                        }
                    }
                }

                console.log('[NFTTokenService] Could not parse TokenUri from response')
                return null
            } finally {
                await disconnect(api)
            }
        } catch (error) {
            console.error('[NFTTokenService] getTokenUri error:', error)
            return null
        }
    },

    async fetchMetadata(uri: string): Promise<NFTMetadata | null> {
        if (!uri) return null

        try {
            let httpUrl = uri
            if (uri.startsWith('ipfs://')) {
                const cid = uri.replace('ipfs://', '')
                httpUrl = `https://ipfs.io/ipfs/${cid}`
            }

            const response = await fetch(httpUrl, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(10000),
            })

            if (!response.ok) {
                console.warn(`[NFTTokenService] Metadata fetch failed: ${response.status}`)
                return null
            }

            const metadata = await response.json() as NFTMetadata

            if (metadata.image?.startsWith('ipfs://')) {
                const cid = metadata.image.replace('ipfs://', '')
                metadata.image = `https://ipfs.io/ipfs/${cid}`
            }

            return metadata
        } catch (error) {
            console.error('[NFTTokenService] fetchMetadata error:', error)
            return null
        }
    },

    async getTokenMetadata(tokenId: bigint, programId?: string): Promise<NFTMetadata | null> {
        const uri = await nftTokenService.getTokenUri(tokenId, programId)

        if (!uri) {
            return null
        }

        return await nftTokenService.fetchMetadata(uri)
    },
}
