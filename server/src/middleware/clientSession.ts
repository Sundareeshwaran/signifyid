/**
 * Client Session Middleware
 *
 * Middleware for validating client sessions (Client Auth System)
 * This is separate from user authentication middleware
 */
import type { Request, Response, NextFunction } from "express";
import * as ClientSessionModel from "../models/ClientSession.model.js";
import * as clientSessionCache from "../cache/clientSession.cache.js";

/**
 * Require valid client session
 * Returns 401 if session is invalid, expired, or revoked
 */
export async function requireClientSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies?.clientSession;

  if (!sessionToken) {
    res.status(401).json({
      error: "authentication_required",
      error_description: "Client session required",
    });
    return;
  }

  // Try Redis cache first (using session ID from token)
  // Note: Client sessions use token hashes, so we use the token as the cache key
  let session = await clientSessionCache.get(sessionToken);

  // Fallback to PostgreSQL if cache miss
  if (!session) {
    session = await ClientSessionModel.validate(sessionToken);

    // Cache the session for future requests
    if (session) {
      await clientSessionCache.set(sessionToken, session);
    }
  }

  if (!session) {
    res.status(401).json({
      error: "invalid_session",
      error_description: "Session invalid, expired, or revoked",
    });
    return;
  }

  // Verify domain matches (security check)
  const requestDomain =
    req.headers.origin || req.headers.referer || req.get("host") || "unknown";

  if (session.domain !== requestDomain) {
    res.status(403).json({
      error: "domain_mismatch",
      error_description: "Session domain does not match request domain",
    });
    return;
  }

  // Attach session to request
  req.clientSession = session;
  next();
}

/**
 * Optional client session - attaches session if present
 */
export async function optionalClientSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies?.clientSession;

  if (sessionToken) {
    // Try Redis cache first
    let session = await clientSessionCache.get(sessionToken);

    // Fallback to PostgreSQL
    if (!session) {
      session = await ClientSessionModel.validate(sessionToken);
      if (session) {
        await clientSessionCache.set(sessionToken, session);
      }
    }

    if (session) {
      req.clientSession = session;
    }
  }

  next();
}

/**
 * Extend Express Request type to include clientSession
 */
declare module "express" {
  interface Request {
    clientSession?: ClientSessionModel.ClientSession;
  }
}
