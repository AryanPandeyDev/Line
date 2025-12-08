import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type NFTRarity = "Common" | "Rare" | "Epic" | "Legendary"

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
  listed: boolean
  createdAt: string
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
}

const mockNFTs: NFT[] = [
  {
    id: "nft-001",
    name: "Cyber Wolf",
    rarity: "Epic",
    price: 1200,
    image: "/cyberpunk-wolf-with-neon-blue-eyes-and-chrome-armo.jpg",
    description: "A fierce cyber wolf with glowing neon circuits running through its chrome body.",
    attributes: [
      { trait: "Power", value: 72 },
      { trait: "Luck", value: 40 },
      { trait: "Background", value: "Neon Grid" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-01",
  },
  {
    id: "nft-002",
    name: "Neon Samurai",
    rarity: "Legendary",
    price: 5000,
    image: "/neon-samurai-warrior-with-glowing-katana-cyberpunk.jpg",
    description: "An ancient warrior reborn in the digital age, wielding a blade of pure light.",
    attributes: [
      { trait: "Power", value: 95 },
      { trait: "Honor", value: 88 },
      { trait: "Background", value: "Cherry Blossom Matrix" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-05",
  },
  {
    id: "nft-003",
    name: "Holo Mask",
    rarity: "Rare",
    price: 450,
    image: "/holographic-cyber-mask-with-shifting-colors-futuri.jpg",
    description: "A mysterious holographic mask that shifts between dimensions.",
    attributes: [
      { trait: "Mystery", value: 65 },
      { trait: "Stealth", value: 78 },
      { trait: "Background", value: "Void Space" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-08",
  },
  {
    id: "nft-004",
    name: "Chrome Dragon",
    rarity: "Legendary",
    price: 8500,
    image: "/chrome-mechanical-dragon-with-glowing-purple-eyes-.jpg",
    description: "A majestic dragon forged from pure chrome, breathing digital fire.",
    attributes: [
      { trait: "Power", value: 99 },
      { trait: "Wisdom", value: 85 },
      { trait: "Background", value: "Storm Clouds" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-10",
  },
  {
    id: "nft-005",
    name: "Void Fox",
    rarity: "Epic",
    price: 1800,
    image: "/ethereal-fox-made-of-dark-matter-with-magenta-ener.jpg",
    description: "A mystical fox that exists between dimensions, trailing cosmic energy.",
    attributes: [
      { trait: "Speed", value: 88 },
      { trait: "Cunning", value: 76 },
      { trait: "Background", value: "Dark Nebula" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-12",
  },
  {
    id: "nft-006",
    name: "Synth Ranger",
    rarity: "Common",
    price: 120,
    image: "/synthwave-ranger-with-visor-and-cyber-bow-neon-col.jpg",
    description: "A lone ranger of the digital frontier, armed with a bow of pure energy.",
    attributes: [
      { trait: "Accuracy", value: 82 },
      { trait: "Survival", value: 60 },
      { trait: "Background", value: "Sunset Grid" },
    ],
    owner: "LINE Marketplace",
    listed: true,
    createdAt: "2024-01-15",
  },
]

const initialState: NFTsState = {
  marketplace: mockNFTs,
  inventory: [],
  featured: mockNFTs[1], // Neon Samurai as featured
  filters: {
    rarity: "all",
    sortBy: "newest",
    search: "",
  },
}

const nftsSlice = createSlice({
  name: "nfts",
  initialState,
  reducers: {
    purchaseNFT: (state, action: PayloadAction<{ nftId: string; buyerAddress: string }>) => {
      const nft = state.marketplace.find((n) => n.id === action.payload.nftId)
      if (nft) {
        nft.owner = action.payload.buyerAddress
        nft.listed = false
        state.inventory.push({ ...nft })
        state.marketplace = state.marketplace.filter((n) => n.id !== action.payload.nftId)
      }
    },
    listNFT: (state, action: PayloadAction<{ nftId: string; price: number }>) => {
      const nft = state.inventory.find((n) => n.id === action.payload.nftId)
      if (nft) {
        nft.price = action.payload.price
        nft.listed = true
        state.marketplace.push({ ...nft })
      }
    },
    setFilters: (state, action: PayloadAction<Partial<NFTsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters: (state) => {
      state.filters = { rarity: "all", sortBy: "newest", search: "" }
    },
  },
})

export const { purchaseNFT, listNFT, setFilters, resetFilters } = nftsSlice.actions
export default nftsSlice.reducer

// Selectors
export const selectMarketplace = (state: { nfts: NFTsState }) => state.nfts.marketplace
export const selectInventory = (state: { nfts: NFTsState }) => state.nfts.inventory
export const selectFeatured = (state: { nfts: NFTsState }) => state.nfts.featured
export const selectFilters = (state: { nfts: NFTsState }) => state.nfts.filters
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
        nft.description.toLowerCase().includes(search.toLowerCase()),
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
      const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 }
      items.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
      break
    case "newest":
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }

  return items
}
