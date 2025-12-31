/**
 * Client Auth Gateway Middleware
 *
 * Centralized middleware for enforcing client authentication on protected routes.
 * This gateway provides:
 * - Session requirement enforcement
 * - Comprehensive session validation
 * - Client active status verification
 * - Audit logging for security events
 * - Automatic redirect to login on failure
 */
import type { Request, Response, NextFunction } from "express";
import * as ClientSessionModel from "../models/ClientSession.model.js";
import * as ClientModel from "../models/Client.model.js";
import type { Client } from "../models/Client.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";

/** Audit event types for client auth */
export const CLIENT_AUTH_EVENTS = {
  UNAUTHORIZED_ACCESS: "unauthorized_direct_access",
  SESSION_MISSING: "client_session_missing",
  SESSION_EXPIRED: "client_session_expired",
  SESSION_REVOKED: "client_session_revoked",
  SESSION_INVALID: "client_session_invalid",
  CLIENT_INACTIVE: "client_inactive",
  DOMAIN_MISMATCH: "client_domain_mismatch",
  REDIRECT_TO_LOGIN: "client_redirect_to_login",
  ACCESS_GRANTED: "client_access_granted",
  DIRECT_ACCESS_BLOCKED: "direct_access_blocked",
  CLIENT_REDIRECTED_BACK: "client_redirected_back",
  CLIENT_REDIRECTED_TO_TARGET: "client_redirected_to_target",
  FINGERPRINT_MISMATCH: "client_fingerprint_mismatch",
} as const;

/** Options for the client auth gateway */
export interface ClientAuthGatewayOptions {
  /** Login page URL for redirects (default: /client/login) */
  loginUrl?: string;
  /** Whether to redirect or return JSON error (default: json for API routes) */
  redirectOnFailure?: boolean;
  /** Whether to log access events (default: true) */
  enableAuditLog?: boolean;
  /** Whether to validate session fingerprint (IP + User-Agent) */
  validateFingerprint?: boolean;
  /** Additional validation function */
  additionalValidation?: (
    session: ClientSessionModel.ClientSession,
    client: ClientModel.Client
  ) => Promise<{ valid: boolean; error?: string }>;
}

/**
 * Get request metadata for audit logging
 */
function getRequestMetadata(req: Request) {
  return {
    requested_uri: req.originalUrl,
    ip_address: req.ip || req.socket.remoteAddress,
    user_agent: req.headers["user-agent"] || null,
    domain: req.headers.origin || req.headers.referer || req.get("host"),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log audit event for client auth
 */
async function logAuditEvent(
  event: string,
  orgId: string | null,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await AuditLogModel.create(orgId || "", null, event, metadata);
  } catch (error) {
    console.error("[ClientAuthGateway] Failed to log audit event:", error);
  }
}

/**
 * Create Client Auth Gateway middleware
 *
 * Use this to protect routes that require client authentication.
 * Sessions are validated against the database and clients are verified to be active.
 */
export function createClientAuthGateway(
  options: ClientAuthGatewayOptions = {}
) {
  const {
    loginUrl = "/client/login",
    redirectOnFailure = false,
    enableAuditLog = true,
    validateFingerprint = false,
  } = options;

  return async function clientAuthGateway(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const metadata = getRequestMetadata(req);

    // Check for session token in cookie or header
    const sessionToken =
      req.cookies?.clientSession || (req.headers["x-client-session"] as string);

    // 1. Check if session token exists
    if (!sessionToken) {
      if (enableAuditLog) {
        await logAuditEvent(CLIENT_AUTH_EVENTS.SESSION_MISSING, null, {
          ...metadata,
          error: "No session token provided",
        });
      }

      if (redirectOnFailure) {
        // Log redirect to login
        if (enableAuditLog) {
          await logAuditEvent(CLIENT_AUTH_EVENTS.REDIRECT_TO_LOGIN, null, {
            ...metadata,
            reason: "no_session",
          });
        }

        const redirectUrl = new URL(
          loginUrl,
          `${req.protocol}://${req.get("host")}`
        );
        redirectUrl.searchParams.set("redirect", req.originalUrl);
        redirectUrl.searchParams.set("error", "no_session");
        res.redirect(redirectUrl.toString());
        return;
      }

      res.status(401).json({
        error: "authentication_required",
        error_description: "Client session required",
        code: "NO_SESSION",
      });
      return;
    }

    // 2. Validate session token
    const session = await ClientSessionModel.validate(sessionToken);

    if (!session) {
      // Check if session exists but is expired/revoked
      const existingSession = await ClientSessionModel.findByToken(
        sessionToken
      );

      let errorCode = "INVALID_SESSION";
      let auditEvent: (typeof CLIENT_AUTH_EVENTS)[keyof typeof CLIENT_AUTH_EVENTS] =
        CLIENT_AUTH_EVENTS.SESSION_INVALID;

      if (existingSession) {
        if (existingSession.revoked) {
          errorCode = "SESSION_REVOKED";
          auditEvent = CLIENT_AUTH_EVENTS.SESSION_REVOKED;
        } else if (new Date(existingSession.expires_at) <= new Date()) {
          errorCode = "SESSION_EXPIRED";
          auditEvent = CLIENT_AUTH_EVENTS.SESSION_EXPIRED;
        }
      }

      if (enableAuditLog) {
        await logAuditEvent(auditEvent, existingSession?.org_id || null, {
          ...metadata,
          session_id: existingSession?.id,
          error: errorCode,
        });
      }

      // Clear the invalid cookie
      res.clearCookie("clientSession");

      if (redirectOnFailure) {
        const redirectUrl = new URL(
          loginUrl,
          `${req.protocol}://${req.get("host")}`
        );
        redirectUrl.searchParams.set("redirect", req.originalUrl);
        redirectUrl.searchParams.set("error", errorCode.toLowerCase());
        res.redirect(redirectUrl.toString());
        return;
      }

      res.status(401).json({
        error: "invalid_session",
        error_description: "Session invalid, expired, or revoked",
        code: errorCode,
      });
      return;
    }

    // 3. Verify domain matches (CORS-like security check)
    const requestDomain =
      req.headers.origin || req.headers.referer || req.get("host") || "unknown";

    // Skip domain check for same-origin requests or API calls
    const skipDomainCheck =
      req.headers["x-skip-domain-check"] === "true" ||
      req.path.startsWith("/api/");

    if (!skipDomainCheck && session.domain !== requestDomain) {
      if (enableAuditLog) {
        await logAuditEvent(
          CLIENT_AUTH_EVENTS.DOMAIN_MISMATCH,
          session.org_id,
          {
            ...metadata,
            session_id: session.id,
            session_domain: session.domain,
            request_domain: requestDomain,
          }
        );
      }

      res.status(403).json({
        error: "domain_mismatch",
        error_description: "Session domain does not match request domain",
        code: "DOMAIN_MISMATCH",
      });
      return;
    }

    // 3.5. Validate session fingerprint (IP + User-Agent) if enabled
    if (validateFingerprint) {
      const requestIp = (req.ip || req.socket.remoteAddress) as string;
      const requestUserAgent = req.headers["user-agent"] || null;

      // Check IP mismatch (if session has IP recorded)
      const ipMismatch = session.ip_address && session.ip_address !== requestIp;

      // Check User-Agent mismatch (if session has UA recorded)
      const uaMismatch =
        session.user_agent && session.user_agent !== requestUserAgent;

      if (ipMismatch || uaMismatch) {
        if (enableAuditLog) {
          await logAuditEvent(
            CLIENT_AUTH_EVENTS.FINGERPRINT_MISMATCH,
            session.org_id,
            {
              ...metadata,
              session_id: session.id,
              session_ip: session.ip_address,
              request_ip: requestIp,
              session_ua: session.user_agent,
              request_ua: requestUserAgent,
              ip_mismatch: ipMismatch,
              ua_mismatch: uaMismatch,
            }
          );
        }

        // Clear the compromised session
        res.clearCookie("clientSession");

        if (redirectOnFailure) {
          const redirectUrl = new URL(
            loginUrl,
            `${req.protocol}://${req.get("host")}`
          );
          redirectUrl.searchParams.set("redirect", req.originalUrl);
          redirectUrl.searchParams.set("error", "fingerprint_mismatch");
          res.redirect(redirectUrl.toString());
          return;
        }

        res.status(401).json({
          error: "fingerprint_mismatch",
          error_description: "Session fingerprint does not match request",
          code: "FINGERPRINT_MISMATCH",
        });
        return;
      }
    }

    // 4. Get and verify client is active
    const sessionWithClientId = await ClientSessionModel.findById(session.id);
    if (!sessionWithClientId) {
      res.status(500).json({
        error: "server_error",
        error_description: "Failed to retrieve session details",
      });
      return;
    }

    const client = await ClientModel.findByInternalId(
      sessionWithClientId.client_id
    );

    if (!client) {
      if (enableAuditLog) {
        await logAuditEvent(
          CLIENT_AUTH_EVENTS.CLIENT_INACTIVE,
          session.org_id,
          {
            ...metadata,
            session_id: session.id,
            client_id: sessionWithClientId.client_id,
            error: "Client not found",
          }
        );
      }

      res.status(401).json({
        error: "client_not_found",
        error_description: "Client associated with session not found",
        code: "CLIENT_NOT_FOUND",
      });
      return;
    }

    if (!client.is_active) {
      if (enableAuditLog) {
        await logAuditEvent(
          CLIENT_AUTH_EVENTS.CLIENT_INACTIVE,
          session.org_id,
          {
            ...metadata,
            session_id: session.id,
            client_id: client.id,
            error: "Client is disabled",
          }
        );
      }

      // Revoke session for inactive client
      await ClientSessionModel.revokeById(session.id);
      res.clearCookie("clientSession");

      res.status(401).json({
        error: "client_inactive",
        error_description: "Client is disabled",
        code: "CLIENT_INACTIVE",
      });
      return;
    }

    // 5. Run additional validation if provided
    if (options.additionalValidation) {
      const additionalResult = await options.additionalValidation(
        session,
        client
      );
      if (!additionalResult.valid) {
        res.status(401).json({
          error: "validation_failed",
          error_description:
            additionalResult.error || "Additional validation failed",
        });
        return;
      }
    }

    // 6. Success - attach session and client to request
    req.clientSession = session;
    (req as any).client = client;

    // Log successful access (optional, for high-security scenarios)
    // Uncomment if needed:
    // if (enableAuditLog) {
    //   await logAuditEvent(CLIENT_AUTH_EVENTS.ACCESS_GRANTED, session.org_id, {
    //     ...metadata,
    //     session_id: session.id,
    //     client_id: client.id,
    //   });
    // }

    next();
  };
}

/**
 * Pre-configured middleware that requires client session (API style - returns JSON)
 */
export const requireClientAuth = createClientAuthGateway({
  redirectOnFailure: false,
  enableAuditLog: true,
});

/**
 * Pre-configured middleware that requires client session (Web style - redirects)
 */
export const requireClientAuthWithRedirect = createClientAuthGateway({
  redirectOnFailure: true,
  enableAuditLog: true,
});

/**
 * Middleware to optionally attach client session if present
 */
export async function optionalClientAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies?.clientSession;

  if (sessionToken) {
    try {
      const session = await ClientSessionModel.validate(sessionToken);
      if (session) {
        req.clientSession = session;

        const sessionDetails = await ClientSessionModel.findById(session.id);
        if (sessionDetails) {
          const client = await ClientModel.findByInternalId(
            sessionDetails.client_id
          );
          if (client && client.is_active) {
            (req as any).client = client;
          }
        }
      }
    } catch (error) {
      console.error("[ClientAuthGateway] Optional auth check failed:", error);
    }
  }

  next();
}

export default {
  createClientAuthGateway,
  requireClientAuth,
  requireClientAuthWithRedirect,
  optionalClientAuth,
  CLIENT_AUTH_EVENTS,
};
