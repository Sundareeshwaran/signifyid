/**
 * RLS Context Middleware
 *
 * Sets PostgreSQL session variables for Row Level Security enforcement.
 * Must be called after authentication to enable tenant isolation.
 */
import type { Request, Response, NextFunction } from "express";
import { getClient } from "../config/db.js";

/**
 * Sets RLS context for the current database connection.
 * This enables PostgreSQL Row Level Security policies to filter data.
 *
 * @param orgId - Organization UUID for tenant isolation
 * @param userId - User UUID for user-level policies
 */
export async function setRLSContext(
  orgId: string,
  userId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `SELECT set_config('app.current_org_id', $1, true),
              set_config('app.current_user_id', $2, true)`,
      [orgId, userId]
    );
  } finally {
    client.release();
  }
}

/**
 * Express middleware to set RLS context from authenticated user.
 * Call this AFTER requireAuth middleware.
 */
export async function rlsContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip if not authenticated
  if (!req.user?.org_id || !req.user?.sub) {
    return next();
  }

  try {
    await setRLSContext(req.user.org_id, req.user.sub);
    next();
  } catch (error) {
    console.error("Failed to set RLS context:", error);
    res.status(500).json({ error: "Database context error" });
  }
}

/**
 * Execute a query with RLS context pre-set.
 * Use this for operations that need explicit context outside of request scope.
 */
export async function withRLSContext<T>(
  orgId: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  await setRLSContext(orgId, userId);
  return operation();
}
