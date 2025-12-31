/**
 * RLS Context Middleware
 *
 * Express middleware that attaches RLS context to the request
 * for use with Prisma queries.
 */
import type { Request, Response, NextFunction } from "express";
import { getRLSContext, type RLSContext } from "../config/prisma.js";

/**
 * Extended request type with RLS context.
 * Use this type when you need access to rlsContext in route handlers.
 */
export interface AuthenticatedRequest extends Request {
  rlsContext?: RLSContext;
}

/**
 * Middleware that extracts RLS context from authenticated user.
 * Should be used after requireAuth middleware.
 *
 * @example
 * ```ts
 * router.get('/users', requireAuth, attachRLSContext, async (req, res) => {
 *   const authReq = req as AuthenticatedRequest;
 *   if (!authReq.rlsContext) {
 *     return res.status(401).json({ error: 'Unauthorized' });
 *   }
 *   const users = await withRLS(authReq.rlsContext, (prisma) => prisma.users.findMany());
 *   res.json(users);
 * });
 * ```
 */
export function attachRLSContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ctx = getRLSContext(req.user);

  if (ctx) {
    (req as AuthenticatedRequest).rlsContext = ctx;
  }

  next();
}

/**
 * Middleware that requires RLS context to be present.
 * Returns 401 if user is not authenticated or context is missing.
 */
export function requireRLSContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ctx = getRLSContext(req.user);

  if (!ctx) {
    res.status(401).json({
      error: "Authentication required for RLS context",
    });
    return;
  }

  (req as AuthenticatedRequest).rlsContext = ctx;
  next();
}
