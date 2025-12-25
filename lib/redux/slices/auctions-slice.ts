import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { formatLine, parseLine, parseLineRaw } from '@/lib/contracts/decimals'

/**
 * =============================================================================
 * AUCTIONS SLICE
 * =============================================================================
 *
 * Redux state management for on-chain auctions.
 *
 * IMPORTANT:
 * - All token amounts stored as STRING (serialized BigInt)
 * - Use parseLineRaw() to convert back to BigInt
 * - Use formatLine() for display
 */

// =============================================================================
// TYPES
// =============================================================================

/** Auction data from on-chain */
export interface Auction {
    auctionId: string
    nftProgramId: string
    tokenId: string
    seller: string
    startPrice: string // BigInt as string
    highestBid: string // BigInt as string
    highestBidder: string | null
    endTimeMs: number
    settled: boolean
    extensionWindowMs: number
    minBidIncrement: string // BigInt as string
}

/** NFT metadata from IPFS */
export interface NFTMetadata {
    name: string
    description: string
    image: string
    creator: string
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
    attributes?: Array<{ trait_type: string; value: string | number }>
    external_url?: string
}

/** Combined auction with metadata */
export interface AuctionWithMetadata extends Auction {
    metadata: NFTMetadata | null
    metadataError?: string
}

/** Transaction status */
export interface TransactionStatus {
    state: 'idle' | 'building' | 'signing' | 'pending' | 'confirmed' | 'failed'
    txHash?: string
    message?: string
    error?: string
}

/** Auction slice state */
interface AuctionsState {
    // Auction data
    auctions: Record<string, AuctionWithMetadata>
    auctionIds: string[]
    selectedAuctionId: string | null

    // User pending items (BigInt as string)
    pendingRefund: string
    pendingPayout: string

    // Loading states
    isLoading: boolean
    isLoadingDetail: boolean
    error: string | null

    // Transaction state
    pendingTx: TransactionStatus | null

    // Last fetch timestamp for cache invalidation
    lastFetchTime: number
}

const initialState: AuctionsState = {
    auctions: {},
    auctionIds: [],
    selectedAuctionId: null,
    pendingRefund: '0',
    pendingPayout: '0',
    isLoading: false,
    isLoadingDetail: false,
    error: null,
    pendingTx: null,
    lastFetchTime: 0,
}

// =============================================================================
// ASYNC THUNKS
// =============================================================================

/**
 * Fetch all active auctions
 */
export const fetchActiveAuctions = createAsyncThunk(
    'auctions/fetchActive',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/auctions')
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch auctions')
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

/**
 * Fetch single auction detail
 */
export const fetchAuctionDetail = createAsyncThunk(
    'auctions/fetchDetail',
    async (auctionId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/auctions/${auctionId}`)
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch auction')
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

/**
 * Fetch user's pending refund
 */
export const fetchPendingRefund = createAsyncThunk(
    'auctions/fetchPendingRefund',
    async (userAddress: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/user/pending?type=refund&address=${encodeURIComponent(userAddress)}`)
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch pending refund')
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

/**
 * Fetch user's pending payout
 */
export const fetchPendingPayout = createAsyncThunk(
    'auctions/fetchPendingPayout',
    async (userAddress: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/user/pending?type=payout&address=${encodeURIComponent(userAddress)}`)
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch pending payout')
            }
            return await response.json()
        } catch (error) {
            return rejectWithValue((error as Error).message)
        }
    }
)

// =============================================================================
// SLICE
// =============================================================================

const auctionsSlice = createSlice({
    name: 'auctions',
    initialState,
    reducers: {
        /** Select an auction to view details */
        selectAuction: (state, action: PayloadAction<string | null>) => {
            state.selectedAuctionId = action.payload
        },

        /** Clear selection */
        clearSelection: (state) => {
            state.selectedAuctionId = null
        },

        /** Set pending transaction status */
        setPendingTx: (state, action: PayloadAction<TransactionStatus | null>) => {
            state.pendingTx = action.payload
        },

        /** Update transaction status */
        updateTxStatus: (state, action: PayloadAction<Partial<TransactionStatus>>) => {
            if (state.pendingTx) {
                state.pendingTx = { ...state.pendingTx, ...action.payload }
            }
        },

        /** Clear error */
        clearError: (state) => {
            state.error = null
        },

        /** Update single auction (for optimistic updates) */
        updateAuction: (state, action: PayloadAction<Partial<AuctionWithMetadata> & { auctionId: string }>) => {
            const { auctionId, ...updates } = action.payload
            if (state.auctions[auctionId]) {
                state.auctions[auctionId] = { ...state.auctions[auctionId], ...updates }
            }
        },

        /** Reset state */
        resetAuctions: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch active auctions
            .addCase(fetchActiveAuctions.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(fetchActiveAuctions.fulfilled, (state, action) => {
                state.isLoading = false
                state.lastFetchTime = Date.now()

                // Transform response to auction map
                const auctions = action.payload.auctions || []
                state.auctionIds = []
                state.auctions = {}

                for (const auction of auctions) {
                    const id = String(auction.auctionId)
                    state.auctionIds.push(id)
                    state.auctions[id] = {
                        auctionId: id,
                        nftProgramId: auction.nftProgramId,
                        tokenId: String(auction.tokenId),
                        seller: auction.seller,
                        startPrice: auction.startPrice,
                        highestBid: auction.highestBid,
                        highestBidder: auction.highestBidder || null,
                        endTimeMs: Number(auction.endTimeMs),
                        settled: auction.settled,
                        extensionWindowMs: Number(auction.extensionWindowMs),
                        minBidIncrement: auction.minBidIncrement,
                        metadata: auction.metadata || null,
                    }
                }
            })
            .addCase(fetchActiveAuctions.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })

            // Fetch auction detail
            .addCase(fetchAuctionDetail.pending, (state) => {
                state.isLoadingDetail = true
            })
            .addCase(fetchAuctionDetail.fulfilled, (state, action) => {
                state.isLoadingDetail = false
                const auction = action.payload
                if (auction && auction.auctionId) {
                    const id = String(auction.auctionId)
                    state.auctions[id] = {
                        ...state.auctions[id],
                        ...auction,
                        auctionId: id,
                    }
                    if (!state.auctionIds.includes(id)) {
                        state.auctionIds.push(id)
                    }
                }
            })
            .addCase(fetchAuctionDetail.rejected, (state, action) => {
                state.isLoadingDetail = false
                state.error = action.payload as string
            })

            // Pending refund
            .addCase(fetchPendingRefund.fulfilled, (state, action) => {
                state.pendingRefund = action.payload.amount || '0'
            })

            // Pending payout
            .addCase(fetchPendingPayout.fulfilled, (state, action) => {
                state.pendingPayout = action.payload.amount || '0'
            })
    },
})

export const {
    selectAuction,
    clearSelection,
    setPendingTx,
    updateTxStatus,
    clearError,
    updateAuction,
    resetAuctions,
} = auctionsSlice.actions

export default auctionsSlice.reducer

// =============================================================================
// SELECTORS
// =============================================================================

export const selectAllAuctions = (state: { auctions: AuctionsState }) =>
    state.auctions.auctionIds.map(id => state.auctions.auctions[id])

export const selectAuctionById = (state: { auctions: AuctionsState }, id: string) =>
    state.auctions.auctions[id] || null

export const selectSelectedAuction = (state: { auctions: AuctionsState }) =>
    state.auctions.selectedAuctionId
        ? state.auctions.auctions[state.auctions.selectedAuctionId]
        : null

export const selectPendingRefund = (state: { auctions: AuctionsState }) =>
    parseLineRaw(state.auctions.pendingRefund)

export const selectPendingPayout = (state: { auctions: AuctionsState }) =>
    parseLineRaw(state.auctions.pendingPayout)

export const selectHasPendingItems = (state: { auctions: AuctionsState }) =>
    state.auctions.pendingRefund !== '0' || state.auctions.pendingPayout !== '0'

export const selectPendingTx = (state: { auctions: AuctionsState }) =>
    state.auctions.pendingTx

export const selectAuctionsLoading = (state: { auctions: AuctionsState }) =>
    state.auctions.isLoading

export const selectAuctionsError = (state: { auctions: AuctionsState }) =>
    state.auctions.error

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate time left for an auction
 */
export function calculateTimeLeft(endTimeMs: number): {
    days: number
    hours: number
    minutes: number
    seconds: number
    isEnded: boolean
} {
    const now = Date.now()
    const diff = endTimeMs - now

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds, isEnded: false }
}

/**
 * Format time left as string
 */
export function formatTimeLeft(endTimeMs: number): string {
    const { days, hours, minutes, isEnded } = calculateTimeLeft(endTimeMs)

    if (isEnded) return 'Ended'

    if (days > 0) return `${days}d ${hours}hrs ${minutes}min`
    if (hours > 0) return `${hours}hrs ${minutes}min`
    return `${minutes}min`
}

/**
 * Calculate minimum next bid
 */
export function calculateMinNextBid(auction: Auction): bigint {
    const highestBid = parseLineRaw(auction.highestBid)
    const startPrice = parseLineRaw(auction.startPrice)
    const increment = parseLineRaw(auction.minBidIncrement)

    if (highestBid === 0n) {
        return startPrice
    }

    return highestBid + increment
}
