# LINE Web3 Game Center - Refactor Template

This document provides a universal template for migrating route handlers into the new service/repository architecture. All developers and AI agents MUST follow these guidelines when refactoring any domain.

---

## Table of Contents

1. [Repository Pattern Guidelines](#1-repository-pattern-guidelines)
2. [Service Pattern Guidelines](#2-service-pattern-guidelines)
3. [Route Handler Pattern](#3-route-handler-pattern)
4. [Model Pattern](#4-model-pattern)
5. [Helper Pattern](#5-helper-pattern)
6. [Complete Example](#6-complete-example)
7. [Refactor Checklist](#7-refactor-checklist)
8. [Boundaries for All Future Refactors](#8-boundaries-for-all-future-refactors)
9. [Rules for Future AI Agents](#9-rules-for-future-ai-agents)

---

## 1. Repository Pattern Guidelines

Repositories are the **data access layer**. They encapsulate all Prisma queries and return typed data.

### File Location
```
src/lib/repositories/{domain}Repo.ts
```

### Structure Template
```typescript
/**
 * ============================================================================
 * {DOMAIN} REPOSITORY
 * ============================================================================
 * 
 * Data access layer for Prisma {Model} model.
 * 
 * PRISMA MODELS ACCESSED:
 * - {PrimaryModel} (primary)
 * - {RelatedModel} (for aggregations)
 * 
 * ALLOWED:
 * - Prisma CRUD operations
 * - Aggregation queries
 * - Transaction client support
 * 
 * FORBIDDEN:
 * - Business logic
 * - Calling other repositories
 * - Calling services
 * - HTTP handling
 * - Clerk usage
 * 
 * ============================================================================
 */

import { db } from '@/lib/db'
import type { Model } from '@/lib/generated/prisma'

export const domainRepo = {
  findById: async (id: string): Promise<Model | null> => {
    return db.model.findUnique({ where: { id } })
  },
  
  // Additional methods...
}
```

### Naming Conventions

| Operation | Naming Pattern | Example |
|-----------|---------------|---------|
| Find single record | `findBy{Field}` | `findById`, `findByClerkId` |
| Find multiple records | `findMany`, `findAll`, `findBy{Criteria}` | `findManyByUserId` |
| Find with relations | `findBy{Field}With{Relation}` | `findByIdWithStats` |
| Create record | `create` | `create(data)` |
| Update record | `update` | `update(id, data)` |
| Delete record | `delete` | `delete(id)` |
| Aggregate | `aggregate{What}` | `aggregateTotalPlayTime` |
| Check existence | `exists`, `is{Condition}` | `existsByUsername` |
| Count | `count`, `countBy{Field}` | `countByUserId` |

### Mapping Prisma Results

```typescript
// WRONG: Returning raw Prisma type
findById: async (id: string) => {
  return db.user.findUnique({ where: { id } })
}

// RIGHT: Return typed interface from models
import type { UserData } from '@/src/lib/models/user'

findById: async (id: string): Promise<UserData | null> => {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return null
  
  return {
    id: user.id,
    username: user.username,
    // ... explicitly map fields
  }
}
```

### Rules

1. **One concern per function** - Each function performs a single query or tightly related group
2. **No business logic** - No calculations, no conditionals based on domain rules
3. **No Next.js usage** - No Request, Response, NextResponse, cookies, headers
4. **No Clerk usage** - Never import from `@clerk/nextjs`
5. **Accept transaction client** - Support `tx` parameter for atomic operations
6. **Return typed data** - Use interfaces from `src/lib/models`

---

## 2. Service Pattern Guidelines

Services contain **business logic** and orchestrate repository calls.

### File Location
```
src/lib/services/{domain}Service.ts
```

### Structure Template
```typescript
/**
 * ============================================================================
 * {DOMAIN} SERVICE
 * ============================================================================
 * 
 * Business logic for {domain} operations.
 * 
 * DOMAIN SCOPE:
 * - {Responsibility 1}
 * - {Responsibility 2}
 * 
 * ALLOWED:
 * - Call repositories
 * - Call other services
 * - Use helper functions
 * - Apply domain logic
 * 
 * FORBIDDEN:
 * - Direct Prisma usage
 * - HTTP handling
 * - Clerk usage
 * 
 * ============================================================================
 */

import { domainRepo } from '@/src/lib/repositories/domainRepo'
import type { DomainResponse } from '@/src/lib/models/domain'

export const domainService = {
  getItem: async (id: string): Promise<DomainResponse | null> => {
    const data = await domainRepo.findById(id)
    if (!data) return null
    
    // Apply domain logic here
    return {
      ...data,
      computedField: calculateSomething(data.value),
    }
  },
}
```

### Orchestration Pattern

```typescript
// Service orchestrates multiple repositories
getFullProfile: async (userId: string): Promise<ProfileResponse> => {
  // Fetch from multiple repos
  const user = await userRepo.findById(userId)
  const stats = await statsRepo.findByUserId(userId)
  const achievements = await achievementRepo.findByUserId(userId)
  
  // Combine and transform
  return {
    ...user,
    totalGames: stats.gamesPlayed,
    achievements: achievements.map(a => ({
      id: a.id,
      name: a.achievement.name,
      unlocked: a.isUnlocked,
    })),
  }
}
```

### Domain Logic Examples

```typescript
// Calculation
const xpProgress = calculateXPProgress(user.xp, user.xpToNextLevel)

// Fallback values
const displayName = user.displayName || clerkData.firstName || user.username

// Formatting
const playTimeHours = Math.round((totalSeconds / 3600) * 10) / 10

// Date conversions
const createdAt = user.createdAt.toISOString()
```

### Rules

1. **No Prisma calls** - Always go through repositories
2. **No HTTP concerns** - Never access Request, Response, headers, cookies
3. **No Clerk access** - Receive `clerkId` as a string parameter, never import Clerk
4. **Receive simple data** - Parameters should be strings, numbers, or simple typed objects
5. **Return model types** - Return interfaces defined in `src/lib/models`
6. **Keep stateless** - No class instances, no mutable state

---

## 3. Route Handler Pattern

Route handlers are **thin controllers** that handle HTTP and delegate to services.

### Template
```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { domainService } from '@/src/lib/services/domainService'

/**
 * GET /api/{domain}
 * 
 * Brief description of what this endpoint does.
 */
export async function GET() {
  try {
    // 1. Authenticate
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Call service (single call preferred)
    const result = await domainService.getItems(clerkId)

    // 3. Return response
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/{domain}:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/{domain}
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate input
    const body = await request.json()
    const { field1, field2 } = body

    if (!field1) {
      return NextResponse.json({ error: 'field1 is required' }, { status: 400 })
    }

    // 3. Call service
    const result = await domainService.createItem(clerkId, { field1, field2 })

    // 4. Return response
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/{domain}:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Response Consistency

```typescript
// Success responses
return NextResponse.json(data)                    // 200 OK (implicit)
return NextResponse.json(data, { status: 201 })  // 201 Created
return NextResponse.json({ success: true })       // 200 for actions

// Error responses
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
return NextResponse.json({ error: 'Not found' }, { status: 404 })
return NextResponse.json({ error: 'Validation message' }, { status: 400 })
return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
```

### Rules

1. **Stay thin** - Route handlers should be 20-40 lines max
2. **Single service call** - Prefer one service method call per handler
3. **No Prisma** - Never import `db` in route handlers
4. **No business logic** - Validation only, no calculations
5. **Handle errors consistently** - Always catch and return proper status codes

---

## 4. Model Pattern

Models define **TypeScript interfaces** for API responses and data shapes.

### File Location
```
src/lib/models/{domain}.ts
```

### Structure Template
```typescript
/**
 * ============================================================================
 * {DOMAIN} TYPES
 * ============================================================================
 * 
 * TypeScript interfaces for {domain} data.
 * 
 * NOTE: These types are DECOUPLED from Prisma.
 * Do NOT import from @prisma/client.
 * 
 * ============================================================================
 */

/**
 * Response shape for GET /api/{domain}
 */
export interface DomainResponse {
  id: string
  name: string
  createdAt: string  // ISO string, not Date
}

/**
 * Input shape for POST /api/{domain}
 */
export interface CreateDomainInput {
  name: string
  description?: string
}

/**
 * Internal data shape used by services
 */
export interface DomainData {
  id: string
  name: string
  createdAt: Date  // Date object internally
}
```

### Choosing Fields

| Include | Exclude |
|---------|---------|
| ID fields | Internal database flags |
| User-facing properties | Prisma relation metadata |
| Computed display values | Raw join table IDs |
| Formatted dates (ISO strings) | Internal timestamps |
| Aggregated counts | Full nested objects (unless needed) |

### Rules

1. **No Prisma imports** - Never `import type { User } from '@prisma/client'`
2. **Reflect API responses** - Match exactly what the API returns
3. **Use ISO strings for dates** - API should return `string`, not `Date`
4. **Keep stable** - Changing models = changing API contract
5. **Document required fields** - Use `?` for optional, no `?` for required

---

## 5. Helper Pattern

Helpers contain **pure functions** for calculations and transformations.

### File Location
```
src/lib/helpers/{domain}Logic.ts
```

### Structure Template
```typescript
/**
 * ============================================================================
 * {DOMAIN} LOGIC HELPERS
 * ============================================================================
 * 
 * Pure functions for {domain} calculations.
 * 
 * ALLOWED:
 * - Mathematical calculations
 * - String formatting
 * - Data transformations
 * 
 * FORBIDDEN:
 * - Database operations
 * - Async operations
 * - Side effects
 * 
 * All functions MUST be pure and synchronous.
 * 
 * ============================================================================
 */

/**
 * Calculate {something}
 * @param value - Input value
 * @returns Calculated result
 */
export function calculateSomething(value: number): number {
  return Math.floor(value * 1.5)
}
```

### Rules

1. **Pure functions** - Same input = same output, always
2. **Synchronous** - No async, no promises
3. **No side effects** - No logging, no mutations, no external calls
4. **No Prisma** - Never access database
5. **No imports from services/repos** - Helpers are the lowest level

---

## 6. Complete Example

### Before: Monolithic Route Handler

```typescript
// app/api/items/route.ts - BEFORE
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Direct Prisma call in route
    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Direct Prisma call in route
    const items = await db.item.findMany({
      where: { userId: user.id },
      include: { category: true },
    })

    // Business logic in route
    const itemsWithDiscount = items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      discountedPrice: item.price * 0.9, // 10% discount
      category: item.category.name,
    }))

    return NextResponse.json({
      items: itemsWithDiscount,
      total: items.length,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### After: Layered Architecture

**Step 1: Create Model Types**

```typescript
// src/lib/models/item.ts
export interface ItemResponse {
  id: string
  name: string
  price: number
  discountedPrice: number
  category: string
}

export interface ItemsListResponse {
  items: ItemResponse[]
  total: number
}
```

**Step 2: Create Helper**

```typescript
// src/lib/helpers/itemLogic.ts
export function calculateDiscountedPrice(price: number, discountRate: number = 0.1): number {
  return price * (1 - discountRate)
}
```

**Step 3: Create Repository**

```typescript
// src/lib/repositories/itemRepo.ts
import { db } from '@/lib/db'

export interface ItemWithCategory {
  id: string
  name: string
  price: number
  categoryName: string
}

export const itemRepo = {
  findByUserId: async (userId: string): Promise<ItemWithCategory[]> => {
    const items = await db.item.findMany({
      where: { userId },
      include: { category: true },
    })
    
    return items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      categoryName: item.category.name,
    }))
  },
}
```

**Step 4: Create Service**

```typescript
// src/lib/services/itemService.ts
import { itemRepo } from '@/src/lib/repositories/itemRepo'
import { userRepo } from '@/src/lib/repositories/userRepo'
import { calculateDiscountedPrice } from '@/src/lib/helpers/itemLogic'
import type { ItemsListResponse } from '@/src/lib/models/item'

export const itemService = {
  getUserItems: async (clerkId: string): Promise<ItemsListResponse | null> => {
    const user = await userRepo.findByClerkId(clerkId)
    if (!user) return null
    
    const items = await itemRepo.findByUserId(user.id)
    
    return {
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        discountedPrice: calculateDiscountedPrice(item.price),
        category: item.categoryName,
      })),
      total: items.length,
    }
  },
}
```

**Step 5: Rewrite Route Handler**

```typescript
// app/api/items/route.ts - AFTER
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { itemService } from '@/src/lib/services/itemService'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await itemService.getUserItems(clerkId)
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 7. Refactor Checklist

Execute these steps **in order** for every route migration:

### Phase 1: Analysis

- [ ] **Step 1: Identify database queries**
  - List all `db.{model}.{method}` calls
  - Note which Prisma models are accessed
  - Document any aggregations or complex queries

- [ ] **Step 2: Identify domain logic**
  - List all calculations, transformations, mappings
  - Note any conditional business rules
  - Document fallback values and defaults

- [ ] **Step 3: Capture response shape**
  - Record exact JSON structure returned
  - Note all field names and types
  - Document any computed/derived fields

### Phase 2: Implementation

- [ ] **Step 4: Move queries into repository**
  - Create/update `src/lib/repositories/{domain}Repo.ts`
  - One function per query or related group
  - Return typed data

- [ ] **Step 5: Move logic into service**
  - Create/update `src/lib/services/{domain}Service.ts`
  - Orchestrate repository calls
  - Apply domain logic
  - Map to response types

- [ ] **Step 6: Define model types**
  - Create/update `src/lib/models/{domain}.ts`
  - Match exact API response shape
  - Add input types if needed

- [ ] **Step 7: Extract helpers if needed**
  - Create pure functions in `src/lib/helpers/{domain}Logic.ts`
  - Only for reusable calculations

- [ ] **Step 8: Rewrite route handler**
  - Remove Prisma imports
  - Import service
  - Single service call
  - Return response

### Phase 3: Verification

- [ ] **Step 9: Run build**
  ```bash
  npm run build
  ```

- [ ] **Step 10: Verify response shape**
  - Compare old vs new response
  - All fields must match exactly
  - Types must match exactly

- [ ] **Step 11: Confirm no behavior changes**
  - Same input = same output
  - Same error conditions
  - Same status codes

---

## 8. Boundaries for All Future Refactors

### Absolute Rules

| Rule | Rationale |
|------|-----------|
| **Do NOT change Prisma schema** | Schema changes require migration planning |
| **Do NOT modify Clerk or authentication** | Auth is a critical security layer |
| **Do NOT rename existing API fields** | Clients depend on field names |
| **Do NOT add or remove fields without permission** | API contract must be stable |
| **Do NOT change business rules** | Only restructure, not redefine |
| **Do NOT modify unrelated routes** | Scope to the task at hand |
| **Do NOT introduce new dependencies** | Discuss dependencies first |
| **Do NOT return Prisma objects directly** | Always map to model types |

### When Changes Are Required

If a refactor reveals that one of the above is necessary:

1. **Stop the refactor**
2. **Document the finding**
3. **Ask for permission** before proceeding
4. **Get explicit approval** for the specific change

---

## 9. Rules for Future AI Agents

### Allowed Actions

- ✅ Read and analyze existing route handlers
- ✅ Create new files in `src/lib/repositories/`, `src/lib/services/`, `src/lib/models/`, `src/lib/helpers/`
- ✅ Modify route handlers to use new services
- ✅ Import from `@/lib/db` in repositories only
- ✅ Import from `@clerk/nextjs/server` in route handlers only
- ✅ Run `npm run build` to verify changes
- ✅ Ask clarifying questions when uncertain

### Forbidden Actions

- ❌ Modify `prisma/schema.prisma`
- ❌ Modify `middleware.ts` or auth configuration
- ❌ Change API response structure
- ❌ Add fields to API responses
- ❌ Remove fields from API responses
- ❌ Rename API fields
- ❌ Change error messages or status codes
- ❌ Import Prisma client in services
- ❌ Import Clerk in services or repositories
- ❌ Access `Request` or `Response` in services or repositories
- ❌ Modify routes not specified in the task
- ❌ Install new npm packages without permission

### When to Ask for Clarification

Ask the user before proceeding when:

1. **Ambiguous requirements** - The task description is unclear
2. **Missing logic** - You can't find the original implementation
3. **Schema changes needed** - The refactor requires database changes
4. **Breaking changes** - The API contract must change
5. **Cross-domain dependencies** - Multiple domains are tightly coupled
6. **Performance concerns** - The new structure may be less efficient
7. **Error handling uncertainty** - Original error behavior is unclear

### Response Template for Completion

After completing a refactor, report:

```markdown
## Refactor Complete: {Domain} {Handler}

### Files Changed
- `src/lib/repositories/{domain}Repo.ts` - {what was added}
- `src/lib/services/{domain}Service.ts` - {what was added}
- `src/lib/models/{domain}.ts` - {what was added}
- `app/api/{domain}/route.ts` - {what was changed}

### What Moved Where
| Original Location | New Location |
|-------------------|--------------|
| {query} | {domain}Repo.{method} |
| {logic} | {domain}Service.{method} |

### Verification
- [ ] Build passes
- [ ] Response shape unchanged
- [ ] Behavior unchanged

### Files NOT Changed
- List any files explicitly not modified
```

---

## Appendix: Import Path Reference

```typescript
// In route handlers
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { domainService } from '@/src/lib/services/domainService'

// In services
import { domainRepo } from '@/src/lib/repositories/domainRepo'
import { otherRepo } from '@/src/lib/repositories/otherRepo'
import { helperFunction } from '@/src/lib/helpers/domainLogic'
import type { ResponseType } from '@/src/lib/models/domain'

// In repositories
import { db } from '@/lib/db'
import type { Model } from '@/lib/generated/prisma'

// In helpers (minimal imports)
import type { SomeType } from '@/src/lib/models/domain'
```

---

*Last updated: December 2024*
*Version: 1.0*
