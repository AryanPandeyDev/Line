import { PrismaClient } from "@/lib/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
    pool: Pool | undefined
}

// Create PostgreSQL pool (reuse in development)
const pool = globalForPrisma.pool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
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
