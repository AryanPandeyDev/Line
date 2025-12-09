import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"

export type NFTRarity = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic"

export interface NFTAttribute {
  trait: string
  value: number | string
}

export interface NFT {
  id: string
  name: string
  rarity: NFTRarity
  price: number
  image: string
  description: string
  attributes: NFTAttribute[]
  owner: string
  creator: string
  listed: boolean
  createdAt: string
  likes: number
  timeLeft?: string
}

interface NFTsState {
  marketplace: NFT[]
  inventory: NFT[]
  featured: NFT | null
  filters: {
    rarity: NFTRarity | "all"
    sortBy: "price-asc" | "price-desc" | "rarity" | "newest"
    search: string
  }
  isLoading: boolean
  error: string | null
}

const initialState: NFTsState = {
  marketplace: [],
  inventory: [],
  featured: null,
  filters: {
    rarity: "all",
    sortBy: "newest",
    search: "",
  },
  isLoading: false,
  error: null,
}

// Async thunk to fetch marketplace NFTs
export const fetchMarketplaceNFTs = createAsyncThunk(
  "nfts/fetchMarketplace",
  async (params: { sortBy?: string; rarity?: string } = {}, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams()
      if (params.sortBy) searchParams.set("sortBy", params.sortBy)
      if (params.rarity) searchParams.set("rarity", params.rarity)

      const response = await fetch(`/api/nfts?${searchParams}`)
      if (!response.ok) {
        throw new Error("Failed to fetch NFTs")
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to place a bid
export const placeBidAsync = createAsyncThunk(
  "nfts/placeBid",
  async ({ nftId, bidAmount }: { nftId: string; bidAmount: number }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/nfts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId, bidAmount, action: "bid" }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to place bid")
      }
      return { nftId, bidAmount, ...(await response.json()) }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Async thunk to like an NFT
export const likeNFTAsync = createAsyncThunk(
  "nfts/like",
  async (nftId: string, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/nfts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nftId, action: "like" }),
      })
      if (!response.ok) {
        throw new Error("Failed to like NFT")
      }
      return { nftId }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

// Map API rarity to state rarity
function mapRarity(rarity: string): NFTRarity {
  const map: Record<string, NFTRarity> = {
    Common: "Common",
    Rare: "Rare",
    Epic: "Epic",
    Legendary: "Legendary",
    Mythic: "Mythic",
  }
  return map[rarity] || "Common"
}

const nftsSlice = createSlice({
  name: "nfts",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<NFTsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters: (state) => {
      state.filters = { rarity: "all", sortBy: "newest", search: "" }
    },
    setInventory: (state, action: PayloadAction<NFT[]>) => {
      state.inventory = action.payload
    },
    addToInventory: (state, action: PayloadAction<NFT>) => {
      state.inventory.push(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarketplaceNFTs.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMarketplaceNFTs.fulfilled, (state, action) => {
        state.isLoading = false
        // Map API response to NFT interface
        state.marketplace = action.payload.map((nft: {
          id: string
          name: string
          creator: string
          image: string
          currentBid: number
          timeLeft: string
          likes: number
          rarity: string
          description?: string
        }) => ({
          id: nft.id,
          name: nft.name,
          rarity: mapRarity(nft.rarity),
          price: nft.currentBid,
          image: nft.image,
          description: nft.description || "",
          attributes: [],
          owner: "LINE Marketplace",
          creator: nft.creator,
          listed: true,
          createdAt: new Date().toISOString(),
          likes: nft.likes,
          timeLeft: nft.timeLeft,
        }))
        // Set first legendary as featured
        state.featured = state.marketplace.find((n) => n.rarity === "Legendary" || n.rarity === "Mythic") || state.marketplace[0] || null
      })
      .addCase(fetchMarketplaceNFTs.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(placeBidAsync.fulfilled, (state, action) => {
        const nft = state.marketplace.find((n) => n.id === action.payload.nftId)
        if (nft) {
          nft.price = action.payload.bidAmount
        }
      })
      .addCase(likeNFTAsync.fulfilled, (state, action) => {
        const nft = state.marketplace.find((n) => n.id === action.payload.nftId)
        if (nft) {
          nft.likes += 1
        }
      })
  },
})

export const { setFilters, resetFilters, setInventory, addToInventory } = nftsSlice.actions
export default nftsSlice.reducer

// Selectors
export const selectMarketplace = (state: { nfts: NFTsState }) => state.nfts.marketplace
export const selectInventory = (state: { nfts: NFTsState }) => state.nfts.inventory
export const selectFeatured = (state: { nfts: NFTsState }) => state.nfts.featured
export const selectFilters = (state: { nfts: NFTsState }) => state.nfts.filters
export const selectNFTsLoading = (state: { nfts: NFTsState }) => state.nfts.isLoading
export const selectFilteredMarketplace = (state: { nfts: NFTsState }) => {
  let items = [...state.nfts.marketplace]
  const { rarity, sortBy, search } = state.nfts.filters

  // Filter by rarity
  if (rarity !== "all") {
    items = items.filter((nft) => nft.rarity === rarity)
  }

  // Filter by search
  if (search) {
    items = items.filter(
      (nft) =>
        nft.name.toLowerCase().includes(search.toLowerCase()) ||
        nft.description.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Sort
  switch (sortBy) {
    case "price-asc":
      items.sort((a, b) => a.price - b.price)
      break
    case "price-desc":
      items.sort((a, b) => b.price - a.price)
      break
    case "rarity":
      const rarityOrder: Record<NFTRarity, number> = { Mythic: 0, Legendary: 1, Epic: 2, Rare: 3, Common: 4 }
      items.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
      break
    case "newest":
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }

  return items
}
