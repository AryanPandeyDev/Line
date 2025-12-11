# LINE | Web3 Game Center

> **The ultimate neon cyberpunk gaming platform** - Play games, earn LINE tokens, collect NFTs, and connect with the Vara Network.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Data Flow Architecture](#data-flow-architecture)
- [Authentication Flow](#authentication-flow)
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
- **Wallet Integration**: Connect Vara Network wallets for blockchain transactions

---

## ⚠️ Current Implementation Status

> [!IMPORTANT]
> While the backend infrastructure is robust and production-ready, parts of the frontend currently rely on **mock data** for demonstration purposes.

### ✅ Real Data & Logic
The following features are fully connected to the backend and blockchain:
- **Authentication**: Full Clerk integration with database syncing.
- **User Profile**: Real-time stats (Level, XP, Balance) fetched from PostgreSQL via Redux.
- **User Profile**: Real-time stats (Level, XP, Balance) fetched from PostgreSQL via Redux.
- **Token System**: Internal logic for earning/spending LINE tokens is implemented in `db-helpers.ts` (Database-only, no on-chain tokens).

### 🚧 Mock Data & Static UI
The following features are currently **static** or use **mock data**:
- **Games Page**: Uses `mockGames` array. Gameplay does not yet trigger real backend transactions.
- **NFT Marketplace**: Uses `mockNFTs` array. Listings and bids are simulated on the client side.
- **Dashboard**: "Featured NFTs" and "Quick Actions" are placeholders and do not reflect real database state.
- **Wallet Connection**: **Simulated**. No actual blockchain interaction or smart contract deployment exists yet. Addresses are mocked.

### 🛠 Work Needed / Logic Gaps
To bring the platform to full functionality, the following connections need to be made:

1.  **Games Integration**:
    - Connect `GamesPage` to `/api/games` to fetch real game data.
    - Implement `POST /api/games/progress` to record actual gameplay sessions and award tokens/XP.

2.  **NFT Marketplace Integration**:
    - Connect `NFTMarketPage` to `/api/nfts`.
    - Replace client-side bidding with real database transactions (`NFTBid` model).
    - Implement the "Buy Now" flow using `WalletTransaction` and `TokenTransaction`.

3.  **Dashboard Wiring**:
    - Fetch "Featured NFTs" from the `NFTListing` table (e.g., top viewed/liked).
    - Fetch "Featured NFTs" from the `NFTListing` table (e.g., top viewed/liked).
    - Make "Quick Actions" dynamic based on user state (e.g., only show "Claim Daily Reward" if not yet claimed).

4.  **Blockchain Integration (Critical)**:
    - Implement real Vara Network connection using `@gear-js/api` and `@polkadot/extension-dapp`.
    - Deploy actual smart contracts for Tokens (VARA standard) and NFTs.
    - Replace simulated wallet logic in `wallet-slice.ts` with real chain interactions.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: [Next.js 16.0.7](https://nextjs.org/) (React 19.2.0)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4.1.9 with custom cyberpunk theme
- **UI Components**: Radix UI primitives
- **State Management**: Redux Toolkit with React-Redux
- **Fonts**: Orbitron (headings) & Inter (body)
- **Charts**: Recharts 2.15.4
- **Form Handling**: React Hook Form with Zod validation
- **Animations**: tailwindcss-animate

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes (App Router)
- **Authentication**: [Clerk](https://clerk.com/) (latest)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 7.1.0 with PostgreSQL adapter
- **Connection Pooling**: `@prisma/adapter-pg` with `pg` driver

### Blockchain (Planned)
- **Network**: Vara Network (Testnet & Mainnet support planned)
- **Token Types**: VARA (native) & LINE (platform token - currently DB only)

### Development Tools
- **Package Manager**: npm/pnpm
- **Linting**: ESLint
- **Analytics**: Vercel Analytics
- **Notifications**: Sonner (toast notifications)

### Testing
- **Unit & Integration**: Vitest
- **Coverage**: v8

---

## 📁 Project Structure

```
Line/
├── app/                          # Next.js App Router
│   ├── (protected)/              # Protected routes (require auth)
│   │   ├── dashboard/            # User dashboard
│   │   ├── games/                # Games catalog
│   │   ├── earn/                 # Tasks & earning opportunities
│   │   ├── nft-market/           # NFT marketplace
│   │   ├── wallet/               # Wallet management
│   │   ├── profile/              # User profile
│   │   └── referral/             # Referral program
│   ├── api/                      # API Routes
│   │   ├── user/                 # User CRUD operations
│   │   ├── games/                # Games data
│   │   ├── nfts/                 # NFT operations
│   │   ├── wallet/               # Wallet operations
│   │   ├── tasks/                # Task management
│   │   ├── achievements/         # Achievement tracking
│   │   ├── tokens/               # Token transactions
│   │   └── referrals/            # Referral system
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── layout.tsx                # Root layout (Clerk + Redux providers)
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI components (59 components)
│   ├── layout/                   # Layout components (header, sidebar, etc.)
│   ├── landing/                  # Landing page sections
│   ├── nft/                      # NFT-related components
│   ├── auth/                     # Authentication components
│   └── modals/                   # Modal dialogs
│
├── lib/                          # Utility libraries
│   ├── redux/                    # Redux store & slices
│   │   ├── store.ts              # Redux store configuration
│   │   ├── hooks.ts              # Typed Redux hooks
│   │   ├── provider.tsx          # Redux provider component
│   │   └── slices/               # Redux slices
│   │       ├── auth-slice.ts     # User authentication state
│   │       ├── wallet-slice.ts   # Wallet state
│   │       ├── nfts-slice.ts     # NFT state
│   │       ├── tasks-slice.ts    # Tasks state
│   │       ├── tokens-slice.ts   # Token transactions
│   │       ├── achievements-slice.ts
│   │       ├── referral-slice.ts
│   │       └── ui-slice.ts       # UI state (modals, etc.)
│   ├── generated/                # Prisma generated client
│   ├── db.ts                     # Prisma client initialization
│   ├── db-helpers.ts             # Database helper functions
│   └── utils.ts                  # Utility functions
│
├── prisma/                       # Prisma ORM
│   └── schema.prisma             # Database schema (467 lines)
│
├── public/                       # Static assets
├── styles/                       # Additional styles
├── hooks/                        # Custom React hooks
├── tests/                        # Unit & Integration tests
├── docs/                         # Documentation
├── middleware.ts                 # Clerk authentication middleware
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Vitest configuration
├── postcss.config.mjs            # PostCSS configuration
├── package.json                  # Dependencies
└── .env                          # Environment variables
```

---

## 🗄 Database Schema

The application uses **PostgreSQL** with **Prisma ORM**. The schema includes 18 models:

### Core Models

#### **User**
Central user model with authentication, progression, and economy.
- Authentication: `clerkId`, `email`, `username`
- Progression: `level`, `xp`, `xpToNextLevel`
- Economy: `tokenBalance`, `bonusPoints`, `totalEarned`
- Referrals: `referralCode`, `referredById`
- Relations: wallet, achievements, game progress, NFTs, tasks, referrals

#### **Wallet**
Vara Network wallet integration.
- Fields: `address`, `network`, `varaBalance`, `lineBalance`, `isConnected`
- Tracks wallet transactions and connection status

#### **Game**
Game catalog with metadata and status.
- Fields: `name`, `description`, `category`, `status`, `rewardMin`, `rewardMax`
- Categories: RACING, ACTION, ADVENTURE, CARDS, STRATEGY, PUZZLE, RPG, SIMULATION
- Status: ACTIVE, COMING_SOON, MAINTENANCE, DEPRECATED

#### **UserGameProgress**
Tracks individual game statistics per user.
- Fields: `gamesPlayed`, `wins`, `losses`, `highScore`, `totalPlayTime`, `tokensEarned`

### Economy Models

#### **TokenTransaction**
Records all token movements.
- Types: EARN, SPEND, TRANSFER, CLAIM, REFERRAL_BONUS, GAME_REWARD, DAILY_REWARD, STREAK_BONUS, ACHIEVEMENT_REWARD
- Fields: `amount`, `balance`, `source`, `metadata`

#### **WalletTransaction**
Blockchain transactions on Vara Network.
- Types: SEND, RECEIVE, NFT_PURCHASE, NFT_SALE, SWAP, STAKE, UNSTAKE
- Fields: `tokenType`, `amount`, `txHash`, `status`

### NFT Models

#### **NFT**
NFT metadata and ownership.
- Fields: `tokenId`, `contractAddress`, `name`, `image`, `rarity`, `collection`
- Rarity: COMMON, RARE, EPIC, LEGENDARY, MYTHIC

#### **NFTListing**
Active NFT marketplace listings.
- Fields: `price`, `tokenType`, `status`, `expiresAt`
- Status: LISTED, SOLD, CANCELLED, EXPIRED

#### **NFTBid**
Bids on NFT listings.
- Fields: `amount`, `tokenType`, `isWinning`

#### **UserNFT**
User-NFT ownership junction table.
- Fields: `acquiredAt`, `acquiredFor`, `isFavorite`

### Gamification Models

#### **Task**
Tasks users can complete for rewards.
- Types: DAILY, EXTERNAL, ACHIEVEMENT, ONBOARDING
- Fields: `reward`, `xpReward`, `targetProgress`, `isRepeatable`

#### **UserTask**
User progress on tasks.
- Status: ACTIVE, COMPLETED, EXPIRED, CLAIMED

#### **Achievement**
Achievement definitions.
- Fields: `name`, `description`, `xpReward`, `tokenReward`, `targetValue`

#### **UserAchievement**
User achievement progress.
- Fields: `progress`, `isUnlocked`, `unlockedAt`, `claimedAt`

#### **DailyStreak**
Daily login streak tracking.
- Fields: `currentStreak`, `longestStreak`, `lastClaimDate`, `claimedDays`

#### **StreakReward**
Reward configuration for streak days.

### Referral Models

#### **ReferralStats**
User referral statistics.
- Fields: `totalReferrals`, `activeReferrals`, `totalEarned`, `currentTier`, `commissionRate`

#### **ReferralTier**
Referral tier configuration.
- Fields: `tier`, `requiredReferrals`, `reward`, `commissionRate`, `bonus`

### Other Models

#### **Notification**
User notifications.
- Fields: `title`, `message`, `type`, `isRead`, `metadata`

---

## 🏗️ Architecture & Data Flow

> [!NOTE]
> This section describes the **target architecture**. See [Current Implementation Status](#%EF%B8%8F-current-implementation-status) for what is currently live.

### 1. **Client-Side Flow**

```
User Interaction
    ↓
React Component
    ↓
Redux Action Dispatch
    ↓
Redux Thunk (Async)
    ↓
API Route Call (fetch)
    ↓
Redux State Update
    ↓
Component Re-render
```

### 2. **Server-Side Flow**

```
API Route Request
    ↓
Clerk Authentication (middleware.ts)
    ↓
Get/Validate User (getUserByClerkId)
    ↓
Database Query (Prisma)
    ↓
Business Logic Processing
    ↓
Database Transaction (if needed)
    ↓
JSON Response
```

### 3. **Authentication Flow**

```
User visits protected route
    ↓
middleware.ts intercepts request
    ↓
Clerk checks authentication
    ↓
If not authenticated → Redirect to /login
    ↓
If authenticated → Allow access
    ↓
API routes validate Clerk userId
    ↓
Get/Create user in database
    ↓
Return user data
```

### 4. **User Creation Flow**

```
User signs up via Clerk
    ↓
First API call to /api/user
    ↓
getUserByClerkId (createIfNotExists: true)
    ↓
Generate unique username & referral code
    ↓
Create User record (500 LINE welcome bonus)
    ↓
Create ReferralStats record
    ↓
Create DailyStreak record
    ↓
Create TokenTransaction (welcome bonus)
    ↓
Return user data to client
    ↓
Redux stores user state
```

### 5. **Game Play Flow (In Development)**

```
User plays game
    ↓
Game completion triggers API call
    ↓
Update UserGameProgress (wins, score, playtime)
    ↓
Calculate token reward
    ↓
Add tokens via addTokensToUser()
    ↓
Create TokenTransaction (GAME_REWARD)
    ↓
Add XP via addXPToUser()
    ↓
Check for level up
    ↓
Check for achievement unlocks
    ↓
Return updated stats
    ↓
Update Redux state
```

### 6. **Referral Flow**

```
User A shares referral code
    ↓
User B signs up with code
    ↓
POST /api/referrals (action: apply)
    ↓
Validate referral code
    ↓
Database transaction:
    - Update User B (referredById)
    - Increment User A referral stats
    - Add 200 LINE tokens to User A
    - Create TokenTransaction (REFERRAL_BONUS)
    - Update ReferralStats.totalEarned
    ↓
Return success
```

### 7. **NFT Purchase Flow (In Development)**

```
User views NFT listing
    ↓
User places bid or buys
    ↓
POST /api/nfts (action: purchase)
    ↓
Check user token balance
    ↓
Database transaction:
    - Deduct tokens from buyer
    - Add tokens to seller
    - Update NFTListing status
    - Create UserNFT record
    - Create WalletTransaction
    - Create TokenTransactions
    ↓
Return updated NFT ownership
    ↓
Update Redux NFT state
```

### 8. **Wallet Connection Flow (Simulated)**

```
User clicks "Connect Wallet"
    ↓
Frontend initiates simulated connection (timeout)
    ↓
Generates mock address
    ↓
POST /api/wallet (action: connect)
    ↓
getOrCreateWallet(userId, address)
    ↓
Update wallet connection status
    ↓
Sync balances from blockchain
    ↓
Return wallet data
    ↓
Update Redux wallet state
```

---

## 🔐 Authentication Flow

The application uses **Clerk** for authentication with custom middleware:

### Middleware (`middleware.ts`)

1. **Public Routes**: `/`, `/login`, `/signup`, `/api/webhooks`
2. **Protected Routes**: All other routes require authentication
3. **Redirect Logic**: Unauthenticated users redirected to `/login?redirect_url=<original_path>`

### User Sync Process

1. **Clerk** handles OAuth, email/password authentication
2. **First API call** triggers user creation in database
3. **getUserByClerkId** helper:
   - Checks if user exists by `clerkId`
   - If not, creates user with Clerk data
   - Generates unique username and referral code
   - Creates associated records (ReferralStats, DailyStreak)
   - Awards 500 LINE token welcome bonus

### Session Management

- Clerk manages sessions via cookies
- Every API route validates `auth()` from `@clerk/nextjs/server`
- User data cached in Redux for client-side access

---

## 🌐 API Routes

All API routes are located in `app/api/` and follow RESTful conventions:

### `/api/user`
- **GET**: Fetch current user profile with stats
- **PATCH**: Update user profile (username, displayName, avatarUrl)

### `/api/games`
- **GET**: Fetch all games or specific game data
- **POST**: Update game progress, record gameplay

### `/api/nfts`
- **GET**: Fetch NFT listings, user NFTs
- **POST**: Create listing, place bid, purchase NFT

### `/api/wallet`
- **GET**: Fetch wallet data and transactions
- **POST**: Connect wallet, sync balances, create transactions

### `/api/tasks`
- **GET**: Fetch available tasks and user progress
- **POST**: Start task, update progress, claim reward

### `/api/achievements`
- **GET**: Fetch achievements and user progress
- **POST**: Unlock achievement, claim reward

### `/api/tokens`
- **GET**: Fetch token transaction history
- **POST**: Transfer tokens (future feature)

### `/api/referrals`
- **GET**: Fetch referral stats, tiers, referred users
- **POST**: Apply referral code

---

## 🏪 State Management

The application uses **Redux Toolkit** with 8 slices:

### Slices

1. **auth-slice.ts**: User authentication and profile data
2. **wallet-slice.ts**: Wallet connection and balances
3. **nfts-slice.ts**: NFT listings, bids, and user NFTs
4. **tasks-slice.ts**: Available tasks and user progress
5. **tokens-slice.ts**: Token transaction history
6. **achievements-slice.ts**: Achievements and user progress
7. **referral-slice.ts**: Referral stats and referred users
8. **ui-slice.ts**: UI state (modals, notifications)

### Store Configuration (`store.ts`)

```typescript
configureStore({
  reducer: {
    auth,
    wallet,
    nfts,
    tasks,
    tokens,
    achievements,
    referral,
    ui
  }
})
```

### Usage Pattern

```typescript
// In components
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'

const user = useAppSelector(state => state.auth.user)
const dispatch = useAppDispatch()

// Async thunks for API calls
dispatch(fetchUserData())
```

---

## ✨ Key Features

### 1. **Dashboard**
- User stats overview (level, XP, tokens, playtime)
- Recent activity feed
- Quick actions (play games, complete tasks)

### 2. **Games (Coming Soon)**
- Game catalog with categories and filters
- Game details with screenshots and ratings
- Play tracking with rewards

### 3. **Earn (Tasks)**
- Daily tasks for token rewards
- External tasks (social media, etc.)
- Achievement-based tasks
- Onboarding tasks for new users

### 4. **NFT Marketplace (UI Only)**
- Browse NFT collections
- Filter by rarity, price, collection
- Bid on listings or buy instantly
- List owned NFTs for sale

### 5. **Wallet (Simulated)**
- Connect Vara Network wallet (UI Demo)
- View VARA and LINE balances (Mocked)
- Transaction history (Mocked)
- Send/receive tokens

### 6. **Profile**
- Edit username and display name
- View achievements and progress
- Game statistics
- Transaction history

### 7. **Referral Program**
- Unique referral code and link
- Multi-tier rewards system
- Track referred users and earnings
- Commission on referral activity

### 8. **Daily Streaks**
- Login daily for increasing rewards
- 7-day cycle with bonus rewards
- Track current and longest streaks

### 9. **Achievements**
- Game-specific and global achievements
- XP and token rewards
- Progress tracking

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (Supabase recommended)
- Clerk account for authentication
- Vara Network wallet (for testing blockchain features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Line

# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The application will be available at `http://localhost:3000`.

---

## 🔧 Environment Variables

Required environment variables (create `.env` file):

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Vara Network (optional)
NEXT_PUBLIC_VARA_NETWORK="testnet"
NEXT_PUBLIC_VARA_RPC_URL="wss://testnet.vara.network"
```

---

## 📊 Database Helpers

The `lib/db-helpers.ts` file provides utility functions:

- `generateReferralCode()`: Generate unique referral codes
- `generateRandomUsername()`: Generate random usernames
- `getUserByClerkId()`: Get or create user by Clerk ID
- `getFullUserProfile()`: Get user with all relations
- `getOrCreateWallet()`: Get or create wallet for user
- `addTokensToUser()`: Add tokens and record transaction
- `spendTokensFromUser()`: Deduct tokens with validation
- `calculateXPForLevel()`: Calculate XP requirements
- `addXPToUser()`: Add XP and handle level ups
- `getDailyStreak()`: Get user's streak data
- `claimDailyStreak()`: Claim daily streak reward

---

## 🎨 Design System

### Color Palette (Cyberpunk Theme)

- **Primary**: `#00f0ff` (Cyan)
- **Secondary**: `#a855f7` (Purple)
- **Background**: `#0a0a12` (Dark Navy)
- **Surface**: `#1a1a2e` (Lighter Navy)
- **Border**: `#2a2a4a` (Blue-Gray)

### Typography

- **Headings**: Orbitron (futuristic, tech-inspired)
- **Body**: Inter (clean, readable)

### Components

59 reusable UI components built with Radix UI primitives:
- Buttons, Cards, Dialogs, Dropdowns
- Forms, Inputs, Selects, Checkboxes
- Tables, Tabs, Tooltips, Toasts
- Charts, Progress bars, Sliders
- And more...

---

## 📝 Notes

### Database Connection

The application uses **Supabase's connection pooler** with SSL certificate bypass:
- `NODE_TLS_REJECT_UNAUTHORIZED=0` for Supabase pooler compatibility
- `@prisma/adapter-pg` for connection pooling
- Prisma client generated to `lib/generated/prisma`

### TypeScript Configuration

- Strict mode enabled
- Build errors ignored (for development)
- Path alias: `@/*` maps to project root

### Next.js Configuration

- Image optimization disabled (`unoptimized: true`)
- TypeScript build errors ignored
- Webpack bundler (not Turbopack, due to Prisma compatibility)

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

## 📄 License

Proprietary - All rights reserved.

---

**Built with ❤️ using Next.js, Prisma, and Vara Network**
