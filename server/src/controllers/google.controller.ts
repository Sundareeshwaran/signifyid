/**
 * Google OAuth Controller
 *
 * Handles Google OAuth authentication flow
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config/env.js";
import * as UserModel from "../models/User.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as SessionModel from "../models/Session.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { generateTokenPair } from "../services/token.service.js";
import { query } from "../config/db.js";

// State storage for CSRF protection (in production, use Redis)
const stateStore = new Map<string, { createdAt: number; returnTo?: string }>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      // 10 minute expiry
      stateStore.delete(state);
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
 * GET /api/auth/google
 *
 * Initiates Google OAuth flow by redirecting to Google consent screen
 */
export async function initiateGoogle(req: Request, res: Response) {
  try {
    // Check if Google OAuth is configured
    if (!config.google.clientId || !config.google.clientSecret) {
      res.status(501).json({ error: "Google OAuth is not configured" });
      return;
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");
    const returnTo = req.query.returnTo as string | undefined;
    stateStore.set(state, { createdAt: Date.now(), returnTo });

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.redirect(googleAuthUrl);
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    res.redirect(`${config.frontendUrl}/login?error=oauth_init_failed`);
  }
}

/**
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth callback, exchanges code for tokens,
 * creates/links user, and establishes session
 */
export async function googleCallback(req: Request, res: Response) {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      res.redirect(`${config.frontendUrl}/login?error=oauth_denied`);
      return;
    }

    // Validate state for CSRF protection
    if (!state || !stateStore.has(state as string)) {
      res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
      return;
    }

    const stateData = stateStore.get(state as string)!;
    stateStore.delete(state as string);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Google token exchange failed:", errorData);
      res.redirect(`${config.frontendUrl}/login?error=token_exchange_failed`);
      return;
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      id_token: string;
      refresh_token?: string;
    };

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      res.redirect(`${config.frontendUrl}/login?error=userinfo_failed`);
      return;
    }

    const googleUser = (await userInfoResponse.json()) as {
      sub: string; // Google user ID
      email: string;
      email_verified: boolean;
      name: string;
      picture?: string;
    };

    // Check if user exists by Google ID
    let user = await findUserByGoogleId(googleUser.sub);

    if (!user) {
      // Check if user exists by email (link account)
      const existingUser = await UserModel.findByEmail(googleUser.email);

      if (existingUser) {
        user = {
          id: existingUser.id,
          org_id: existingUser.org_id,
          email: existingUser.email,
          display_name: existingUser.display_name || "",
          status: existingUser.status || "active",
        };
        // Link Google ID to existing user
        await linkGoogleId(user.id, googleUser.sub);
        await updateAuthProvider(user.id, "google");
        await AuditLogModel.create(user.org_id, user.id, "auth.google_linked", {
          google_id: googleUser.sub,
        });
      } else {
        // New user - for now, require email domain to match existing org
        const emailDomain = googleUser.email.split("@")[1];
        const org = await findOrgByDomain(emailDomain);

        if (!org) {
          // No org found - redirect to registration
          res.redirect(
            `${config.frontendUrl}/register?email=${encodeURIComponent(
              googleUser.email
            )}&name=${encodeURIComponent(googleUser.name)}&provider=google`
          );
          return;
        }

        // Create new user in existing org
        user = await createGoogleUser({
          orgId: org.id,
          email: googleUser.email,
          displayName: googleUser.name,
          googleId: googleUser.sub,
        });

        // Assign default user role
        const defaultRole = await RoleModel.findByName(org.id, "user");
        if (defaultRole) {
          await RoleModel.assignToUser(defaultRole.id, user.id);
        }

        await AuditLogModel.create(org.id, user.id, "user.created_via_google", {
          email: googleUser.email,
        });
      }
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
      // Redirect to MFA verification
      res.redirect(
        `${config.frontendUrl}/mfa?userId=${encodeURIComponent(
          user.id
        )}&provider=google`
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
      user,
      session.id,
      roles,
      permissions
    );

    // Set cookies
    setCookies(res, authTokens);

    // Audit log
    await AuditLogModel.create(user.org_id, user.id, "auth.login_google", {
      ip: req.ip,
      session_id: session.id,
    });

    // Redirect to dashboard or return URL
    const returnTo = stateData.returnTo || "/dashboard";
    res.redirect(`${config.frontendUrl}${returnTo}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect(`${config.frontendUrl}/login?error=oauth_callback_failed`);
  }
}

/**
 * Find user by Google ID
 */
async function findUserByGoogleId(googleId: string) {
  const result = await query<{
    id: string;
    org_id: string;
    email: string;
    display_name: string;
    status: string;
  }>(
    `SELECT id, org_id, email, display_name, status 
     FROM users WHERE google_id = $1`,
    [googleId]
  );
  return result.rows[0] || null;
}

/**
 * Link Google ID to existing user
 */
async function linkGoogleId(userId: string, googleId: string) {
  await query(`UPDATE users SET google_id = $1 WHERE id = $2`, [
    googleId,
    userId,
  ]);
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
 * Find organization by domain
 */
async function findOrgByDomain(domain: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM organizations WHERE domain = $1`,
    [domain.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Create user via Google OAuth
 */
async function createGoogleUser(data: {
  orgId: string;
  email: string;
  displayName: string;
  googleId: string;
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
    `INSERT INTO users (org_id, email, password_hash, display_name, google_id, auth_provider, status)
     VALUES ($1, $2, $3, $4, $5, 'google', 'active')
     RETURNING id, org_id, email, display_name, status`,
    [
      data.orgId,
      data.email.toLowerCase(),
      passwordHash,
      data.displayName,
      data.googleId,
    ]
  );
  return result.rows[0];
}
