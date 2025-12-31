/**
 * Client Model
 *
 * Data access layer for OAuth client operations
 */
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";
import { query } from "../config/db.js";

/**
 * Generate client ID and secret
 */
export function generateCredentials() {
  const clientId = `client_${uuidv4().replace(/-/g, "")}`;
  const clientSecret = `secret_${uuidv4().replace(/-/g, "")}${uuidv4().replace(
    /-/g,
    ""
  )}`;
  return { clientId, clientSecret };
}

/**
 * Hash client secret
 */
export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret);
}

/**
 * List all clients in organization (including disabled)
 */
export async function list(orgId: string): Promise<Client[]> {
  const result = await query<Client>(
    `SELECT id, client_id, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type, created_at
     FROM clients
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Find client by ID
 */
export async function findById(
  id: string,
  orgId: string
): Promise<Client | null> {
  const result = await query<Client>(
    `SELECT id, client_id, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type, created_at
     FROM clients
     WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  return result.rows[0] || null;
}

/**
 * Client interface for type safety
 */
export interface Client {
  id: string;
  org_id: string;
  client_id: string;
  client_secret_hash?: string;
  name: string | null;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
  allowed_domains: string[] | null;
  status: string;
  project_type: string;
  created_at: Date;
}

/**
 * Find client by internal UUID (without org restriction)
 * Used for session validation where org_id is not available in context
 */
export async function findByInternalId(id: string): Promise<Client | null> {
  const result = await query<Client>(
    `SELECT id, org_id, client_id, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type, created_at
     FROM clients
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new OAuth client
 */
export async function create(
  orgId: string,
  name: string | null,
  redirectUris: string[],
  scopes: string[],
  allowedDomains?: string[],
  projectType?: string
): Promise<{ row: Client; clientSecret: string }> {
  const { clientId, clientSecret } = generateCredentials();
  const secretHash = await hashSecret(clientSecret);

  const result = await query<Client>(
    `INSERT INTO clients (org_id, client_id, client_secret_hash, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, 'active', $8)
     RETURNING id, client_id, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type, created_at`,
    [
      orgId,
      clientId,
      secretHash,
      name,
      redirectUris,
      scopes,
      allowedDomains || null,
      projectType || "website",
    ]
  );

  return { row: result.rows[0], clientSecret };
}

/**
 * Update client
 */
export async function update(
  id: string,
  orgId: string,
  data: {
    name?: string;
    redirectUris?: string[];
    scopes?: string[];
    allowedDomains?: string[];
    projectType?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: (string | string[] | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.redirectUris !== undefined) {
    updates.push(`redirect_uris = $${paramIndex++}`);
    values.push(data.redirectUris);
  }
  if (data.scopes !== undefined) {
    updates.push(`scopes = $${paramIndex++}`);
    values.push(data.scopes);
  }
  if (data.allowedDomains !== undefined) {
    updates.push(`allowed_domains = $${paramIndex++}`);
    values.push(data.allowedDomains.length > 0 ? data.allowedDomains : null);
  }
  if (data.projectType !== undefined) {
    updates.push(`project_type = $${paramIndex++}`);
    values.push(data.projectType);
  }

  if (updates.length > 0) {
    values.push(id, orgId);
    await query(
      `UPDATE clients SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
      values
    );
  }
}

/**
 * Delete client (hard delete) and revoke tokens
 */
export async function remove(id: string, orgId: string): Promise<void> {
  // Revoke all tokens for this client
  await query(`UPDATE tokens SET revoked = TRUE WHERE client_id = $1`, [id]);

  // Delete all sessions for this client
  await query(`DELETE FROM sessions WHERE client_id = $1`, [id]);

  // Hard delete the client from the database
  await query(`DELETE FROM clients WHERE id = $1 AND org_id = $2`, [id, orgId]);
}

/**
 * Regenerate client secret
 */
export async function regenerateSecret(
  id: string,
  orgId: string
): Promise<string> {
  const clientSecret = `secret_${uuidv4().replace(/-/g, "")}${uuidv4().replace(
    /-/g,
    ""
  )}`;
  const secretHash = await hashSecret(clientSecret);

  await query(
    `UPDATE clients SET client_secret_hash = $1 WHERE id = $2 AND org_id = $3`,
    [secretHash, id, orgId]
  );

  return clientSecret;
}

/**
 * Set client active status
 */
export async function setActive(
  id: string,
  orgId: string,
  isActive: boolean
): Promise<void> {
  await query(
    `UPDATE clients SET is_active = $1 WHERE id = $2 AND org_id = $3`,
    [isActive, id, orgId]
  );
}

/**
 * Find client by public client_id (not internal UUID)
 */
export async function findByClientId(clientId: string): Promise<Client | null> {
  const result = await query<Client>(
    `SELECT id, org_id, client_id, client_secret_hash, name, redirect_uris, scopes, is_active, allowed_domains, status, project_type, created_at
     FROM clients
     WHERE client_id = $1 AND (is_active = TRUE OR is_active IS NULL)`,
    [clientId]
  );
  return result.rows[0] || null;
}

/**
 * Verify client secret
 */
export async function verifySecret(
  clientId: string,
  secret: string
): Promise<boolean> {
  const client = await findByClientId(clientId);
  if (!client || !client.client_secret_hash) {
    return false;
  }
  try {
    return await argon2.verify(client.client_secret_hash, secret);
  } catch {
    return false;
  }
}

/**
 * Check if redirect URI is valid for client
 * - Exact match required (no wildcards, no partial matches)
 * - HTTPS required in production (except localhost for dev)
 */
export function isValidRedirectUri(
  client: { redirect_uris: string[] },
  redirectUri: string
): boolean {
  // Must be exact match in registered URIs
  if (!client.redirect_uris.includes(redirectUri)) {
    return false;
  }

  // Validate HTTPS requirement (except localhost)
  try {
    const url = new URL(redirectUri);
    const isLocalhost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    // Allow http only for localhost, otherwise require https
    if (url.protocol === "http:" && !isLocalhost) {
      return false;
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Comprehensive client validation for authorization flow
 * Returns detailed validation result with OAuth2-compliant error codes
 */
export async function validateClientForAuthorization(
  clientId: string,
  redirectUri: string,
  clientSecret?: string
): Promise<{
  valid: boolean;
  client?: Client;
  error?: string;
  errorDescription?: string;
}> {
  // Find client
  const client = await findByClientId(clientId);
  if (!client) {
    return {
      valid: false,
      error: "invalid_client",
      errorDescription: "Client not found",
    };
  }

  // Check if client is active
  if (client.is_active === false) {
    return {
      valid: false,
      error: "unauthorized_client",
      errorDescription: "Client is disabled",
    };
  }

  // Validate redirect URI
  if (!isValidRedirectUri(client, redirectUri)) {
    return {
      valid: false,
      error: "invalid_redirect_uri",
      errorDescription: "redirect_uri not registered or invalid",
    };
  }

  // Verify client secret if provided (for confidential clients)
  if (clientSecret) {
    const validSecret = await verifySecret(clientId, clientSecret);
    if (!validSecret) {
      return {
        valid: false,
        error: "invalid_client",
        errorDescription: "Invalid client credentials",
      };
    }
  }

  return {
    valid: true,
    client,
  };
}

/**
 * Validate domain against client's allowed_domains list
 * - If no allowed domains configured, allow all domains (optional restriction)
 * - If allowed domains configured, exact match required (no wildcards, no partial matches)
 */
export function validateDomain(
  client: { allowed_domains?: string[] | null },
  domain: string
): boolean {
  // If no allowed domains configured, allow all domains (optional restriction)
  if (!client.allowed_domains || client.allowed_domains.length === 0) {
    return true;
  }

  // Exact match required when domains are configured
  return client.allowed_domains.includes(domain);
}

/**
 * Update allowed domains for a client
 */
export async function updateAllowedDomains(
  clientId: string,
  orgId: string,
  domains: string[]
): Promise<void> {
  await query(
    `UPDATE clients SET allowed_domains = $1 WHERE id = $2 AND org_id = $3`,
    [domains, clientId, orgId]
  );
}

/**
 * Update client status (active/disabled)
 * Also revokes all sessions when disabling a client
 */
export async function updateStatus(
  clientId: string,
  orgId: string,
  status: string
): Promise<void> {
  await query(`UPDATE clients SET status = $1 WHERE id = $2 AND org_id = $3`, [
    status,
    clientId,
    orgId,
  ]);

  // If disabling, revoke all active sessions for this client
  if (status === "disabled") {
    await query(
      `UPDATE client_sessions SET revoked = TRUE WHERE client_id = $1 AND revoked = FALSE`,
      [clientId]
    );
  }
}

/**
 * Check if client is active (for client authentication)
 * Checks both status and is_active for backwards compatibility
 */
export function isClientActive(client: {
  status?: string;
  is_active?: boolean;
}): boolean {
  // Check new status field first
  if (client.status) {
    return client.status === "active";
  }
  // Fall back to is_active for backwards compatibility
  return client.is_active !== false;
}

/**
 * Validate client for site authentication (Client Auth System)
 * Returns detailed validation result
 */
export async function validateClientForSiteAuth(
  clientId: string,
  clientSecret: string,
  domain: string
): Promise<{
  valid: boolean;
  client?: Client;
  error?: string;
  errorDescription?: string;
}> {
  // Find client
  const client = await findByClientId(clientId);
  if (!client) {
    return {
      valid: false,
      error: "invalid_client_id",
      errorDescription: "Client not found",
    };
  }

  // Check if client is active
  if (!isClientActive(client)) {
    return {
      valid: false,
      error: "client_disabled",
      errorDescription: "Client is disabled",
    };
  }

  // Verify client secret
  const validSecret = await verifySecret(clientId, clientSecret);
  if (!validSecret) {
    return {
      valid: false,
      error: "invalid_client_secret",
      errorDescription: "Invalid client credentials",
    };
  }

  // Validate domain
  if (!validateDomain(client, domain)) {
    return {
      valid: false,
      error: "unauthorized_domain",
      errorDescription: "Domain not authorized for this client",
    };
  }

  return {
    valid: true,
    client,
  };
}
