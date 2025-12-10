# Helpers Layer

## Purpose

Helpers contain **pure calculation and mapping functions** for the LINE Web3 Game Center. These are stateless functions with no side effects - they take inputs and produce outputs without touching the database, network, or external state.

## Responsibilities

- **Calculations**: XP formulas, streak bonuses, commission rates, level thresholds
- **Data Mapping**: Transform Prisma models to API response DTOs
- **Formatting**: Display formatting (dates, numbers, tokens, usernames)
- **Validation**: Pure validation logic (format checks, range checks)
- **Code Generation**: Referral codes, random usernames, unique identifiers

## Guidelines for This Project

1. **No side effects** - helpers must not call databases, APIs, or modify external state
2. **No async operations** - if it needs async, it probably belongs in a service or repository
3. **Pure functions** - same inputs always produce same outputs
4. **Small and focused** - each helper does one thing well
5. **Easy to test** - helpers should be trivial to unit test without mocking

## Current Functions to Migrate

The following functions from `lib/db-helpers.ts` are pure helpers and will move here:

- `generateReferralCode()` - generate unique referral codes (LINE-XXXXXXXX)
- `generateRandomUsername()` - generate random usernames (user_XXXXXX)
- `calculateXPForLevel(level)` - calculate XP needed for a given level

## Planned Helpers

- **User Mappers**: `toUserResponse()`, `toUserProfile()`, `toUserStats()`
- **Referral Mappers**: `toReferralInfo()`, `formatTiers()`, `toReferredUser()`
- **Game Mappers**: `toGameResponse()`, `calculateReward()`
- **Streak Calculators**: `calculateStreakReward()`, `isConsecutiveDay()`
- **Token Formatters**: `formatTokenAmount()`, `formatBalance()`
- **Date Helpers**: `formatDate()`, `isWithinDays()`, `getStartOfDay()`
- **Validation**: `isValidUsername()`, `isValidReferralCode()`

## Example

```typescript
// helpers/xp.ts
export function calculateXPForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.2, level - 1));
}

// helpers/referral.ts
export function generateReferralCode(): string {
  return `LINE-${nanoid(8).toUpperCase()}`;
}
```
