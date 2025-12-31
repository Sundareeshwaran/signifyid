/**
 * OAuth Controller
 *
 * Handles OAuth2/OIDC authorization endpoints
 */
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import * as ClientModel from "../models/Client.model.js";
import * as AuthCodeModel from "../models/AuthCode.model.js";
import * as UserModel from "../models/User.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";

/**
 * GET /oauth/authorize
 *
 * Validates OAuth2 parameters and returns client info for consent page.
 * The frontend should redirect user to login if not authenticated.
 */
export async function getAuthorize(req: Request, res: Response) {
  try {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
    } = req.query;

    // Validate required params
    if (!client_id || typeof client_id !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "client_id is required",
      });
      return;
    }

    if (response_type !== "code") {
      res.status(400).json({
        error: "unsupported_response_type",
        error_description: "Only authorization_code flow is supported",
      });
      return;
    }

    // Find client
    const client = await ClientModel.findByClientId(client_id);
    if (!client) {
      res.status(400).json({
        error: "invalid_client",
        error_description: "Client not found",
      });
      return;
    }

    // Check if client is active
    if (client.is_active === false) {
      res.status(400).json({
        error: "unauthorized_client",
        error_description: "Client is disabled",
      });
      return;
    }

    // Validate redirect_uri
    if (!redirect_uri || typeof redirect_uri !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri is required",
      });
      return;
    }

    if (!ClientModel.isValidRedirectUri(client, redirect_uri)) {
      res.status(400).json({
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uri not registered or invalid (HTTPS required except localhost)",
      });
      return;
    }

    // Parse scopes
    const requestedScopes =
      typeof scope === "string" ? scope.split(" ") : ["openid"];
    const validScopes = requestedScopes.filter((s) =>
      client.scopes.includes(s)
    );

    // Check if user has MFA enabled (if authenticated)
    let mfaRequired = false;
    if (req.user) {
      const { hasVerifiedMfa } = await import("../models/Mfa.model.js");
      mfaRequired = await hasVerifiedMfa(req.user.sub);
    }

    // Return client info for consent page
    res.json({
      client_id: client.client_id,
      client_name: client.name || client.client_id,
      redirect_uri,
      scopes: validScopes,
      state: state || "",
      mfa_required: mfaRequired,
    });
  } catch (error) {
    console.error("GET /oauth/authorize error:", error);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * POST /oauth/authorize
 *
 * User approves authorization - generates auth code and returns redirect URL
 */
export async function postAuthorize(req: Request, res: Response) {
  try {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
      approved,
    } = req.body;

    // User must be authenticated
    if (!req.user) {
      res.status(401).json({ error: "login_required" });
      return;
    }

    // User denied
    if (!approved) {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set("error", "access_denied");
      if (state) redirectUrl.searchParams.set("state", state);
      res.json({ redirect_uri: redirectUrl.toString() });
      return;
    }

    // Find client
    const client = await ClientModel.findByClientId(client_id);
    if (!client) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    // Validate redirect_uri
    if (!ClientModel.isValidRedirectUri(client, redirect_uri)) {
      res.status(400).json({ error: "invalid_redirect_uri" });
      return;
    }

    // Generate authorization code
    const scopes = typeof scope === "string" ? scope.split(" ") : [];
    const code = await AuthCodeModel.create({
      clientId: client.id, // Internal UUID
      userId: req.user.sub,
      redirectUri: redirect_uri,
      scopes,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method || "S256",
      nonce,
    });

    // Audit log
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "oauth.authorize",
      { client_id, scopes }
    );

    // Build redirect URL with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    res.json({ redirect_uri: redirectUrl.toString() });
  } catch (error) {
    console.error("POST /oauth/authorize error:", error);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * POST /oauth/verify-authorize
 *
 * Client authentication with MFA/OTP verification before issuing authorization code
 * This endpoint enforces:
 * - User authentication
 * - Client ID + Secret validation
 * - Redirect URI exact matching
 * - MFA/OTP verification (if enabled for user)
 * - Secure authorization code generation
 */
export async function verifyAndAuthorize(req: Request, res: Response) {
  try {
    const {
      client_id,
      client_secret,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
      otp_code, // MFA code if user has MFA enabled
    } = req.body;

    // User must be authenticated
    if (!req.user) {
      res.status(401).json({
        error: "login_required",
        error_description: "User must be authenticated",
      });
      return;
    }

    // Validate required params
    if (!client_id || typeof client_id !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "client_id is required",
      });
      return;
    }

    if (!redirect_uri || typeof redirect_uri !== "string") {
      res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri is required",
      });
      return;
    }

    // Comprehensive client validation
    const validation = await ClientModel.validateClientForAuthorization(
      client_id,
      redirect_uri,
      client_secret
    );

    if (!validation.valid) {
      // Audit log - client authentication failed
      await AuditLogModel.create(
        req.user.org_id,
        req.user.sub,
        "client_verification_failed",
        {
          client_id,
          error: validation.error,
          ip: req.ip,
        }
      );

      res.status(400).json({
        error: validation.error,
        error_description: validation.errorDescription,
      });
      return;
    }

    const client = validation.client;

    // This should never happen if validation.valid is true, but satisfies TypeScript
    if (!client) {
      res.status(400).json({
        error: "invalid_client",
        error_description: "Client validation failed unexpectedly",
      });
      return;
    }

    // Audit log - client authenticated successfully
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "client_authenticated",
      {
        client_id,
        client_internal_id: client?.id,
        ip: req.ip,
      }
    );

    // Check if user has MFA enabled
    const { hasVerifiedMfa, getWithSecret } = await import(
      "../models/Mfa.model.js"
    );
    const mfaEnabled = await hasVerifiedMfa(req.user.sub);

    if (mfaEnabled) {
      // MFA is required - verify OTP
      if (
        !otp_code ||
        typeof otp_code !== "string" ||
        !/^\d{6}$/.test(otp_code)
      ) {
        res.status(400).json({
          error: "mfa_required",
          error_description: "Valid 6-digit OTP code is required",
        });
        return;
      }

      // Get user's TOTP method and verify
      const { verifyTotp } = await import("../models/Mfa.model.js");
      const mfa = await getWithSecret(req.user.sub, "totp");

      if (!mfa || !mfa.verified) {
        res.status(400).json({
          error: "server_error",
          error_description: "MFA configuration error",
        });
        return;
      }

      const validOtp = verifyTotp(mfa.secret, otp_code);
      if (!validOtp) {
        // Audit log - OTP verification failed
        await AuditLogModel.create(
          req.user.org_id,
          req.user.sub,
          "otp_verification_failed",
          { client_id, ip: req.ip }
        );

        res.status(400).json({
          error: "access_denied",
          error_description: "Invalid OTP code",
        });
        return;
      }

      // Audit log - OTP verified
      await AuditLogModel.create(
        req.user.org_id,
        req.user.sub,
        "otp_verified",
        { client_id, ip: req.ip }
      );
    }

    // All validation passed - generate authorization code
    const scopes = typeof scope === "string" ? scope.split(" ") : ["openid"];
    const validScopes = scopes.filter((s) => client.scopes.includes(s));

    const code = await AuthCodeModel.create({
      clientId: client.id, // Internal UUID
      userId: req.user.sub,
      redirectUri: redirect_uri,
      scopes: validScopes,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method || "S256",
      nonce,
    });

    // Audit log - authorization successful
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "oauth.authorize",
      {
        client_id,
        scopes: validScopes,
        mfa_verified: mfaEnabled,
        ip: req.ip,
      }
    );

    // Build redirect URL with authorization code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    // Audit log - redirect success
    await AuditLogModel.create(
      req.user.org_id,
      req.user.sub,
      "redirect_success",
      {
        client_id,
        redirect_uri,
        ip: req.ip,
      }
    );

    res.json({
      redirect_uri: redirectUrl.toString(),
      success: true,
    });
  } catch (error) {
    console.error("POST /oauth/verify-authorize error:", error);

    // Audit log - redirect failed
    if (req.user) {
      await AuditLogModel.create(
        req.user.org_id,
        req.user.sub,
        "redirect_failed",
        {
          client_id: req.body.client_id,
          error: "server_error",
          ip: req.ip,
        }
      );
    }

    res.status(500).json({ error: "server_error" });
  }
}

/**
 * POST /oauth/token
 *
 * Exchange authorization code for tokens
 */
export async function token(req: Request, res: Response) {
  try {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
    } = req.body;

    // Validate grant_type
    if (grant_type !== "authorization_code" && grant_type !== "refresh_token") {
      res.status(400).json({ error: "unsupported_grant_type" });
      return;
    }

    // Handle authorization_code grant
    if (grant_type === "authorization_code") {
      if (!code || !redirect_uri || !client_id) {
        res.status(400).json({
          error: "invalid_request",
          error_description: "Missing required parameters",
        });
        return;
      }

      // Find and validate authorization code
      const authCode = await AuthCodeModel.findValid(code);
      if (!authCode) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid or expired authorization code",
        });
        return;
      }

      // Verify redirect_uri matches
      if (authCode.redirect_uri !== redirect_uri) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "redirect_uri mismatch",
        });
        return;
      }

      // Verify client
      if (authCode.public_client_id !== client_id) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "client_id mismatch",
        });
        return;
      }

      // Verify client secret (confidential clients)
      if (client_secret) {
        const validSecret = await ClientModel.verifySecret(
          client_id,
          client_secret
        );
        if (!validSecret) {
          res.status(401).json({ error: "invalid_client" });
          return;
        }
      }

      // Verify PKCE if code challenge was provided
      if (authCode.code_challenge) {
        if (!code_verifier) {
          res.status(400).json({
            error: "invalid_grant",
            error_description: "code_verifier required",
          });
          return;
        }
        const valid = AuthCodeModel.verifyPKCE(
          code_verifier,
          authCode.code_challenge,
          authCode.code_challenge_method || "S256"
        );
        if (!valid) {
          res.status(400).json({
            error: "invalid_grant",
            error_description: "Invalid code_verifier",
          });
          return;
        }
      }

      // Consume the code
      await AuthCodeModel.consume(code);

      // Get user info
      const user = await UserModel.findById(authCode.user_id);
      if (!user) {
        res.status(400).json({
          error: "invalid_grant",
          error_description: "User not found",
        });
        return;
      }

      const roles = await RoleModel.getUserRoles(user.id);

      // Generate access token
      const accessToken = jwt.sign(
        {
          sub: user.id,
          org_id: user.org_id,
          email: user.email,
          roles,
          scope: authCode.scopes.join(" "),
          client_id,
        },
        config.jwt.secret,
        { expiresIn: "1h", algorithm: "HS256" }
      );

      // Generate ID token (OIDC)
      const idToken = jwt.sign(
        {
          iss: config.frontendUrl,
          sub: user.id,
          aud: client_id,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nonce: authCode.nonce,
          email: user.email,
          name: user.display_name,
        },
        config.jwt.secret,
        { algorithm: "HS256" }
      );

      // Audit log
      await AuditLogModel.create(
        authCode.org_id,
        user.id,
        "oauth.token_issued",
        { client_id }
      );

      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken,
        scope: authCode.scopes.join(" "),
      });
      return;
    }

    // TODO: Handle refresh_token grant
    res.status(400).json({ error: "unsupported_grant_type" });
  } catch (error) {
    console.error("POST /oauth/token error:", error);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * GET /.well-known/openid-configuration
 *
 * OIDC Discovery document
 */
export async function openidConfiguration(req: Request, res: Response) {
  const issuer = config.frontendUrl;

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    code_challenge_methods_supported: ["S256", "plain"],
  });
}

/**
 * GET /oauth/userinfo
 *
 * OIDC UserInfo endpoint
 */
export async function userInfo(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const user = await UserModel.findById(req.user.sub);
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    res.json({
      sub: user.id,
      email: user.email,
      email_verified: true,
      name: user.display_name,
    });
  } catch (error) {
    console.error("GET /oauth/userinfo error:", error);
    res.status(500).json({ error: "server_error" });
  }
}
