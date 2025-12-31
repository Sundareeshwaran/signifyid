/**
 * Prisma Client Configuration with Accelerate
 *
 * This module provides a type-safe database client using Prisma
 * with Prisma Accelerate for global connection pooling and caching.
 *
 * Note: RLS (Row Level Security) operations requiring session variables
 * should use the raw pg pool in db.ts, as Accelerate's connection pooling
 * doesn't preserve PostgreSQL session variables across queries.
 */
import { PrismaClient } from "../generated/prisma/index.js";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Check if using Accelerate (prisma:// URL)
const isAccelerateEnabled = process.env.DATABASE_URL?.startsWith("prisma://");

// Extended PrismaClient type with Accelerate extension
// Using inline type to avoid non-portable type inference issues
type AcceleratedPrismaClient = PrismaClient & {
  $extends: typeof PrismaClient.prototype.$extends;
};

function createPrismaClient(): AcceleratedPrismaClient {
  const url = process.env.DATABASE_URL;

  if (isAccelerateEnabled) {
    const client = new PrismaClient({
      accelerateUrl: url,
    } as ConstructorParameters<typeof PrismaClient>[0] & { accelerateUrl: string });
    return client.$extends(
      withAccelerate()
    ) as unknown as AcceleratedPrismaClient;
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return client as unknown as AcceleratedPrismaClient;
}

// Singleton pattern for Prisma Client (prevents multiple instances in dev)
const globalForPrisma = globalThis as unknown as {
  prisma: AcceleratedPrismaClient;
};

/**
 * Prisma Client with Accelerate extension.
 * Use for cached reads and general database operations.
 *
 * @example
 * ```ts
 * // Basic query
 * const users = await prisma.users.findMany();
 *
 * // With caching (requires Accelerate)
 * const orgs = await prisma.organizations.findMany({
 *   cacheStrategy: { ttl: 60, swr: 120 },
 * });
 * ```
 */
export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * RLS Context for multi-tenant isolation
 * Note: RLS operations should use the raw pg pool in db.ts
 * as Accelerate doesn't support PostgreSQL session variables.
 */
export interface RLSContext {
  orgId: string;
  userId: string;
}

/**
 * Get RLS context from Express request.
 * Extracts orgId and userId from the authenticated user payload.
 *
 * @param user - JWT payload from authenticated request
 * @returns RLS context object or null if not authenticated
 */
export function getRLSContext(
  user: { org_id?: string; sub?: string } | undefined
): RLSContext | null {
  if (!user?.org_id || !user?.sub) {
    return null;
  }
  return {
    orgId: user.org_id,
    userId: user.sub,
  };
}

// Log Prisma/Accelerate status on startup
if (isAccelerateEnabled) {
  console.log("✅ Prisma Accelerate enabled (connection pooling + caching)");
} else {
  console.log(
    "⚠️  Using direct database connection (set DATABASE_URL to prisma:// for Accelerate)"
  );
}

// Re-export client type for convenience
export type { AcceleratedPrismaClient };
