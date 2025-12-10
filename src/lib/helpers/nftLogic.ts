/**
 * ============================================================================
 * NFT LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for NFT marketplace calculations.
 * 
 * MARKETPLACE RULES:
 * - 2.5% marketplace fee on sales
 * - Minimum bid increment: 5% over current highest
 * - Rarity affects display order
 * 
 * ALLOWED:
 * - Fee calculations
 * - Bid validation
 * - Rarity sorting
 * - Price formatting
 * 
 * FORBIDDEN:
 * - Database operations
 * - Blockchain calls
 * - Async operations
 * - Side effects
 * 
 * ============================================================================
 */

import type { NFTRarity } from '../models/nft'

/**
 * Marketplace fee percentage (2.5%)
 */
export const MARKETPLACE_FEE_RATE = 0.025

/**
 * Minimum bid increment percentage (5%)
 */
export const MIN_BID_INCREMENT = 0.05

/**
 * Get rarity weight for sorting (higher = rarer)
 */
export function getRarityWeight(rarity: NFTRarity): number {
    const weights: Record<NFTRarity, number> = {
        COMMON: 1,
        RARE: 2,
        EPIC: 3,
        LEGENDARY: 4,
        MYTHIC: 5,
    }
    return weights[rarity] ?? 0
}

/**
 * Get rarity display color (hex)
 */
export function getRarityColor(rarity: NFTRarity): string {
    const colors: Record<NFTRarity, string> = {
        COMMON: '#9CA3AF',
        RARE: '#3B82F6',
        EPIC: '#8B5CF6',
        LEGENDARY: '#F59E0B',
        MYTHIC: '#EF4444',
    }
    return colors[rarity] ?? '#9CA3AF'
}

/**
 * Calculate marketplace fee for a sale price
 */
export function calculateMarketplaceFee(price: number): number {
    return Math.floor(price * MARKETPLACE_FEE_RATE)
}

/**
 * Calculate seller proceeds after marketplace fee
 */
export function calculateSellerProceeds(price: number): number {
    return price - calculateMarketplaceFee(price)
}

/**
 * Validate listing price
 * Must be positive and finite
 */
export function isValidListingPrice(price: number): boolean {
    return price > 0 && Number.isFinite(price) && Number.isInteger(price)
}

/**
 * Calculate minimum valid bid amount
 */
export function calculateMinimumBid(
    listingPrice: number,
    currentHighestBid: number | null
): number {
    if (currentHighestBid && currentHighestBid > 0) {
        // At least 5% higher than current highest
        return Math.ceil(currentHighestBid * (1 + MIN_BID_INCREMENT))
    }
    // At least 50% of listing price for first bid
    return Math.ceil(listingPrice * 0.5)
}

/**
 * Validate bid amount
 */
export function isValidBidAmount(
    bidAmount: number,
    listingPrice: number,
    currentHighestBid: number | null
): { valid: boolean; reason?: string } {
    if (bidAmount <= 0) {
        return { valid: false, reason: 'Bid must be positive' }
    }

    const minBid = calculateMinimumBid(listingPrice, currentHighestBid)
    if (bidAmount < minBid) {
        return { valid: false, reason: `Bid must be at least ${minBid}` }
    }

    return { valid: true }
}

/**
 * Format price for display
 */
export function formatNFTPrice(price: number, tokenType: 'VARA' | 'LINE'): string {
    return `${price.toLocaleString()} ${tokenType}`
}

/**
 * Sort NFTs by rarity
 */
export function sortByRarity<T extends { rarity: NFTRarity }>(
    items: T[],
    order: 'asc' | 'desc' = 'desc'
): T[] {
    return [...items].sort((a, b) => {
        const diff = getRarityWeight(a.rarity) - getRarityWeight(b.rarity)
        return order === 'desc' ? -diff : diff
    })
}

/**
 * Get rarity label for display
 */
export function getRarityLabel(rarity: NFTRarity): string {
    return rarity.charAt(0) + rarity.slice(1).toLowerCase()
}
