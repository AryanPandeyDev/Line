# Backend Architecture - LINE Web3 Game Center

> **Target architecture documentation for backend code organization.**  
> This document is intended for both human developers and AI agents working on the codebase.

---

## Overview

The LINE Web3 Game Center backend is being restructured to follow a **clean layered architecture**. This improves maintainability, testability, and makes the codebase easier to navigate for both developers and AI assistants.

### Core Principle

**Separation of concerns**: Each layer has a single responsibility and communicates only with adjacent layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Route Handlers                         │
│              (thin controllers - parse, auth, respond)          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                         Services                                 │
│                  (business logic layer)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                       Repositories                               │
│                   (data access layer)                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Prisma / Supabase                             │
│                   (database layer)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/lib/
├── prisma/           # Prisma client setup and transaction helpers
│   └── client.ts     # Prisma client singleton
│
├── services/         # Business logic (domain rules, orchestration)
│   └── README.md     # Layer documentation
│
├── repositories/     # Data access (Prisma queries only)
│   └── README.md     # Layer documentation
│
├── models/           # TypeScript types and interfaces
│   └── README.md     # Layer documentation
│
├── helpers/          # Pure calculation and mapping functions
│   └── README.md     # Layer documentation
│
└── utils/            # Generic helpers (errors, results, logging)
    └── README.md     # Layer documentation
```

---

## Layer Responsibilities

### 1. Route Handlers (`app/api/**/route.ts`)

Route handlers are **thin controllers**. They should:

- ✅ Parse and validate incoming requests
- ✅ Authenticate via Clerk (`auth()`)
- ✅ Call service methods with validated inputs
- ✅ Transform service results to HTTP responses
- ✅ Handle errors and return appropriate status codes

They must **NOT**:

- ❌ Contain business logic (calculations, decisions, rules)
- ❌ Import or use Prisma client directly
- ❌ Access the database directly
- ❌ Contain complex if/else workflows

**Example pattern:**

```typescript
// app/api/user/route.ts
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return errorResponse(new UnauthorizedError())
  
  const result = await userService.getUserProfile(clerkId)
  if (!result.ok) return errorResponse(result.error)
  
  return NextResponse.json(result.value)
}
```

---

### 2. Services (`src/lib/services/`)

Services contain **all business logic**. They should:

- ✅ Implement domain rules (XP leveling, streak bonuses, commission rates)
- ✅ Orchestrate multiple repository calls
- ✅ Manage transactions when atomicity is required
- ✅ Validate business constraints ("user cannot refer themselves")
- ✅ Trigger side effects (notifications, achievement checks)

They must **NOT**:

- ❌ Write Prisma queries directly
- ❌ Parse HTTP requests or build responses
- ❌ Handle authentication
- ❌ Know about Next.js specifics

**Example pattern:**

```typescript
// src/lib/services/ReferralService.ts
export async function applyReferralCode(userId: string, code: string): Promise<Result<void>> {
  const user = await userRepository.findById(userId)
  if (!user) return err(new NotFoundError('User not found'))
  
  if (user.referredById) {
    return err(new ValidationError('Already used a referral code'))
  }
  
  const referrer = await userRepository.findByReferralCode(code)
  if (!referrer) return err(new NotFoundError('Invalid referral code'))
  if (referrer.id === userId) {
    return err(new ValidationError('Cannot use own referral code'))
  }
  
  await db.$transaction(async (tx) => {
    await userRepository.setReferrer(tx, userId, referrer.id)
    await referralRepository.incrementStats(tx, referrer.id)
    await tokenService.addBonus(tx, referrer.id, 200, 'Referral bonus')
  })
  
  return ok(undefined)
}
```

---

### 3. Repositories (`src/lib/repositories/`)

Repositories are the **data access layer**. They should:

- ✅ Contain all Prisma query logic
- ✅ Accept transaction clients (`tx`) for atomic operations
- ✅ Build queries with proper includes, filters, and ordering
- ✅ Return raw Prisma types or simple data structures

They must **NOT**:

- ❌ Contain business logic or decisions
- ❌ Call other services
- ❌ Transform data for API responses (use mappers in helpers)

**Example pattern:**

```typescript
// src/lib/repositories/UserRepository.ts
export async function findByClerkId(clerkId: string) {
  return db.user.findUnique({ where: { clerkId } })
}

export async function updateBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
) {
  return tx.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: amount } }
  })
}
```

---

### 4. Models (`src/lib/models/`)

Models contain **pure TypeScript types**. They should:

- ✅ Define API response shapes (DTOs)
- ✅ Define service input types
- ✅ Define domain entities when different from Prisma types
- ✅ Include JSDoc documentation

They must **NOT**:

- ❌ Contain any runtime code
- ❌ Have methods or classes
- ❌ Import Prisma types (keep decoupled from ORM)

---

### 5. Helpers (`src/lib/helpers/`)

Helpers contain **pure functions**. They should:

- ✅ Perform calculations (XP formulas, streak bonuses)
- ✅ Map data between shapes (Prisma → DTO)
- ✅ Generate values (referral codes, usernames)
- ✅ Validate formats

They must **NOT**:

- ❌ Access the database
- ❌ Make HTTP calls
- ❌ Have side effects
- ❌ Be async

---

### 6. Utils (`src/lib/utils/`)

Utils contain **generic infrastructure code**. They should:

- ✅ Define error types and error handling patterns
- ✅ Provide Result types for success/failure
- ✅ Include logging utilities
- ✅ Provide response builders

They should be **domain-agnostic** and reusable across projects.

---

## Critical Rules

### Rule 1: No Business Logic in Route Handlers

Route handlers are **controllers**, not business logic containers. If you find yourself writing `if/else` chains to make business decisions in a route handler, that logic belongs in a service.

### Rule 2: No Prisma in Services

Services call repositories, not Prisma directly. This keeps services testable (you can mock repositories) and prevents query sprawl throughout the codebase.

### Rule 3: No Business Logic in Repositories

Repositories execute queries. They don't decide *whether* to run a query or *what* to do with the results. That's the service's job.

### Rule 4: Helpers are Pure

A helper function with the same inputs must always produce the same outputs. No database calls, no randomness that isn't seeded, no external dependencies.

### Rule 5: Schema Changes Are Explicit

Prisma schema modifications (`prisma/schema.prisma`) are **never done automatically**. Schema changes require:

1. Explicit discussion and approval
2. Migration planning
3. Careful consideration of production data

---

## Data Flow Example: User Fetches Profile

```
1. GET /api/user
   └─> Route handler authenticates via Clerk
   
2. Route handler calls userService.getProfile(clerkId)
   └─> Service calls userRepository.findByClerkId(clerkId)
   └─> Service calls gameProgressRepository.getTotalPlayTime(userId)
   └─> Service calls referralRepository.getStats(userId)
   
3. Service combines data using helpers
   └─> toUserProfileResponse(user, playTime, referralStats)
   
4. Service returns Result<UserProfileResponse>

5. Route handler returns NextResponse.json(result.value)
```

---

## Migration Strategy

The current codebase has:

- Business logic mixed into route handlers (`app/api/**/route.ts`)
- Database + logic mixed in `lib/db-helpers.ts`
- Prisma client at `lib/db.ts`

### Phase 1 (Complete) ✅
- Created folder structure under `src/lib/`
- Added README documentation for each layer
- Created this architecture document

### Phase 2 (Next Steps)
- Extract pure helpers from `lib/db-helpers.ts` to `src/lib/helpers/`
- Move Prisma client to `src/lib/prisma/client.ts`
- Create initial repository layer

### Phase 3
- Extract business logic from route handlers to services
- Route handlers become thin controllers

### Phase 4
- Add proper TypeScript types in models
- Add error handling utilities
- Add Result pattern for service returns

---

## For AI Agents

When working on this codebase:

1. **Before modifying route handlers**, check if the logic belongs in a service
2. **Before adding Prisma queries**, check if a repository exists or should be created
3. **Respect layer boundaries** - don't bypass architecture for convenience
4. **Check READMEs** in each layer folder for specific guidance
5. **Ask before schema changes** - never modify `prisma/schema.prisma` without explicit approval

---

## Current Files to Refactor (Reference)

These files contain code that will be distributed across the new architecture:

| Current File | Contains | Target Location |
|--------------|----------|-----------------|
| `lib/db.ts` | Prisma client | `src/lib/prisma/client.ts` |
| `lib/db-helpers.ts` | Mixed logic + queries | Split into services, repositories, helpers |
| `app/api/user/route.ts` | Business logic | Keep thin, extract to `UserService` |
| `app/api/referrals/route.ts` | Business logic | Keep thin, extract to `ReferralService` |
| `app/api/games/route.ts` | Business logic | Keep thin, extract to `GameService` |
| `app/api/wallet/route.ts` | Business logic | Keep thin, extract to `WalletService` |
| `app/api/nfts/route.ts` | Business logic | Keep thin, extract to `NFTService` |
| `app/api/tasks/route.ts` | Business logic | Keep thin, extract to `TaskService` |
| `app/api/achievements/route.ts` | Business logic | Keep thin, extract to `AchievementService` |
| `app/api/tokens/route.ts` | Business logic | Keep thin, extract to `TokenService` |

---

*Last updated: December 2024*
