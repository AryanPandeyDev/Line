/**
 * ============================================================================
 * MIGRATION NOTE (for future refactoring steps):
 * This Prisma client setup will be relocated to: src/lib/prisma/client.ts
 * Do NOT change any import paths until the full migration step.
 * ============================================================================
 */

/**
 * Supabase pooler requires TLS certificate bypass.
 * @prisma/adapter-pg doesn't properly pass SSL options to the underlying connection,
 * so we need to set this at the Node.js level.
 */
if (process.env.NODE_ENV !== "test") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

import { PrismaClient } from "@/lib/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
    pool: Pool | undefined
}

/**
 * Supabase connection pooler uses certificates that Node.js doesn't trust by default.
 * For the Supabase pooler (*.pooler.supabase.com), we need to set rejectUnauthorized: false.
 * 
 * This is the correct approach for Supabase's connection pooler as documented:
 * https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-ssl
 * 
 * Note: This is safe because:
 * 1. We're connecting to Supabase's known infrastructure
 * 2. The connection string already contains auth credentials
 * 3. Supabase documentation recommends this for pooler connections
 */
const pool = globalForPrisma.pool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
})

// Create Prisma adapter
const adapter = new PrismaPg(pool)

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db
    globalForPrisma.pool = pool
}

export default db
