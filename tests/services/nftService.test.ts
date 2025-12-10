/**
 * NFT SERVICE UNIT TESTS
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    nftRepo: {
        findAll: vi.fn(),
        findByIdWithListing: vi.fn(),
        getHighestBid: vi.fn(),
        createBid: vi.fn(),
        markBidNotWinning: vi.fn(),
        updateCurrentPrice: vi.fn(),
        incrementLikes: vi.fn(),
    },
    getUserByClerkId: vi.fn(),
}))

vi.mock('@/src/lib/repositories/nftRepo', () => ({ nftRepo: mocks.nftRepo }))
vi.mock('@/lib/db-helpers', () => ({ getUserByClerkId: mocks.getUserByClerkId }))

import { nftService } from '@/src/lib/services/nftService'

function createMockUser() { return { id: 'user-123', tokenBalance: 5000 } }
function createMockNFT(o = {}) {
    return { id: 'nft-1', name: 'Cool NFT', creatorName: 'Artist', image: '/nft.png', currentPrice: 100, likes: 10, rarity: 'LEGENDARY', description: 'An awesome NFT', activeListing: { id: 'listing-1', price: 100, expiresAt: new Date('2024-06-20T12:00:00Z') }, ...o }
}
function createMockNFTWithListings(o = {}) {
    return { id: 'nft-1', name: 'Cool NFT', creatorName: 'Artist', image: '/nft.png', currentPrice: 100, likes: 10, rarity: 'LEGENDARY', description: 'An awesome NFT', listings: [{ id: 'listing-1', price: 100, expiresAt: new Date('2024-06-20') }], ...o }
}

describe('nftService', () => {
    beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2024-06-15T12:00:00Z')) })
    afterEach(() => vi.useRealTimers())

    describe('getNFTs', () => {
        it('returns empty array when no NFTs', async () => {
            mocks.nftRepo.findAll.mockResolvedValue([])
            expect(await nftService.getNFTs()).toEqual([])
        })
        it('returns all NFTs formatted correctly', async () => {
            mocks.nftRepo.findAll.mockResolvedValue([createMockNFT()])
            const result = await nftService.getNFTs()
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ id: 'nft-1', name: 'Cool NFT', creator: 'Artist', rarity: 'Legendary' })
        })
        it('shows "No active listing" when no listing', async () => {
            mocks.nftRepo.findAll.mockResolvedValue([createMockNFT({ activeListing: null })])
            expect((await nftService.getNFTs())[0].timeLeft).toBe('No active listing')
        })
        it('shows "Expired" for past listings', async () => {
            mocks.nftRepo.findAll.mockResolvedValue([createMockNFT({ activeListing: { expiresAt: new Date('2024-06-01') } })])
            expect((await nftService.getNFTs())[0].timeLeft).toBe('Expired')
        })
    })

    describe('placeBid', () => {
        it('returns failure when user not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(null)
            expect(await nftService.placeBid('clerk-123', 'nft-1', 150)).toEqual({ success: false, message: 'User not found' })
        })
        it('returns failure when NFT not found', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.nftRepo.findByIdWithListing.mockResolvedValue(null)
            expect(await nftService.placeBid('clerk-123', 'invalid', 150)).toEqual({ success: false, message: 'NFT not found' })
        })
        it('returns failure when bid too low', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.nftRepo.findByIdWithListing.mockResolvedValue(createMockNFTWithListings())
            mocks.nftRepo.getHighestBid.mockResolvedValue({ amount: 200 })
            expect(await nftService.placeBid('clerk-123', 'nft-1', 150)).toEqual({ success: false, message: 'Bid must be higher than 200' })
        })
        it('places bid successfully', async () => {
            mocks.getUserByClerkId.mockResolvedValue(createMockUser())
            mocks.nftRepo.findByIdWithListing.mockResolvedValue(createMockNFTWithListings())
            mocks.nftRepo.getHighestBid.mockResolvedValue(null)
            mocks.nftRepo.createBid.mockResolvedValue({ id: 'bid-1' })
            const result = await nftService.placeBid('clerk-123', 'nft-1', 150)
            expect(mocks.nftRepo.createBid).toHaveBeenCalled()
            expect(result).toMatchObject({ success: true, nftId: 'nft-1', newBid: 150 })
        })
    })

    describe('likeNFT', () => {
        it('increments likes', async () => {
            mocks.nftRepo.incrementLikes.mockResolvedValue(undefined)
            expect(await nftService.likeNFT('nft-1')).toEqual({ success: true, message: 'NFT liked!' })
            expect(mocks.nftRepo.incrementLikes).toHaveBeenCalledWith('nft-1')
        })
    })
})
