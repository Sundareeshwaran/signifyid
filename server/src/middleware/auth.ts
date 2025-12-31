/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user to request
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service.js";
import * as SessionModel from "../models/Session.model.js";
import * as sessionCache from "../cache/session.cache.js";
import { logger } from "../config/logger.js";

/**
 * Require authentication - validates access token
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Get token from cookie or Authorization header
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Validate session linkage
  if (!payload.sessionId) {
    res.status(401).json({ error: "Invalid token: missing session" });
    return;
  }

  // Try Redis cache first for session validation
  let session = await sessionCache.get(payload.sessionId);

  // Fallback to PostgreSQL if cache miss
  if (!session) {
    session = await SessionModel.validate(payload.sessionId);

    // Cache the session for future requests
    if (session) {
      await sessionCache.set(payload.sessionId, session);
    }
  }

  if (!session) {
    res.status(401).json({ error: "Session invalid or revoked" });
    return;
  }

  // Security: Ensure session belongs to the token user
  if (session.user_id !== payload.sub) {
    logger.error(
      `Session mismatch: token=${payload.sub}, session=${session.user_id}`
    );
    res.status(401).json({ error: "Session mismatch" });
    return;
  }

  // Attach user to request
  req.user = payload;
  next();
}

/**
 * Optional authentication - attaches user if token present
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload && payload.sessionId) {
      // Try Redis cache first
      let session = await sessionCache.get(payload.sessionId);

      // Fallback to PostgreSQL
      if (!session) {
        session = await SessionModel.validate(payload.sessionId);
        if (session) {
          await sessionCache.set(payload.sessionId, session);
        }
      }

      if (session) {
        req.user = payload;
      }
    }
  }

  next();
}
