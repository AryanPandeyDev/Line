# Repositories Layer

## Purpose

Repositories are the **data access layer** for the LINE Web3 Game Center. They encapsulate all Prisma queries and direct database interactions, providing a clean interface for services to read and write data without knowing the underlying database structure.

## Responsibilities

- **Database Queries**: All Prisma operations (findUnique, findMany, create, update, delete, aggregate)
- **Raw Queries**: Any direct SQL or Supabase-specific operations
- **Transaction Participation**: Accept transaction clients (`tx`) when operations need to be atomic
- **Query Building**: Construct complex filters, includes, and ordering for database queries
- **Data Mapping**: Transform raw database results into clean data shapes (but not business transformations)

## Guidelines for This Project

1. **No business logic in repositories** - if it involves a decision or calculation, it belongs in a service
2. **Accept transaction clients** - repositories should support running within a Prisma transaction when needed
3. **Single responsibility** - each repository handles one model or a tight cluster of related models
4. **Return Prisma types directly** - mappers/helpers transform these into DTOs
5. **Keep queries focused** - prefer multiple simple methods over one giant configurable method

## Planned Repositories

- `UserRepository` - user CRUD, profile queries, user lookups
- `ReferralRepository` - referral stats, tier queries, referred user lists
- `GameRepository` - game catalog, user game progress
- `TokenRepository` - token transactions, balance history
- `WalletRepository` - wallet records, wallet transactions
- `NFTRepository` - NFT catalog, listings, bids, ownership
- `TaskRepository` - task definitions, user task progress
- `AchievementRepository` - achievement definitions, user achievements
- `StreakRepository` - streak records, streak rewards configuration
- `NotificationRepository` - user notifications

## Transaction Example

```typescript
// In a service:
await db.$transaction(async (tx) => {
  await userRepository.updateBalance(tx, userId, amount);
  await tokenRepository.createTransaction(tx, { ... });
});
```
