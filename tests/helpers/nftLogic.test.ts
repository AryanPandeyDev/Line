/**
 * Unit tests for nftLogic.ts helper functions
 * 
 * Tests pure functions for NFT marketplace:
 * - Rarity weights and colors
 * - Fee calculations
 * - Bid validation
 * - Price formatting
 */

import { describe, it, expect } from 'vitest'
import {
    getRarityWeight,
    getRarityColor,
    calculateMarketplaceFee,
    calculateSellerProceeds,
    isValidListingPrice,
    calculateMinimumBid,
    isValidBidAmount,
    formatNFTPrice,
    sortByRarity,
    getRarityLabel,
    MARKETPLACE_FEE_RATE,
    MIN_BID_INCREMENT,
} from '@/src/lib/helpers/nftLogic'
import type { NFTRarity } from '@/src/lib/models/nft'

describe('nftLogic', () => {
    describe('constants', () => {
        it('has correct marketplace fee rate', () => {
            expect(MARKETPLACE_FEE_RATE).toBe(0.025)
        })

        it('has correct minimum bid increment', () => {
            expect(MIN_BID_INCREMENT).toBe(0.05)
        })
    })

    describe('getRarityWeight', () => {
        it('returns correct weights for all rarities', () => {
            expect(getRarityWeight('COMMON')).toBe(1)
            expect(getRarityWeight('RARE')).toBe(2)
            expect(getRarityWeight('EPIC')).toBe(3)
            expect(getRarityWeight('LEGENDARY')).toBe(4)
            expect(getRarityWeight('MYTHIC')).toBe(5)
        })

        it('returns 0 for unknown rarity', () => {
            expect(getRarityWeight('UNKNOWN' as NFTRarity)).toBe(0)
        })
    })

    describe('getRarityColor', () => {
        it('returns valid hex colors', () => {
            const hexPattern = /^#[0-9A-F]{6}$/i
            expect(getRarityColor('COMMON')).toMatch(hexPattern)
            expect(getRarityColor('LEGENDARY')).toMatch(hexPattern)
        })

        it('returns gray for common', () => {
            expect(getRarityColor('COMMON')).toBe('#9CA3AF')
        })

        it('returns gold for legendary', () => {
            expect(getRarityColor('LEGENDARY')).toBe('#F59E0B')
        })
    })

    describe('calculateMarketplaceFee', () => {
        it('calculates 2.5% fee correctly', () => {
            expect(calculateMarketplaceFee(1000)).toBe(25)
            expect(calculateMarketplaceFee(10000)).toBe(250)
        })

        it('floors the result', () => {
            expect(calculateMarketplaceFee(100)).toBe(2) // 2.5 -> 2
        })

        it('handles 0 price', () => {
            expect(calculateMarketplaceFee(0)).toBe(0)
        })
    })

    describe('calculateSellerProceeds', () => {
        it('returns price minus fee', () => {
            expect(calculateSellerProceeds(1000)).toBe(975) // 1000 - 25
            expect(calculateSellerProceeds(10000)).toBe(9750) // 10000 - 250
        })
    })

    describe('isValidListingPrice', () => {
        it('returns true for positive integers', () => {
            expect(isValidListingPrice(100)).toBe(true)
            expect(isValidListingPrice(1)).toBe(true)
        })

        it('returns false for 0 or negative', () => {
            expect(isValidListingPrice(0)).toBe(false)
            expect(isValidListingPrice(-100)).toBe(false)
        })

        it('returns false for non-integers', () => {
            expect(isValidListingPrice(100.5)).toBe(false)
        })

        it('returns false for Infinity', () => {
            expect(isValidListingPrice(Infinity)).toBe(false)
        })
    })

    describe('calculateMinimumBid', () => {
        it('returns 50% of listing for first bid', () => {
            expect(calculateMinimumBid(1000, null)).toBe(500)
            expect(calculateMinimumBid(100, 0)).toBe(50)
        })

        it('returns 5% more than current highest', () => {
            expect(calculateMinimumBid(100, 1000)).toBe(1050)
            expect(calculateMinimumBid(100, 200)).toBe(210)
        })

        it('ceils the result', () => {
            expect(calculateMinimumBid(100, 101)).toBe(107) // 101 * 1.05 = 106.05 -> 107
        })
    })

    describe('isValidBidAmount', () => {
        it('returns valid for sufficient bid', () => {
            const result = isValidBidAmount(600, 1000, null)
            expect(result.valid).toBe(true)
        })

        it('returns invalid for 0 or negative bid', () => {
            expect(isValidBidAmount(0, 1000, null).valid).toBe(false)
            expect(isValidBidAmount(-100, 1000, null).valid).toBe(false)
        })

        it('returns invalid when below minimum', () => {
            const result = isValidBidAmount(400, 1000, null)
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('500')
        })

        it('requires 5% more than current highest', () => {
            const result = isValidBidAmount(1000, 500, 1000)
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('1050')
        })
    })

    describe('formatNFTPrice', () => {
        it('formats with token type', () => {
            expect(formatNFTPrice(1000, 'LINE')).toBe('1,000 LINE')
            expect(formatNFTPrice(500, 'VARA')).toBe('500 VARA')
        })

        it('adds commas for large numbers', () => {
            expect(formatNFTPrice(1000000, 'LINE')).toContain('1,000,000')
        })
    })

    describe('sortByRarity', () => {
        const items = [
            { id: 1, rarity: 'COMMON' as NFTRarity },
            { id: 2, rarity: 'LEGENDARY' as NFTRarity },
            { id: 3, rarity: 'RARE' as NFTRarity },
        ]

        it('sorts descending by default (rarest first)', () => {
            const sorted = sortByRarity(items)
            expect(sorted[0].rarity).toBe('LEGENDARY')
            expect(sorted[2].rarity).toBe('COMMON')
        })

        it('sorts ascending when specified', () => {
            const sorted = sortByRarity(items, 'asc')
            expect(sorted[0].rarity).toBe('COMMON')
            expect(sorted[2].rarity).toBe('LEGENDARY')
        })

        it('does not mutate original array', () => {
            const originalFirst = items[0]
            sortByRarity(items)
            expect(items[0]).toBe(originalFirst)
        })
    })

    describe('getRarityLabel', () => {
        it('formats rarity for display', () => {
            expect(getRarityLabel('COMMON')).toBe('Common')
            expect(getRarityLabel('LEGENDARY')).toBe('Legendary')
            expect(getRarityLabel('MYTHIC')).toBe('Mythic')
        })
    })
})
