# Mock Features Implementation Guide

> **Complete guide for transitioning mock/placeholder data to real backend integration**

*Last Updated: December 2024*

---

## Table of Contents

1. [Overview](#overview)
2. [Mock Feature Inventory](#mock-feature-inventory)
3. [Implementation Priority Matrix](#implementation-priority-matrix)
4. [Detailed Implementation Plans](#detailed-implementation-plans)
5. [Code Examples](#code-examples)
6. [Testing Checklist](#testing-checklist)

---

## Overview

The LINE Web3 Game Center has several frontend features currently using mock/hardcoded data. The backend APIs for most of these features **already exist** and are functional. This document provides step-by-step instructions for connecting the frontend to real data.

### Current State Summary

| Feature | Frontend | Backend | Database | Blockchain |
|---------|----------|---------|----------|------------|
| Games Catalog | ❌ Mock | ✅ Ready | ✅ Schema exists | ❌ N/A |
| NFT Marketplace | ❌ Mock | ✅ Ready | ✅ Schema exists | ❌ Future |
| Dashboard NFTs | ❌ Mock | ⚠️ Needs endpoint | ✅ Schema exists | ❌ N/A |
| Quick Actions | ⚠️ Static | ✅ Ready | ✅ Working | ❌ N/A |
| Wallet Balances | ⚠️ Partial | ✅ Ready | ✅ Working | ✅ VARA only |

---

## Mock Feature Inventory

### 1. Games Page Mock Data

**File**: `app/(protected)/games/page.tsx`  
**Lines**: 16-55  
**Variable**: `mockGames`

```typescript
// Current mock data
const mockGames = [
  {
    id: 1,
    title: "Neon Racers",
    description: "High-speed racing through cyberpunk cities",
    image: "/cyberpunk-racing-game-neon.jpg",
    category: "Racing",
    players: "12.5K",
    rating: 4.8,
    rewards: "50-200 LINE",
    status: "coming-soon",
  },
  // ... 3 more games
]
```

**Backend Endpoint**: `GET /api/games` ✅ Exists and works  
**Service**: `src/lib/services/gameService.ts`  
**Repository**: `src/lib/repositories/gameRepo.ts`

---

### 2. NFT Marketplace Mock Data

**File**: `app/(protected)/nft-market/page.tsx`  
**Lines**: 14-78  
**Variable**: `mockNFTs`

```typescript
// Current mock data
const mockNFTs = [
  {
    id: "1",
    name: "Cyber Phantom",
    creator: "NeonArtist",
    image: "/cyberpunk-phantom-warrior-neon-purple.jpg",
    currentBid: 15.6,
    timeLeft: "2d 10hrs 45min",
    likes: 234,
    rarity: "Legendary",
  },
  // ... 7 more NFTs
]
```

**Backend Endpoint**: `GET /api/nfts` ✅ Exists and works  
**Service**: `src/lib/services/nftService.ts`  
**Repository**: `src/lib/repositories/nftRepo.ts`

---

### 3. Dashboard Featured NFTs

**File**: `app/(protected)/dashboard/page.tsx`  
**Lines**: 18-27  
**Variable**: `featuredNFTs`

```typescript
// Current mock data
const featuredNFTs = [
  { id: 1, name: "Cyber Wolf", image: "/...", rarity: "Epic" },
  { id: 2, name: "Neon Samurai", image: "/...", rarity: "Legendary" },
  { id: 3, name: "Chrome Dragon", image: "/...", rarity: "Legendary" },
  { id: 4, name: "Void Fox", image: "/...", rarity: "Epic" },
]
```

**Backend Endpoint**: ⚠️ Needs to be created  
**Proposed**: `GET /api/nfts/featured`

---

### 4. Dashboard Quick Actions Static Text

**File**: `app/(protected)/dashboard/page.tsx`  
**Lines**: ~150-160

```tsx
// Current static text
<p className="text-xs text-muted-foreground">100 LINE available</p>
```

**Backend Data**: ✅ Already available via `tokens-slice.ts`  
**Selectors**: `selectNextRewardAmount`, `selectDailyClaimAvailable`

---

## Implementation Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| 🔴 High | Quick Actions Dynamic | 1 hour | High UX | None |
| 🔴 High | NFT Marketplace Connect | 3-4 hours | Core feature | NFT seed data |
| 🟡 Medium | Dashboard Featured NFTs | 2-3 hours | UX polish | NFT seed data |
| 🟡 Medium | Games Page Connect | 2 hours | Core feature | Game seed data |
| 🟢 Low | Backend Minting | 8+ hours | Blockchain | Security setup |
| 🟢 Low | On-Chain NFTs | Weeks | Full feature | Contract dev |

---

## Detailed Implementation Plans

### Plan 1: Dashboard Quick Actions (1 hour)

**Goal**: Show actual daily reward amount and availability status

#### Step 1: Import Required Selectors

```typescript
// In app/(protected)/dashboard/page.tsx
import { 
  selectDailyClaimAvailable, 
  selectNextRewardAmount,
  selectCurrentStreak 
} from "@/lib/redux/slices/tokens-slice"
```

#### Step 2: Use Selectors in Component

```typescript
export default function DashboardPage() {
  // ... existing code ...
  
  const dailyClaimAvailable = useAppSelector(selectDailyClaimAvailable)
  const nextRewardAmount = useAppSelector(selectNextRewardAmount)
  const currentStreak = useAppSelector(selectCurrentStreak)
  
  // ...
}
```

#### Step 3: Update Quick Actions UI

```tsx
<Link href="/earn" className="block">
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
    <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
      <Coins className="w-5 h-5 text-neon-cyan" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-sm">
        {dailyClaimAvailable ? "Claim Daily Reward" : "Daily Reward Claimed"}
      </p>
      <p className="text-xs text-muted-foreground">
        {dailyClaimAvailable 
          ? `${nextRewardAmount} LINE available` 
          : `Streak: ${currentStreak} days`}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
  </div>
</Link>
```

#### Step 4: Add Visual Indicator

```tsx
{dailyClaimAvailable && (
  <span className="absolute top-2 right-2 w-2 h-2 bg-neon-green rounded-full animate-pulse" />
)}
```

---

### Plan 2: NFT Marketplace Connection (3-4 hours)

**Goal**: Replace mockNFTs with real data from `/api/nfts`

#### Step 1: Update nfts-slice.ts

```typescript
// lib/redux/slices/nfts-slice.ts

// Add new state for marketplace
interface NFTsState {
  // ... existing state ...
  marketplace: MarketplaceNFT[]
  marketplaceLoading: boolean
  marketplaceError: string | null
}

interface MarketplaceNFT {
  id: string
  name: string
  creator: string
  image: string
  currentBid: number
  timeLeft: string
  likes: number
  rarity: string
  description: string | null
}

// Add async thunk
export const fetchMarketplaceNFTs = createAsyncThunk(
  "nfts/fetchMarketplace",
  async (filters?: { category?: string; sortBy?: string; rarity?: string }) => {
    const params = new URLSearchParams()
    if (filters?.category) params.set("category", filters.category)
    if (filters?.sortBy) params.set("sortBy", filters.sortBy)
    if (filters?.rarity) params.set("rarity", filters.rarity)
    
    const response = await fetch(`/api/nfts?${params}`)
    if (!response.ok) throw new Error("Failed to fetch NFTs")
    return response.json()
  }
)

// Add to slice
extraReducers: (builder) => {
  builder
    .addCase(fetchMarketplaceNFTs.pending, (state) => {
      state.marketplaceLoading = true
      state.marketplaceError = null
    })
    .addCase(fetchMarketplaceNFTs.fulfilled, (state, action) => {
      state.marketplace = action.payload
      state.marketplaceLoading = false
    })
    .addCase(fetchMarketplaceNFTs.rejected, (state, action) => {
      state.marketplaceLoading = false
      state.marketplaceError = action.error.message || "Failed to fetch"
    })
}

// Add selectors
export const selectMarketplaceNFTs = (state: RootState) => state.nfts.marketplace
export const selectMarketplaceLoading = (state: RootState) => state.nfts.marketplaceLoading
```

#### Step 2: Update NFT Marketplace Page

```typescript
// app/(protected)/nft-market/page.tsx
"use client"

import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { 
  fetchMarketplaceNFTs, 
  selectMarketplaceNFTs, 
  selectMarketplaceLoading 
} from "@/lib/redux/slices/nfts-slice"

export default function NFTMarketPage() {
  const dispatch = useAppDispatch()
  const nfts = useAppSelector(selectMarketplaceNFTs)
  const isLoading = useAppSelector(selectMarketplaceLoading)
  
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Price: High to Low")
  
  // Fetch on mount and when filters change
  useEffect(() => {
    dispatch(fetchMarketplaceNFTs({
      category: selectedCategory !== "All" ? selectedCategory : undefined,
      sortBy: sortBy.includes("High") ? "price-desc" : "price-asc",
    }))
  }, [dispatch, selectedCategory, sortBy])
  
  // ... rest of component uses `nfts` instead of `mockNFTs`
}
```

#### Step 3: Add Bidding Integration

```typescript
// Add bid action thunk
export const placeBidAsync = createAsyncThunk(
  "nfts/placeBid",
  async ({ nftId, amount }: { nftId: string; amount: number }) => {
    const response = await fetch("/api/nfts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nftId, bidAmount: amount, action: "bid" }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Failed to place bid")
    }
    return response.json()
  }
)
```

#### Step 4: Seed NFT Data

```sql
-- prisma/seed-nfts.sql

-- Insert NFTs
INSERT INTO "NFT" (id, name, description, image, "creatorName", rarity, likes, views, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Cyber Phantom', 'A legendary warrior from the digital realm', '/cyberpunk-phantom-warrior-neon-purple.jpg', 'NeonArtist', 'LEGENDARY', 234, 1500, NOW(), NOW()),
  (gen_random_uuid(), 'Digital Dragon', 'Ancient beast with neon scales', '/digital-dragon-creature-neon-scales.jpg', 'CryptoMaster', 'EPIC', 189, 1200, NOW(), NOW()),
  -- ... more NFTs

-- Insert Listings
INSERT INTO "NFTListing" (id, "nftId", "sellerId", price, "tokenType", status, "expiresAt", "createdAt")
SELECT 
  gen_random_uuid(),
  n.id,
  (SELECT id FROM "User" LIMIT 1), -- Use first user as seller
  RANDOM() * 100,
  'LINE',
  'LISTED',
  NOW() + INTERVAL '7 days',
  NOW()
FROM "NFT" n;
```

---

### Plan 3: Dashboard Featured NFTs (2-3 hours)

**Goal**: Show real top NFTs on dashboard

#### Step 1: Create Featured NFTs Endpoint

```typescript
// app/api/nfts/featured/route.ts
import { NextResponse } from "next/server"
import { nftService } from "@/src/lib/services/nftService"

export async function GET() {
  try {
    const featured = await nftService.getFeaturedNFTs(4)
    return NextResponse.json(featured)
  } catch (error) {
    console.error("Error fetching featured NFTs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

#### Step 2: Add Service Method

```typescript
// src/lib/services/nftService.ts

getFeaturedNFTs: async (limit: number = 4): Promise<NFTResponse[]> => {
  const nfts = await nftRepo.findFeatured(limit)
  
  return nfts.map((nft) => ({
    id: nft.id,
    name: nft.name,
    image: nft.image,
    rarity: nft.rarity.charAt(0) + nft.rarity.slice(1).toLowerCase(),
    currentBid: nft.activeListing?.price || nft.currentPrice || 0,
    // ... other fields
  }))
}
```

#### Step 3: Add Repository Method

```typescript
// src/lib/repositories/nftRepo.ts

findFeatured: async (limit: number) => {
  return db.nFT.findMany({
    where: {
      listings: {
        some: {
          status: 'LISTED',
        },
      },
    },
    include: {
      listings: {
        where: { status: 'LISTED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { views: 'desc' },
      { likes: 'desc' },
    ],
    take: limit,
  })
}
```

#### Step 4: Update Dashboard Component

```typescript
// app/(protected)/dashboard/page.tsx

// Add to imports
import { fetchFeaturedNFTs, selectFeaturedNFTs } from "@/lib/redux/slices/nfts-slice"

// In component
const featuredNFTs = useAppSelector(selectFeaturedNFTs)

useEffect(() => {
  dispatch(fetchFeaturedNFTs())
}, [dispatch])

// In JSX - replace hardcoded array with Redux state
{featuredNFTs.map((nft) => (
  // ... render NFT card
))}
```

---

### Plan 4: Games Page Connection (2 hours)

**Goal**: Replace mockGames with data from `/api/games`

#### Step 1: Create Games Slice

```typescript
// lib/redux/slices/games-slice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

interface Game {
  id: string
  name: string
  description: string
  image: string
  category: string
  players: number
  rating: number
  rewards: { min: number; max: number }
  status: string
  releaseDate: string | null
}

interface GamesState {
  games: Game[]
  isLoading: boolean
  error: string | null
}

const initialState: GamesState = {
  games: [],
  isLoading: false,
  error: null,
}

export const fetchGames = createAsyncThunk(
  "games/fetchAll",
  async () => {
    const response = await fetch("/api/games")
    if (!response.ok) throw new Error("Failed to fetch games")
    return response.json()
  }
)

const gamesSlice = createSlice({
  name: "games",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGames.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.games = action.payload
        state.isLoading = false
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || "Failed"
      })
  },
})

export default gamesSlice.reducer
export const selectGames = (state: RootState) => state.games.games
export const selectGamesLoading = (state: RootState) => state.games.isLoading
```

#### Step 2: Add to Store

```typescript
// lib/redux/store.ts
import games from "./slices/games-slice"

export const store = configureStore({
  reducer: {
    // ... existing reducers
    games,
  },
})
```

#### Step 3: Update Games Page

```typescript
// app/(protected)/games/page.tsx
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchGames, selectGames, selectGamesLoading } from "@/lib/redux/slices/games-slice"

export default function GamesPage() {
  const dispatch = useAppDispatch()
  const games = useAppSelector(selectGames)
  const isLoading = useAppSelector(selectGamesLoading)
  
  useEffect(() => {
    dispatch(fetchGames())
  }, [dispatch])
  
  // Check if we have any active games
  const hasActiveGames = games.some(g => g.status === "active")
  
  if (!hasActiveGames) {
    // Show "Coming Soon" state with games from database
    return (
      <ComingSoonView games={games.filter(g => g.status === "coming-soon")} />
    )
  }
  
  // Show active games
  return <ActiveGamesView games={games.filter(g => g.status === "active")} />
}
```

#### Step 4: Seed Game Data

```sql
-- prisma/seed-games.sql
INSERT INTO "Game" (id, slug, name, description, "shortDescription", "coverImage", category, tags, "rewardMin", "rewardMax", status, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'neon-racers', 'Neon Racers', 'High-speed racing through cyberpunk cities with LINE token rewards', 'Cyberpunk racing game', '/cyberpunk-racing-game-neon.jpg', 'RACING', ARRAY['racing', 'multiplayer', 'rewards'], 50, 200, 'COMING_SOON', NOW(), NOW()),
  (gen_random_uuid(), 'cyber-arena', 'Cyber Arena', 'Battle royale in a futuristic digital arena', 'Futuristic battle royale', '/battle-royale-cyberpunk-arena.jpg', 'ACTION', ARRAY['battle-royale', 'pvp', 'rewards'], 100, 500, 'COMING_SOON', NOW(), NOW()),
  (gen_random_uuid(), 'void-explorers', 'Void Explorers', 'Explore procedurally generated digital dimensions', 'Exploration adventure', '/space-exploration-game-neon.jpg', 'ADVENTURE', ARRAY['exploration', 'procedural', 'solo'], 30, 150, 'COMING_SOON', NOW(), NOW()),
  (gen_random_uuid(), 'synth-poker', 'Synth Poker', 'High-stakes poker with NFT collectibles', 'NFT poker game', '/cyberpunk-poker-card-game.jpg', 'CARDS', ARRAY['cards', 'gambling', 'nft'], 20, 1000, 'COMING_SOON', NOW(), NOW());
```

---

## Code Examples

### Loading Skeleton for NFTs

```tsx
// components/nft/nft-skeleton.tsx
export function NFTSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card animate-pulse">
      <div className="aspect-square bg-muted rounded-t-xl" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex justify-between">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-6 bg-muted rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

// Usage in NFT marketplace
{isLoading ? (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <NFTSkeleton key={i} />
    ))}
  </div>
) : (
  // Render actual NFTs
)}
```

### Error Handling Pattern

```tsx
function useNFTsWithErrorHandling() {
  const dispatch = useAppDispatch()
  const nfts = useAppSelector(selectMarketplaceNFTs)
  const error = useAppSelector(selectMarketplaceError)
  const isLoading = useAppSelector(selectMarketplaceLoading)
  
  const refetch = useCallback(() => {
    dispatch(fetchMarketplaceNFTs())
  }, [dispatch])
  
  useEffect(() => {
    refetch()
  }, [refetch])
  
  return { nfts, error, isLoading, refetch }
}

// In component
const { nfts, error, isLoading, refetch } = useNFTsWithErrorHandling()

if (error) {
  return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={refetch}>Try Again</Button>
    </div>
  )
}
```

---

## Testing Checklist

### Quick Actions Implementation
- [ ] Selector imports work correctly
- [ ] Daily claim status reflects database state
- [ ] Reward amount updates after claiming
- [ ] Streak count displays correctly
- [ ] Visual indicator shows for unclaimed rewards

### NFT Marketplace Implementation
- [ ] NFTs load from API on page mount
- [ ] Loading skeleton shows during fetch
- [ ] Error state displays on failure
- [ ] Filtering by category works
- [ ] Sorting options work
- [ ] Search filters client-side correctly
- [ ] Bid placement calls API
- [ ] Bid success updates local state
- [ ] Bid errors show toast notification

### Dashboard Featured NFTs
- [ ] Featured NFTs load on dashboard mount
- [ ] Falls back gracefully if endpoint fails
- [ ] Click navigates to NFT detail
- [ ] Rarity badges display correctly

### Games Page
- [ ] Games load from API
- [ ] "Coming Soon" state shows for non-active games
- [ ] Categories filter correctly
- [ ] Rewards range displays properly
- [ ] Status badges show correctly

---

## Estimated Total Effort

| Task | Hours |
|------|-------|
| Quick Actions Dynamic | 1 |
| NFT Marketplace Connect | 4 |
| Dashboard Featured NFTs | 3 |
| Games Page Connect | 2 |
| Testing & QA | 2 |
| **Total** | **12 hours** |

---

## Next Steps After Completion

1. **Seed production database** with initial game and NFT data
2. **Monitor API performance** for marketplace queries
3. **Add caching** for featured NFTs (consider SWR or React Query)
4. **Implement pagination** for large NFT collections
5. **Begin game development** or third-party integration

---

*Document maintained by the LINE development team*

