# Models Layer

## Purpose

Models contain **TypeScript types and interfaces** for the LINE Web3 Game Center. This layer defines the data shapes used throughout the application - DTOs for API responses, domain entities, request payloads, and shared type definitions.

## Responsibilities

- **API Response Types**: Strongly-typed interfaces for all API endpoints (UserResponse, GameListResponse, etc.)
- **Request Types**: Input validation types for API requests and service method parameters
- **Domain Types**: Core domain entities that may differ from raw Prisma types
- **Enum Definitions**: Business-level enums (if needed beyond Prisma enums)
- **Utility Types**: Shared type utilities like `Result<T>`, `Paginated<T>`, etc.

## Guidelines for This Project

1. **Pure types only** - no runtime code, no functions, no classes with methods
2. **Prefer interfaces over types** - for extendability and better error messages
3. **Mirror domain concepts** - types should reflect the LINE Game Center domain, not internal implementation
4. **Document with JSDoc** - add comments explaining field purposes when not obvious
5. **Export from index** - provide clean exports from `models/index.ts` for easy imports

## Planned Types

- **User**: `UserResponse`, `UserProfile`, `UserStats`, `UserUpdateRequest`
- **Referral**: `ReferralInfo`, `ReferralTier`, `ReferredUser`, `ReferralStats`
- **Game**: `Game`, `GameProgress`, `GameReward`, `GameCategory`
- **Token**: `TokenTransaction`, `TokenBalance`, `TransactionType`
- **Wallet**: `WalletInfo`, `WalletTransaction`, `ConnectionStatus`
- **NFT**: `NFT`, `NFTListing`, `NFTBid`, `NFTRarity`
- **Task**: `Task`, `UserTask`, `TaskProgress`, `TaskType`
- **Achievement**: `Achievement`, `UserAchievement`, `AchievementProgress`
- **Streak**: `DailyStreak`, `StreakReward`, `StreakClaim`

## Example

```typescript
// models/user.ts
export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  tokens: number;
  referralCode: string;
  totalPlayTimeHours: number;
}
```
