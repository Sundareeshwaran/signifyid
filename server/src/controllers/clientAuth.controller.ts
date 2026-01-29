/**
 * Client Authentication Controller
 *
 * Handles client-based site authentication using Client ID + Secret
 * This is separate from OAuth user authentication
 */
import type { Request, Response } from "express";
import * as ClientModel from "../models/Client.model.js";
import * as ClientSessionModel from "../models/ClientSession.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";

/**
 * POST /api/client-auth/login
 *
 * Authenticate client using Client ID + Secret and create session
 */
export async function login(req: Request, res: Response) {
  try {
    const { client_id, client_secret, redirect_uri } = req.body;

    // Validate required params
    if (!client_id || typeof client_id !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "client_id is required",
      });
      return;
    }

    if (!client_secret || typeof client_secret !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "client_secret is required",
      });
      return;
    }

    // Extract domain from request
    const domain =
      req.headers.origin || req.headers.referer || req.get("host") || "unknown";

    // Get IP and user agent
    const ipAddress = (req.ip || req.socket.remoteAddress) as string;
    const userAgent = (req.headers["user-agent"] as string) || null;

    // Validate client credentials and domain
    const validation = await ClientModel.validateClientForSiteAuth(
      client_id,
      client_secret,
      domain,
    );

    if (!validation.valid) {
      // Audit log - login failed
      if (validation.client) {
        await AuditLogModel.create(
          validation.client.org_id,
          null,
          "client_login_failed",
          {
            client_id,
            error: validation.error,
            domain,
            ip: ipAddress,
            user_agent: userAgent,
          },
        );
      }

      res.status(401).json({
        error: validation.error,
        error_description: validation.errorDescription,
      });
      return;
    }

    const client = validation.client!;

    // Determine final redirect URI
    let finalRedirectUri = domain;

    if (redirect_uri) {
      // Check if it's a same-origin redirect
      const requestOrigin = req.headers.origin || req.headers.referer;
      let isSameOrigin = false;

      try {
        const redirectUrl = new URL(redirect_uri);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const frontendOrigin = new URL(frontendUrl).origin;

        isSameOrigin =
          redirectUrl.origin === frontendOrigin ||
          (!!requestOrigin &&
            redirectUrl.origin === new URL(requestOrigin).origin);
      } catch {
        if (redirect_uri.startsWith("/")) {
          isSameOrigin = true;
        }
      }

      if (isSameOrigin) {
        finalRedirectUri = redirect_uri;
      } else if (client.redirect_uris && client.redirect_uris.length > 0) {
        const isValidRedirect = client.redirect_uris.some(
          (registeredUri: string) => {
            try {
              const providedUrl = new URL(redirect_uri);
              const registeredUrl = new URL(registeredUri);
              return (
                providedUrl.origin === registeredUrl.origin ||
                redirect_uri === registeredUri ||
                redirect_uri.startsWith(registeredUri.replace(/\/$/, ""))
              );
            } catch {
              return redirect_uri === registeredUri;
            }
          },
        );

        if (isValidRedirect) {
          finalRedirectUri = redirect_uri;
        } else {
          res.status(400).json({
            error: "invalid_redirect_uri",
            error_description:
              "The redirect_uri is not registered for this client",
          });
          return;
        }
      } else {
        finalRedirectUri = redirect_uri;
      }
    } else if (client.redirect_uris && client.redirect_uris.length > 0) {
      finalRedirectUri = client.redirect_uris[0];
    }

    // Determine session domain (use redirect URI origin if available, otherwise request domain)
    let sessionDomain = domain;
    try {
      if (finalRedirectUri && finalRedirectUri.startsWith("http")) {
        const url = new URL(finalRedirectUri);
        sessionDomain = url.origin; // e.g., http://localhost:5173
      }
    } catch (e) {
      // Keep default domain if parsing fails
    }

    // Create client session
    const { session, sessionToken } = await ClientSessionModel.create(
      client.id,
      client.org_id,
      sessionDomain,
      ipAddress,
      userAgent,
      null,
      24,
    );

    // Audit log - login success
    await AuditLogModel.create(client.org_id, null, "client_login_success", {
      client_id,
      client_internal_id: client.id,
      domain,
      ip: ipAddress,
      session_id: session.id,
      redirect_uri: finalRedirectUri,
    });

    // Audit log - session created
    await AuditLogModel.create(client.org_id, null, "client_session_created", {
      client_id,
      session_id: session.id,
      domain,
      ip: ipAddress,
      expires_at: session.expires_at,
    });

    // Audit log - redirect back
    if (finalRedirectUri && finalRedirectUri !== domain) {
      await AuditLogModel.create(
        client.org_id,
        null,
        "client_redirected_back",
        {
          client_id,
          session_id: session.id,
          redirect_uri: finalRedirectUri,
          ip: ipAddress,
          timestamp: new Date().toISOString(),
        },
      );
    }

    // Set cookie
    res.cookie("clientSession", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Return success
    res.json({
      success: true,
      session_id: session.id,
      expires_at: session.expires_at,
      redirect_uri: finalRedirectUri,
      session_token: sessionToken,
    });
  } catch (error: any) {
    console.error("POST /api/client-auth/login error:", error);
    res.status(500).json({
      error: "server_error",
      details: error.message || error.toString(),
    });
  }
}

/**
 * POST /api/client-auth/session/validate
 *
 * Validate active client session
 */
export async function validateSession(req: Request, res: Response) {
  try {
    const sessionToken = req.cookies?.clientSession || req.body.session_token;

    if (!sessionToken) {
      res.status(401).json({
        valid: false,
        error: "no_session",
        error_description: "No session token provided",
      });
      return;
    }

    // Validate session
    const session = await ClientSessionModel.validate(sessionToken);

    if (!session) {
      res.status(401).json({
        valid: false,
        error: "invalid_session",
        error_description: "Session invalid, expired, or revoked",
      });
      return;
    }

    // Get client info
    const client = await ClientModel.findByClientId(
      (await ClientSessionModel.findById(session.id))?.client_id || "",
    );

    // Verify domain matches (security check)
    // Normalize domains to handle protocol differences (http vs https, missing protocol)
    const normalizeDomain = (url: string) => {
      try {
        return url
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "")
          .toLowerCase();
      } catch {
        return url.toLowerCase();
      }
    };

    const requestDomain =
      req.headers.origin || req.headers.referer || req.get("host") || "unknown";

    const normalizedSessionDomain = normalizeDomain(session.domain);
    const normalizedRequestDomain = normalizeDomain(requestDomain);

    // Check if domains match (or if session domain is valid substring for subdomains)
    if (
      normalizedSessionDomain !== normalizedRequestDomain &&
      !normalizedRequestDomain.endsWith(normalizedSessionDomain)
    ) {
      console.warn(
        `[ClientAuth] Domain mismatch: session=${normalizedSessionDomain}, request=${normalizedRequestDomain}`,
      );
      res.status(403).json({
        valid: false,
        error: "domain_mismatch",
        error_description: "Session domain does not match request domain",
      });
      return;
    }

    res.json({
      valid: true,
      session_id: session.id,
      domain: session.domain,
      expires_at: session.expires_at,
      client_id: client?.client_id,
    });
  } catch (error) {
    console.error("POST /api/client-auth/session/validate error:", error);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * POST /api/client-auth/logout
 *
 * Revoke client session
 */
export async function logout(req: Request, res: Response) {
  try {
    const sessionToken = req.cookies?.clientSession || req.body.session_token;

    if (!sessionToken) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "No session token provided",
      });
      return;
    }

    // Get session info before revoking (for audit log)
    const session = await ClientSessionModel.findByToken(sessionToken);

    // Revoke session
    const revoked = await ClientSessionModel.revoke(sessionToken);

    if (!revoked) {
      res.status(404).json({
        error: "session_not_found",
        error_description: "Session not found",
      });
      return;
    }

    // Audit log - logout
    if (session) {
      const client = await ClientModel.findByClientId(
        (await ClientSessionModel.findById(session.id))?.client_id || "",
      );
      if (client) {
        await AuditLogModel.create(client.org_id, null, "client_logout", {
          client_id: client.client_id,
          session_id: session.id,
          domain: session.domain,
        });
      }
    }

    // Clear cookie
    res.clearCookie("clientSession", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/client-auth/logout error:", error);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * GET /api/client-auth/callback
 *
 * Dynamic callback handler for client sites
 */
export async function callback(req: Request, res: Response) {
  try {
    const { session_ref } = req.query;
    const sessionToken = req.cookies?.clientSession;

    if (!sessionToken) {
      res.redirect("/client/login?error=no_session");
      return;
    }

    // Validate session
    const session = await ClientSessionModel.validate(sessionToken);

    if (!session) {
      res.redirect("/client/login?error=invalid_session");
      return;
    }

    // Get client info
    const client = await ClientModel.findByClientId(
      (await ClientSessionModel.findById(session.id))?.client_id || "",
    );

    if (!client) {
      res.redirect("/client/login?error=client_not_found");
      return;
    }

    // Return success page or redirect to client site
    res.json({
      success: true,
      message: "Client authenticated successfully",
      session_id: session.id,
      client_id: client.client_id,
      expires_at: session.expires_at,
    });
  } catch (error) {
    console.error("GET /api/client-auth/callback error:", error);
    res.redirect("/client/login?error=server_error");
  }
}
