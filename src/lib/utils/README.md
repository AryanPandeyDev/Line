# Utils Layer

## Purpose

Utils contain **generic utility functions** for the LINE Web3 Game Center. Unlike helpers (which are domain-specific), utils are reusable infrastructure code that could work in any project - error handling, result types, logging, and common patterns.

## Responsibilities

- **Error Handling**: Standard error types, error wrapping, error responses
- **Result Types**: `Result<T, E>` pattern for success/failure without exceptions
- **API Utilities**: Response builders, status codes, JSON helpers
- **Logging**: Structured logging utilities
- **Environment**: Environment variable helpers, config utilities
- **Type Guards**: TypeScript type guards and assertion functions

## Guidelines for This Project

1. **Framework-agnostic** - utils should not depend on Next.js, Prisma, or domain specifics
2. **Reusable** - these could be copy-pasted to another project
3. **Well-typed** - leverage TypeScript for safety
4. **Documented** - include JSDoc for public utilities
5. **Minimal dependencies** - avoid pulling in heavy libraries

## Planned Utilities

### Error Handling
```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

export class NotFoundError extends AppError { ... }
export class UnauthorizedError extends AppError { ... }
export class ValidationError extends AppError { ... }
export class InsufficientBalanceError extends AppError { ... }
```

### Result Pattern
```typescript
// utils/result.ts
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never>;
export function err<E>(error: E): Result<never, E>;
```

### API Response Helpers
```typescript
// utils/response.ts
export function successResponse<T>(data: T, status?: number): NextResponse;
export function errorResponse(error: AppError): NextResponse;
```

## Existing Utils

The current `lib/utils.ts` contains a `cn()` function for className merging using clsx/tailwind-merge. This is a UI utility and may stay in its current location or move to a UI utils folder.
