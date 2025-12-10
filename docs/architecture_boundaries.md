# LINE Web3 Game Center - Architecture Boundaries

> **⚠️ IMPORTANT: This document is a strict contract for all developers and AI agents working on this codebase.**

---

## 1. Core Architecture Rules

The LINE Web3 Game Center follows a **layered architecture** with clear separation of concerns:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Route Handlers** | `app/api/*/route.ts` | Thin controllers: auth, validation, response formatting |
| **Services** | `src/lib/services/` | All business logic and domain orchestration |
| **Repositories** | `src/lib/repositories/` | All database queries via Prisma |
| **Helpers** | `src/lib/helpers/` | Pure calculation functions only |
| **Models** | `src/lib/models/` | TypeScript types defining API response shapes |

### Fundamental Rules

1. **All database queries must live only in repositories**
   - No Prisma calls in services, helpers, or route handlers
   - Exception: Services may call `db-helpers.ts` functions temporarily during migration

2. **All domain logic must live only in services**
   - Business rules, orchestration, data transformation
   - No HTTP concerns, no `Request`/`Response` objects

3. **All pure calculations must live only in helpers**
   - XP calculations, reward formulas, fee calculations
   - Must be synchronous, stateless, side-effect-free

4. **All models define the final shape returned to the client**
   - Types match exactly what the API returns
   - Decoupled from Prisma types

5. **Route handlers must remain thin controllers**
   - Maximum 40-50 lines
   - Only: authenticate → validate → call service → return response

---

## 2. Absolute Forbidden Actions

> **DO NOT VIOLATE THESE RULES UNDER ANY CIRCUMSTANCES**

### Schema & Auth

- **Do not modify Prisma schema** without explicit approval
- **Do not modify Clerk authentication or middleware**
- **Do not alter existing transaction logic** without approval

### API Contract

- **Do not change any response shape**
- **Do not remove fields** from API responses
- **Do not rename fields** in API responses
- **Do not add new required fields** to API responses
- **Do not change error status codes or semantics**
- **Do not return raw Prisma objects** to clients

### Architecture Boundaries

- **Do not perform Prisma operations in services** (use repositories)
- **Do not put business logic in repositories**
- **Do not put request logic inside services** (no `Request`, `Response`, headers)
- **Do not call fetch or external APIs inside repositories**
- **Do not modify unrelated domains** when working on a specific feature

### Frontend

- **Do not touch frontend or Redux slices** unless explicitly tasked

---

## 3. Allowed Actions

✅ **Services**
- Create new service methods when adding features
- Reorganize complex service logic into smaller pure functions
- Call existing `db-helpers.ts` functions when safer than rewriting

✅ **Repositories**
- Create new repository methods when needed for new queries
- Add aggregation or specialized find methods

✅ **Helpers**
- Add new helper functions for pure calculations
- Refactor existing calculations into reusable helpers

✅ **Models**
- Extend model types when the API already returns those fields
- Add new response types for new endpoints

✅ **Route Handlers**
- Refactor route handlers only by making them thinner
- Extract inline logic to services

---

## 4. When to Ask for Clarification

**STOP and ask before proceeding if:**

1. A required feature appears to **require schema change**
2. A domain rule is **ambiguous or unclear**
3. A response shape is **unclear or inconsistent**
4. Logic **connects two domains** not yet architecturally linked
5. A business rule appears **duplicated** across services
6. A transaction flow might **affect multiple domain models**
7. Error handling behavior is **not documented**
8. A change would **break backward compatibility**

---

## 5. Reference Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE HANDLER                             │
│  • Clerk auth()                                              │
│  • Input validation                                          │
│  • Call service                                              │
│  • Format response                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│  • Business logic                                            │
│  • Orchestrate repositories                                  │
│  • Apply domain rules                                        │
│  • Use helpers for calculations                              │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│   REPOSITORY LAYER     │   │        HELPER LAYER            │
│  • Prisma queries      │   │  • Pure functions              │
│  • Data access only    │   │  • Calculations                │
│  • No business logic   │   │  • No side effects             │
└────────────────────────┘   └────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                       PRISMA                                 │
│                     (Database)                               │
└─────────────────────────────────────────────────────────────┘
```

### Textual Flow

```
Request
  → Route Handler (auth, validate)
    → Service Layer (business logic)
      → Repository Layer (Prisma queries)
      → Helper Layer (pure calculations)
    → Response Formatter (map to model types)
  → Client (JSON response)
```

---

## 6. Stable Import Rules

Imports must follow this strict hierarchy:

```typescript
// ✅ ALLOWED IMPORTS

// Route Handlers may import:
import { someService } from '@/src/lib/services/someService'

// Services may import:
import { someRepo } from '@/src/lib/repositories/someRepo'
import { someHelper } from '@/src/lib/helpers/someLogic'
import type { SomeType } from '@/src/lib/models/some'
import { existingDbHelper } from '@/lib/db-helpers'  // Legacy, allowed

// Repositories may import:
import { db } from '@/lib/db'
import type { PrismaModel } from '@/lib/generated/prisma'
import type { SomeType } from '@/src/lib/models/some'

// Helpers may import:
import type { SomeType } from '@/src/lib/models/some'

// Models import nothing (type-only files)
```

### Import Violations (FORBIDDEN)

```typescript
// ❌ Route handlers importing Prisma
import { db } from '@/lib/db'  // FORBIDDEN in routes

// ❌ Services importing Prisma directly
import { db } from '@/lib/db'  // FORBIDDEN in services

// ❌ Repositories importing other repositories
import { userRepo } from './userRepo'  // FORBIDDEN

// ❌ Helpers importing repositories
import { someRepo } from '@/src/lib/repositories/someRepo'  // FORBIDDEN
```

---

## 7. Versioning Policy

### API Response Versioning

1. **Backward compatibility is mandatory** unless explicitly allowed
2. When response shapes must change:
   - Create a new versioned response type: `UserProfileV2Response`
   - Keep original type for legacy clients
   - Use feature flags or version headers if needed

3. **Legacy clients must not break**
   - Adding optional fields is allowed
   - Removing or renaming fields requires migration plan

### Type Versioning Example

```typescript
// Original (do not modify)
export interface UserProfileResponse {
  id: string
  username: string
  // ...
}

// New version (add new type)
export interface UserProfileV2Response extends UserProfileResponse {
  newOptionalField?: string
}
```

---

## 8. Instructions for Future AI Agents

> **⚠️ READ THIS BEFORE MAKING ANY CHANGE**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Before making any change in this repository:                           │
│                                                                         │
│  1. Read docs/refactor_template.md                                      │
│  2. Read docs/backend_architecture.md                                   │
│  3. Follow docs/architecture_boundaries.md as a STRICT CONTRACT         │
│                                                                         │
│  If any requested action violates these rules:                          │
│  → STOP and ask for clarification                                       │
│  → Do NOT proceed with the violation                                    │
│  → Explain which rule would be violated                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Checklist Before Any Change

- [ ] Does this change respect the layer boundaries?
- [ ] Does this change preserve the API response shape?
- [ ] Does this change avoid Prisma in services?
- [ ] Does this change avoid business logic in repositories?
- [ ] Does this change avoid touching the schema?
- [ ] Does this change avoid touching auth/middleware?
- [ ] Is this change scoped to only the relevant domain?

### When in Doubt

Ask the user:
> "This change appears to require [specific violation]. Should I proceed, or would you like to discuss an alternative approach?"

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial architecture boundaries established |

---

*This document is the source of truth for architectural decisions in the LINE Web3 Game Center backend.*
