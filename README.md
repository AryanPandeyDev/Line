# LINE | Web3 Game Center

> **The ultimate neon cyberpunk gaming platform** - Play games, earn LINE tokens, collect NFTs, and connect with the Vara Network.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Current Implementation Status](#%EF%B8%8F-current-implementation-status)
- [Mock Features & Implementation Plans](#-mock-features--implementation-plans)
- [Database Schema](#database-schema)
- [Architecture & Data Flow](#%EF%B8%8F-architecture--data-flow)
- [API Routes](#api-routes)
- [State Management](#state-management)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## 🎯 Overview

LINE is a **Web3 gaming platform** that combines traditional gaming experiences with blockchain technology. Users can play games, earn LINE tokens, participate in a referral program, collect and trade NFTs, and connect their Vara Network wallets.

### Core Concepts

- **Play-to-Earn**: Users earn LINE tokens by playing games
- **NFT Marketplace**: Buy, sell, and trade NFTs using VARA or LINE tokens
- **Referral System**: Multi-tier referral program with commission-based rewards
- **Achievements & Progression**: XP-based leveling system with achievements
- **Daily Streaks**: Reward users for consecutive daily logins
- **Wallet Integration**: Connect Vara Network wallets (SubWallet) for blockchain transactions

---

## ⚠️ Current Implementation Status

> [!IMPORTANT]
> This section provides an accurate assessment of what is **fully implemented**, **partially implemented**, and **mock/placeholder** as of December 2024.

### ✅ Fully Implemented (Production-Ready)

| Feature | Description | Location |
|---------|-------------|----------|
| **Authentication** | Full Clerk integration with database syncing, protected routes | `middleware.ts`, `app/api/user/` |
| **User Profile** | Real-time stats (Level, XP, Balance) fetched from PostgreSQL via Redux | `auth-slice.ts`, `userService.ts` |
| **User Creation** | Auto-creates users on first login with welcome bonus | `db-helpers.ts`, `userRepo.ts` |
| **Referral System** | Full referral code generation, application, tier tracking, referral stats | `referralService.ts`, `app/(protected)/referral/` |
| **Daily Streak System** | Track consecutive logins, claim streak rewards | `streakService.ts`, `tokens-slice.ts` |
| **Task System** | Database-backed tasks with progress tracking, completion, claiming | `taskService.ts`, `app/(protected)/earn/` |
| **Achievement System** | Achievement definitions, progress tracking, unlocking, claiming | `achievementService.ts`, `achievements-slice.ts` |
| **Token Transactions** | Internal token balance management (add/spend/transfer) | `tokenService.ts`, `db-helpers.ts` |
| **Wallet Connection** | SubWallet integration, address storage in database | `wallet-slice.ts`, `walletService.ts` |
| **On-Chain Balances** | Real VARA balance fetching via Gear API | `/api/wallet/state/`, `/api/wallet/onchain-balance/` |
| **LINE Token Contract** | Deployed on Vara Testnet with minter functionality | `contracts/line_token/` |
| **Layered Architecture** | Clean service/repository/helper separation | `src/lib/services/`, `src/lib/repositories/` |
| **Database Schema** | 18 Prisma models for all features | `prisma/schema.prisma` |

### 🟡 Partially Implemented (Backend Ready, Frontend Uses Mock Data)

| Feature | Backend Status | Frontend Status | Gap |
|---------|---------------|-----------------|-----|
| **Games Catalog** | ✅ `gameService.ts` with `/api/games` endpoint | ❌ Uses `mockGames` array | Connect frontend to API |
| **NFT Marketplace** | ✅ `nftService.ts` with `/api/nfts` endpoint | ❌ Uses `mockNFTs` array | Connect frontend to API |
| **NFT Bidding** | ✅ Backend bid logic in `nftService.placeBid()` | ❌ Client-side only | Wire frontend to POST `/api/nfts` |
| **LINE Token Balance** | ✅ On-chain query exists | ⚠️ Display only | No minting integration yet |

### 🚧 Mock Data & Static UI (Not Yet Connected)

| Feature | Current State | Mock Location |
|---------|--------------|---------------|
| **Games Page** | Shows "Coming Soon" with hardcoded game previews | `app/(protected)/games/page.tsx` - `mockGames` |
| **NFT Marketplace** | Displays static NFTs, bidding simulated client-side | `app/(protected)/nft-market/page.tsx` - `mockNFTs` |
| **Dashboard Featured NFTs** | Hardcoded NFT cards | `app/(protected)/dashboard/page.tsx` - `featuredNFTs` |
| **Dashboard Quick Actions** | Static "100 LINE available" text | `app/(protected)/dashboard/page.tsx` |
| **Gameplay Rewards** | No actual game exists to trigger rewards | Games are coming soon |

### ❌ Not Yet Implemented

| Feature | Description | Required Work |
|---------|-------------|---------------|
| **Actual Games** | No playable games exist | Build or integrate games |
| **Game Reward Flow** | `POST /api/games/progress` not wired to gameplay | Need games first |
| **NFT Purchase Flow** | Buy/transfer NFT on-chain | Smart contract + backend |
| **NFT Listing Creation** | Users listing owned NFTs | Frontend + backend flow |
| **Token Minting (Backend)** | Backend-triggered LINE token mints | Minter key integration |
| **On-Chain Token Transfers** | Send LINE/VARA between users | Transaction signing |
| **NFT Smart Contract** | NFT minting/ownership on Vara | Contract development |

---

## 🔴 Mock Features & Implementation Plans

### 1. **Games Page - `mockGames` Array**

**Location**: `app/(protected)/games/page.tsx` (lines 16-55)

**Current State**:
```typescript
const mockGames = [
  { id: 1, title: "Neon Racers", status: "coming-soon", ... },
  { id: 2, title: "Cyber Arena", status: "coming-soon", ... },
  { id: 3, title: "Void Explorers", status: "coming-soon", ... },
  { id: 4, title: "Synth Poker", status: "coming-soon", ... },
]
```

**Implementation Plan**:

1. **Phase 1 - Connect to Backend** (1-2 hours)
   - Replace `mockGames` with `useEffect` + `dispatch(fetchGames())`
   - Create `games-slice.ts` with `fetchGames` async thunk
   - Call `GET /api/games` which already exists and works

2. **Phase 2 - Seed Database** (30 mins)
   - Create `prisma/seed-games.ts` to populate `Game` table
   - Set games with `status: COMING_SOON` until playable

3. **Phase 3 - Build Actual Games** (Weeks/Months)
   - Integrate third-party Web3 games OR build mini-games
   - Implement `POST /api/games/progress` endpoint
   - Wire gameplay completion to token/XP rewards

**Files to Modify**:
- `app/(protected)/games/page.tsx` - Remove mock, add Redux
- `lib/redux/slices/games-slice.ts` - Create new slice
- `prisma/seed.sql` - Add game seed data

---

### 2. **NFT Marketplace - `mockNFTs` Array**

**Location**: `app/(protected)/nft-market/page.tsx` (lines 14-78)

**Current State**:
```typescript
const mockNFTs = [
  { id: "1", name: "Cyber Phantom", currentBid: 15.6, ... },
  // ... 8 hardcoded NFTs
]
```

**Implementation Plan**:

1. **Phase 1 - Connect to Backend** (2-3 hours)
   - Create `nfts-slice.ts` async thunk `fetchMarketplaceNFTs()`
   - Call existing `GET /api/nfts` endpoint
   - Replace `mockNFTs` with Redux state

2. **Phase 2 - Real Bidding** (2-3 hours)
   - Wire "Place Bid" button to `POST /api/nfts { action: "bid" }`
   - Backend already validates and stores bids in `NFTBid` table
   - Add optimistic updates and error handling

3. **Phase 3 - Seed NFT Data** (1 hour)
   - Create seed script for `NFT` and `NFTListing` tables
   - Create test NFT images or use existing public assets

4. **Phase 4 - On-Chain Integration** (Future)
   - Deploy NFT smart contract on Vara
   - Implement NFT minting, transfer, ownership verification
   - Create `WalletTransaction` records for on-chain actions

**Files to Modify**:
- `app/(protected)/nft-market/page.tsx` - Remove mock, add Redux
- `lib/redux/slices/nfts-slice.ts` - Add marketplace thunks
- `src/lib/services/nftService.ts` - Enhance purchase flow

---

### 3. **Dashboard Featured NFTs - `featuredNFTs` Array**

**Location**: `app/(protected)/dashboard/page.tsx` (lines 18-27)

**Current State**:
```typescript
const featuredNFTs = [
  { id: 1, name: "Cyber Wolf", image: "...", rarity: "Epic" },
  // ... 4 hardcoded NFTs
]
```

**Implementation Plan**:

1. **Phase 1 - Create Featured NFTs Endpoint** (1-2 hours)
   - Add `GET /api/nfts/featured` endpoint
   - Query `NFTListing` by views/likes, limit 4-6
   - Add caching for performance

2. **Phase 2 - Connect Dashboard** (1 hour)
   - Add `fetchFeaturedNFTs()` thunk to `nfts-slice.ts`
   - Replace hardcoded array with Redux selector
   - Add loading skeleton

**Files to Modify**:
- `app/(protected)/dashboard/page.tsx` - Use Redux state
- `app/api/nfts/featured/route.ts` - New endpoint
- `src/lib/services/nftService.ts` - Add `getFeaturedNFTs()`
- `lib/redux/slices/nfts-slice.ts` - Add featured state

---

### 4. **Dashboard Quick Actions - Static Text**

**Location**: `app/(protected)/dashboard/page.tsx` (lines 148-155)

**Current State**:
```tsx
<p className="text-xs text-muted-foreground">100 LINE available</p>
```

**Implementation Plan**:

1. **Phase 1 - Dynamic Daily Reward** (1 hour)
   - Already have `selectNextRewardAmount` in `tokens-slice.ts`
   - Already have `selectDailyClaimAvailable` selector
   - Just need to import and use these selectors

2. **Phase 2 - Conditional Display** (30 mins)
   - Show "Claim Available!" if `dailyClaimAvailable`
   - Show "Claimed Today" if already claimed
   - Show streak bonus amount

**Files to Modify**:
- `app/(protected)/dashboard/page.tsx` - Import selectors, conditionally render

---

### 5. **Wallet Balance Display - Partial Mock**

**Location**: `app/(protected)/wallet/page.tsx`, `lib/redux/slices/wallet-slice.ts`

**Current State**:
- VARA balance: ✅ Real (fetched via Gear API)
- LINE balance: 🟡 Reads from on-chain but minting not integrated
- Transaction history: ❌ From database, not chain

**Implementation Plan**:

1. **Phase 1 - Confirm On-Chain Balance Working** (Testing)
   - Verify `/api/wallet/state` returns real VARA balance
   - Verify LINE balance query works with deployed contract

2. **Phase 2 - Backend Minting Integration** (4-8 hours)
   - Set up secure minter key management (KMS/Vault)
   - Create `POST /api/tokens/mint` endpoint
   - Implement daily mint cap checks
   - Create `pending_mint_tx` tracking table

3. **Phase 3 - Transaction History from Chain** (Future)
   - Query blockchain for actual transaction history
   - Or use indexer service for historical data

**Files to Modify**:
- `app/api/tokens/mint/route.ts` - New endpoint
- `src/lib/services/tokenService.ts` - Add `mintToUser()`
- Add KMS/Vault integration for minter key

---

## 📊 Mock Feature Summary

| Mock Feature | Priority | Effort | Dependencies |
|--------------|----------|--------|--------------|
| Dashboard Quick Actions | High | 1 hour | None |
| Dashboard Featured NFTs | High | 2-3 hours | NFT seed data |
| NFT Marketplace Connection | High | 3-4 hours | NFT seed data |
| Games Page Connection | Medium | 2 hours | Game seed data |
| Backend Token Minting | Medium | 8+ hours | KMS setup, security review |
| Actual Playable Games | Low | Weeks | Game development |
| On-Chain NFT Integration | Low | Weeks | NFT contract development |

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.7 | React framework (App Router) |
| React | 19.2.0 | UI library |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 4.1.9 | Styling with cyberpunk theme |
| Redux Toolkit | latest | State management |
| Radix UI | latest | Accessible UI primitives |
| Recharts | 2.15.4 | Charts and visualizations |
| React Hook Form | latest | Form handling |
| Zod | latest | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Next.js API Routes | - | REST API endpoints |
| Clerk | latest | Authentication |
| Prisma | 7.1.0 | ORM |
| PostgreSQL | - | Database (via Supabase) |
| pg | latest | PostgreSQL driver |

### Blockchain
| Technology | Version | Purpose |
|------------|---------|---------|
| Vara Network | Testnet | Blockchain network |
| @gear-js/api | 0.44.2 | Vara chain interaction |
| @polkadot/util | 14.0.1 | Crypto utilities |
| LINE Token Contract | Deployed | Custom fungible token |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | latest | Test runner |
| v8 | - | Code coverage |

---

## 📁 Project Structure

```
Line/
├── app/                          # Next.js App Router
│   ├── (protected)/              # Protected routes (require auth)
│   │   ├── dashboard/            # User dashboard
│   │   ├── games/                # Games catalog (MOCK DATA)
│   │   ├── earn/                 # Tasks & earning (REAL DATA)
│   │   ├── nft-market/           # NFT marketplace (MOCK DATA)
│   │   ├── wallet/               # Wallet management (PARTIAL)
│   │   ├── profile/              # User profile (REAL DATA)
│   │   └── referral/             # Referral program (REAL DATA)
│   ├── api/                      # API Routes
│   │   ├── user/                 # User CRUD ✅
│   │   ├── games/                # Games data ✅ (not connected to UI)
│   │   ├── nfts/                 # NFT operations ✅ (not connected to UI)
│   │   ├── wallet/               # Wallet operations ✅
│   │   ├── tasks/                # Task management ✅
│   │   ├── achievements/         # Achievement tracking ✅
│   │   ├── tokens/               # Token transactions ✅
│   │   └── referrals/            # Referral system ✅
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   └── layout.tsx                # Root layout
│
├── src/lib/                      # Backend business logic
│   ├── services/                 # Business logic layer
│   │   ├── userService.ts        # User operations
│   │   ├── gameService.ts        # Game catalog
│   │   ├── nftService.ts         # NFT marketplace
│   │   ├── walletService.ts      # Wallet operations
│   │   ├── taskService.ts        # Task management
│   │   ├── referralService.ts    # Referral program
│   │   ├── tokenService.ts       # Token transactions
│   │   ├── achievementService.ts # Achievements
│   │   └── streakService.ts      # Daily streaks
│   ├── repositories/             # Data access layer
│   ├── models/                   # TypeScript types
│   ├── helpers/                  # Pure calculation functions
│   └── utils/                    # Generic utilities
│
├── lib/                          # Shared utilities
│   ├── redux/                    # Redux store & slices
│   │   └── slices/               # 8 Redux slices
│   ├── db.ts                     # Prisma client
│   ├── db-helpers.ts             # Database utilities
│   └── generated/                # Prisma generated client
│
├── components/                   # React components
│   ├── ui/                       # 59 reusable UI components
│   ├── layout/                   # Layout components
│   ├── nft/                      # NFT components
│   └── modals/                   # Modal dialogs
│
├── contracts/                    # Smart contracts
│   └── line_token/               # LINE token (Vara/Gear)
│
├── prisma/
│   └── schema.prisma             # 18 database models
│
├── tests/                        # Test suites
│   ├── services/
│   ├── repositories/
│   └── helpers/
│
└── docs/                         # Documentation
    ├── architecture_boundaries.md
    ├── backend_architecture.md
    ├── backend_minter_integration.md
    └── line_token_deploy.md
```

---

## 🗄 Database Schema

The application uses **PostgreSQL** with **Prisma ORM**. The schema includes **18 models**:

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts & progression | `clerkId`, `level`, `xp`, `tokenBalance`, `referralCode` |
| **Wallet** | Vara wallet connection | `address`, `network`, `varaBalance`, `lineBalance` |
| **Game** | Game catalog | `name`, `category`, `status`, `rewardMin`, `rewardMax` |
| **UserGameProgress** | Per-user game stats | `gamesPlayed`, `wins`, `highScore`, `tokensEarned` |

### Economy Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **TokenTransaction** | Token movement log | `type`, `amount`, `balance`, `source` |
| **WalletTransaction** | Blockchain transactions | `type`, `txHash`, `status`, `tokenType` |

### NFT Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **NFT** | NFT metadata | `tokenId`, `name`, `rarity`, `collection` |
| **NFTListing** | Marketplace listings | `price`, `tokenType`, `status`, `expiresAt` |
| **NFTBid** | Bids on listings | `amount`, `isWinning` |
| **UserNFT** | Ownership junction | `acquiredAt`, `isFavorite` |

### Gamification Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Task** | Task definitions | `type`, `reward`, `xpReward`, `targetProgress` |
| **UserTask** | User task progress | `status`, `progress` |
| **Achievement** | Achievement definitions | `name`, `xpReward`, `tokenReward`, `targetValue` |
| **UserAchievement** | User achievement progress | `progress`, `isUnlocked` |
| **DailyStreak** | Login streak tracking | `currentStreak`, `longestStreak`, `lastClaimDate` |
| **StreakReward** | Streak day rewards | `day`, `reward` |

### Referral Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **ReferralStats** | User referral stats | `totalReferrals`, `totalEarned`, `currentTier` |
| **ReferralTier** | Tier configuration | `tier`, `requiredReferrals`, `reward`, `commissionRate` |

### Other Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Notification** | User notifications | `title`, `message`, `type`, `isRead` |

---

## 🏗️ Architecture & Data Flow

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│              (React Components + Redux)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE HANDLERS                            │
│         app/api/**/route.ts (thin controllers)               │
│  • Clerk auth() • Validate input • Call service • Respond    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│              src/lib/services/*.ts                           │
│  • Business logic • Orchestrate repos • Apply domain rules   │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│   REPOSITORY LAYER     │   │        HELPER LAYER            │
│ src/lib/repositories/  │   │     src/lib/helpers/           │
│  • Prisma queries      │   │  • Pure calculations           │
│  • Data access only    │   │  • XP formulas, fees           │
└────────────────────────┘   └────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRISMA / DATABASE                         │
│                     (PostgreSQL)                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Data Flows

**User Creation Flow**:
```
Clerk Sign Up → First API Call → getUserByClerkId(createIfNotExists: true)
  → Generate username/referral code → Create User + ReferralStats + DailyStreak
  → Redux stores user state
```

**Daily Reward Claim Flow**:
```
User clicks "Claim" → dispatch(claimDailyRewardAsync())
  → POST /api/tokens (action: claimDaily)
  → streakService.claimDaily() → Update streak, add tokens
  → Create TokenTransaction → Return new balance
  → Redux updates state → UI reflects new balance
```

**Wallet Connection Flow**:
```
User clicks "Connect Wallet" → dispatch(connectSubwallet())
  → SubWallet extension.accounts.get() → Get address
  → POST /api/wallet (action: connect) → walletService.connectWallet()
  → Create/Update Wallet record → Fetch on-chain balances
  → Redux stores wallet state
```

---

## 🌐 API Routes

| Endpoint | Methods | Status | Description |
|----------|---------|--------|-------------|
| `/api/user` | GET, PATCH | ✅ Working | User profile CRUD |
| `/api/games` | GET | ✅ Working | Games catalog |
| `/api/nfts` | GET, POST | ✅ Working | NFT listings, bidding |
| `/api/wallet` | GET, POST | ✅ Working | Wallet connect/disconnect |
| `/api/wallet/state` | GET | ✅ Working | On-chain balances |
| `/api/wallet/onchain-balance` | GET | ✅ Working | LINE token balance |
| `/api/tasks` | GET, POST | ✅ Working | Task progress, claiming |
| `/api/achievements` | GET, POST | ✅ Working | Achievement tracking |
| `/api/tokens` | GET, POST | ✅ Working | Token transactions |
| `/api/referrals` | GET, POST | ✅ Working | Referral management |

---

## 🏪 State Management

Redux Toolkit with **8 slices**:

| Slice | Purpose | Key Selectors |
|-------|---------|---------------|
| `auth-slice` | User profile, XP, level | `selectUser`, `selectTokenBalance` |
| `wallet-slice` | Wallet connection, balances | `selectIsWalletConnected`, `selectWallet` |
| `nfts-slice` | NFT inventory, marketplace | `selectInventory`, `selectListings` |
| `tasks-slice` | Tasks, progress | `selectTasks`, `selectTasksSummary` |
| `tokens-slice` | Token transactions, streak | `selectDailyClaimAvailable`, `selectCurrentStreak` |
| `achievements-slice` | Achievements | `selectAchievements`, `selectUnlockedAchievements` |
| `referral-slice` | Referral data | `selectReferralStats`, `selectReferredUsers` |
| `ui-slice` | Modal state | `selectActiveModal` |

---

## ✨ Key Features

### Fully Functional
1. **Dashboard** - Real user stats, level, XP, token balance
2. **Earn Page** - Database-backed tasks, daily streaks, rewards
3. **Referral Program** - Code generation, application, tier progression
4. **Profile** - Edit username, view achievements, game stats
5. **Wallet** - SubWallet connection, VARA balance display

### Partially Functional (Backend Ready)
6. **Games** - Backend API exists, frontend shows "Coming Soon"
7. **NFT Marketplace** - Backend API exists, frontend uses mock data

### Planned
8. **Playable Games** - Actual game integration
9. **On-Chain Token Rewards** - Backend minting flow
10. **NFT Trading** - On-chain NFT smart contract

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (Supabase recommended)
- Clerk account for authentication
- SubWallet browser extension (for wallet features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Line

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma db push

# Start development server
pnpm dev
```

### Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run linter
pnpm test         # Run tests
pnpm test:coverage # Run tests with coverage
```

---

## 🔧 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Vara Network
NEXT_PUBLIC_VARA_NETWORK="testnet"
NEXT_PUBLIC_VARA_RPC_URL="wss://testnet.vara.network"

# LINE Token Contract (Deployed)
LINE_TOKEN_PROGRAM_ID="0x9ed2e4d572c01130463cfc67747e2a535d504556b0c443a1ddf1109e416a05ba"
```

---

## 📝 Additional Documentation

- **[Architecture Boundaries](./docs/architecture_boundaries.md)** - Layer rules and forbidden actions
- **[Backend Architecture](./docs/backend_architecture.md)** - Service/Repository patterns
- **[LINE Token Deploy](./docs/line_token_deploy.md)** - Smart contract deployment guide
- **[Backend Minter Integration](./docs/backend_minter_integration.md)** - Token minting flow

---

## 🎨 Design System

### Color Palette (Cyberpunk Theme)
- **Primary**: `#00f0ff` (Cyan)
- **Secondary**: `#a855f7` (Purple)
- **Magenta**: `#ff00ff`
- **Background**: `#0a0a12` (Dark Navy)
- **Surface**: `#1a1a2e` (Lighter Navy)

### Typography
- **Headings**: Orbitron (futuristic)
- **Body**: Inter (readable)

### Components
59 reusable UI components built with Radix UI primitives.

---

## 📄 License

Proprietary - All rights reserved.

---

**Built with ❤️ using Next.js, Prisma, Redux, and Vara Network**

*Last Updated: December 2024*
