# Services Layer

## Purpose

Services contain all **business logic** for the LINE Web3 Game Center. They orchestrate operations across multiple repositories, enforce domain rules, and handle complex workflows like user registration, referral processing, streak calculations, and token transactions.

## Responsibilities

- **Business Logic**: All domain-specific rules and calculations (XP leveling, streak rewards, commission rates, token balances)
- **Orchestration**: Coordinate multiple repository operations within business transactions
- **Validation**: Enforce business rules that go beyond simple data validation (e.g., "user cannot refer themselves", "insufficient balance for purchase")
- **Event Triggering**: Initiate side effects like notifications, achievement checks, and analytics events after successful operations

## Guidelines for This Project

1. **Route handlers must stay thin** - they should only parse requests, authenticate, call services, and return responses
2. **No Prisma imports in services** - services should receive repositories via dependency injection or import from the repositories layer
3. **Services should be stateless** - all state comes from repositories or function parameters
4. **Services can call other services** - but be mindful of circular dependencies
5. **Return domain objects or DTOs** - not raw Prisma models (transform in helpers/mappers)

## Planned Services

- `UserService` - user creation, profile updates, XP progression
- `ReferralService` - referral code application, tier calculations, commission rewards
- `GameService` - game progress tracking, reward distribution
- `TokenService` - token transfers, balance operations, transaction history
- `WalletService` - wallet connection, blockchain sync, transaction recording
- `NFTService` - NFT listings, bids, purchases, ownership transfers
- `TaskService` - task progress, reward claims
- `AchievementService` - achievement unlocks, progress tracking
- `StreakService` - daily streak logic, reward calculations
