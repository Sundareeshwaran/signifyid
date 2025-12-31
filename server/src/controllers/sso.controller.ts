/**
 * SSO Controller
 *
 * Handles Enterprise SSO (OIDC) authentication flow
 * Supports dynamic IdP resolution based on email domain
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config/env.js";
import * as IdentityProviderModel from "../models/IdentityProvider.model.js";
import * as UserModel from "../models/User.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as SessionModel from "../models/Session.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { generateTokenPair } from "../services/token.service.js";
import { query } from "../config/db.js";

// State storage for CSRF protection (in production, use Redis)
const ssoStateStore = new Map<
  string,
  {
    createdAt: number;
    idpId: string;
    returnTo?: string;
    nonce: string;
  }
>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of ssoStateStore.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      // 10 minute expiry
      ssoStateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Helper to set auth cookies
 */
function setCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
) {
  const sameSite = config.cookie.sameSite.toLowerCase() as
    | "lax"
    | "strict"
    | "none";

  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite,
    maxAge: config.cookie.accessExpires,
    path: "/",
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite,
    maxAge: config.cookie.refreshExpires,
    path: "/api/auth/refresh",
  });
}

/**
 * POST /api/auth/sso
 *
 * Initiates SSO flow by resolving IdP from email domain and redirecting
 */
export async function initiateSso(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Extract domain from email
    const emailParts = email.split("@");
    if (emailParts.length !== 2) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    const domain = emailParts[1].toLowerCase();

    // Look up identity provider for domain
    const idp = await IdentityProviderModel.findByDomain(domain);

    if (!idp) {
      res.status(404).json({
        error: "SSO not configured for this domain",
        message:
          "Your organization does not have SSO configured. Please use email/password login or contact your administrator.",
      });
      return;
    }

    if (!idp.is_active) {
      res.status(403).json({
        error: "SSO is disabled",
        message:
          "SSO has been disabled for your organization. Please contact your administrator.",
      });
      return;
    }

    // Generate state and nonce for security
    const state = crypto.randomBytes(32).toString("hex");
    const nonce = crypto.randomBytes(16).toString("hex");
    const returnTo = req.body.returnTo as string | undefined;

    ssoStateStore.set(state, {
      createdAt: Date.now(),
      idpId: idp.id,
      returnTo,
      nonce,
    });

    // Build authorization URL based on IdP type
    let authUrl: string;

    if (idp.type === "oidc") {
      if (!idp.authorization_endpoint) {
        res
          .status(500)
          .json({ error: "IdP authorization endpoint not configured" });
        return;
      }

      const params = new URLSearchParams({
        client_id: idp.client_id || "",
        redirect_uri: config.sso.callbackUrl,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
      });

      // Add login_hint if we have the email
      params.set("login_hint", email);

      authUrl = `${idp.authorization_endpoint}?${params.toString()}`;
    } else if (idp.type === "google") {
      // Use Google OAuth for this org
      const params = new URLSearchParams({
        client_id: idp.client_id || config.google.clientId,
        redirect_uri: config.sso.callbackUrl,
        response_type: "code",
        scope: "openid email profile",
        state,
        hd: domain, // Restrict to organization domain
        login_hint: email,
      });

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else {
      res.status(501).json({ error: `IdP type ${idp.type} not yet supported` });
      return;
    }

    // Return redirect URL for frontend to handle
    res.json({ redirectUrl: authUrl });
  } catch (error) {
    console.error("SSO initiation error:", error);
    res.status(500).json({ error: "SSO initiation failed" });
  }
}

/**
 * GET /api/auth/sso/callback
 *
 * Handles IdP callback, validates tokens, creates/links user, establishes session
 */
export async function ssoCallback(req: Request, res: Response) {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error("SSO error:", error, error_description);
      res.redirect(
        `${
          config.frontendUrl
        }/login?error=sso_denied&message=${encodeURIComponent(
          String(error_description || error)
        )}`
      );
      return;
    }

    // Validate state for CSRF protection
    if (!state || !ssoStateStore.has(state as string)) {
      res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
      return;
    }

    const stateData = ssoStateStore.get(state as string)!;
    ssoStateStore.delete(state as string);

    // Get IdP configuration
    const idp = await IdentityProviderModel.findById(stateData.idpId);
    if (!idp) {
      res.redirect(`${config.frontendUrl}/login?error=idp_not_found`);
      return;
    }

    // Exchange code for tokens
    let tokenEndpoint: string;
    let tokenBody: URLSearchParams;

    if (idp.type === "google") {
      tokenEndpoint = "https://oauth2.googleapis.com/token";
      tokenBody = new URLSearchParams({
        code: code as string,
        client_id: idp.client_id || config.google.clientId,
        client_secret:
          idp.client_secret_encrypted || config.google.clientSecret,
        redirect_uri: config.sso.callbackUrl,
        grant_type: "authorization_code",
      });
    } else if (idp.type === "oidc") {
      if (!idp.token_endpoint) {
        res.redirect(`${config.frontendUrl}/login?error=idp_misconfigured`);
        return;
      }
      tokenEndpoint = idp.token_endpoint;
      tokenBody = new URLSearchParams({
        code: code as string,
        client_id: idp.client_id || "",
        client_secret: idp.client_secret_encrypted || "",
        redirect_uri: config.sso.callbackUrl,
        grant_type: "authorization_code",
      });
    } else {
      res.redirect(`${config.frontendUrl}/login?error=unsupported_idp`);
      return;
    }

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("SSO token exchange failed:", errorData);
      res.redirect(`${config.frontendUrl}/login?error=token_exchange_failed`);
      return;
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      id_token: string;
    };

    // Get user info
    let userinfoEndpoint: string;
    if (idp.type === "google") {
      userinfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";
    } else if (idp.userinfo_endpoint) {
      userinfoEndpoint = idp.userinfo_endpoint;
    } else {
      res.redirect(`${config.frontendUrl}/login?error=userinfo_not_configured`);
      return;
    }

    const userInfoResponse = await fetch(userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      res.redirect(`${config.frontendUrl}/login?error=userinfo_failed`);
      return;
    }

    const ssoUser = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };

    // Define user type for this flow
    type SsoUserData = {
      id: string;
      org_id: string;
      email: string;
      display_name: string;
      status: string;
    };

    // Find or create user
    let user: SsoUserData;
    const existingUser = await UserModel.findByEmail(ssoUser.email);

    if (!existingUser) {
      // Create new user in the IdP's organization
      const displayName =
        ssoUser.name ||
        `${ssoUser.given_name || ""} ${ssoUser.family_name || ""}`.trim() ||
        ssoUser.email.split("@")[0];

      const newUser = await createSsoUser({
        orgId: idp.org_id,
        email: ssoUser.email,
        displayName,
        authProvider: "sso",
      });

      user = newUser;

      // Assign default user role
      const defaultRole = await RoleModel.findByName(idp.org_id, "user");
      if (defaultRole) {
        await RoleModel.assignToUser(defaultRole.id, user.id);
      }

      await AuditLogModel.create(idp.org_id, user.id, "user.created_via_sso", {
        email: ssoUser.email,
        idp_name: idp.name,
      });
    } else {
      // Verify user belongs to correct org
      if (existingUser.org_id !== idp.org_id) {
        res.redirect(`${config.frontendUrl}/login?error=org_mismatch`);
        return;
      }

      user = {
        id: existingUser.id,
        org_id: existingUser.org_id,
        email: existingUser.email,
        display_name: existingUser.display_name || "",
        status: existingUser.status || "active",
      };

      // Update auth provider if needed
      await updateAuthProvider(user.id, "sso");
    }

    // Check user status
    if (user.status !== "active") {
      res.redirect(`${config.frontendUrl}/login?error=account_disabled`);
      return;
    }

    // Check if MFA is required
    const { hasVerifiedMfa } = await import("../models/Mfa.model.js");
    const mfaEnabled = await hasVerifiedMfa(user.id);

    if (mfaEnabled) {
      res.redirect(
        `${config.frontendUrl}/mfa?userId=${encodeURIComponent(
          user.id
        )}&provider=sso`
      );
      return;
    }

    // Create session and generate tokens
    await UserModel.updateLastLogin(user.id);
    const roles = await RoleModel.getUserRoles(user.id);
    const permissions = await RoleModel.getUserPermissions(user.id);

    const session = await SessionModel.create({
      userId: user.id,
      orgId: user.org_id,
      mfaVerified: false,
      expiresAt: new Date(Date.now() + config.cookie.refreshExpires),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const authTokens = await generateTokenPair(
      {
        id: user.id,
        org_id: user.org_id,
        email: user.email,
        display_name: user.display_name,
      },
      session.id,
      roles,
      permissions
    );

    // Set cookies
    setCookies(res, authTokens);

    // Audit log
    await AuditLogModel.create(user.org_id, user.id, "auth.login_sso", {
      ip: req.ip,
      session_id: session.id,
      idp_name: idp.name,
    });

    // Redirect to dashboard or return URL
    const returnTo = stateData.returnTo || "/dashboard";
    res.redirect(`${config.frontendUrl}${returnTo}`);
  } catch (error) {
    console.error("SSO callback error:", error);
    res.redirect(`${config.frontendUrl}/login?error=sso_callback_failed`);
  }
}

/**
 * Update user's auth provider
 */
async function updateAuthProvider(userId: string, provider: string) {
  await query(`UPDATE users SET auth_provider = $1 WHERE id = $2`, [
    provider,
    userId,
  ]);
}

/**
 * Create user via SSO
 */
async function createSsoUser(data: {
  orgId: string;
  email: string;
  displayName: string;
  authProvider: string;
}) {
  // Generate a random password hash (user won't use it)
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await UserModel.hashPassword(randomPassword);

  const result = await query<{
    id: string;
    org_id: string;
    email: string;
    display_name: string;
    status: string;
  }>(
    `INSERT INTO users (org_id, email, password_hash, display_name, auth_provider, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     RETURNING id, org_id, email, display_name, status`,
    [
      data.orgId,
      data.email.toLowerCase(),
      passwordHash,
      data.displayName,
      data.authProvider,
    ]
  );
  return result.rows[0];
}
