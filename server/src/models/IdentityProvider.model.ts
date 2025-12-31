/**
 * Identity Provider Model
 *
 * Handles SSO identity provider configuration for enterprise organizations
 */
import { query } from "../config/db.js";

export interface IdentityProvider {
  id: string;
  org_id: string;
  type: "google" | "oidc" | "saml";
  name: string;
  domain: string;
  client_id: string | null;
  client_secret_encrypted: string | null;
  issuer_url: string | null;
  authorization_endpoint: string | null;
  token_endpoint: string | null;
  userinfo_endpoint: string | null;
  jwks_uri: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find an identity provider by domain
 * Used during SSO login to resolve which IdP to redirect to
 */
export async function findByDomain(
  domain: string
): Promise<IdentityProvider | null> {
  const result = await query<IdentityProvider>(
    `SELECT * FROM identity_providers 
     WHERE domain = $1 AND is_active = true`,
    [domain.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Find all identity providers for an organization
 */
export async function findByOrgId(orgId: string): Promise<IdentityProvider[]> {
  const result = await query<IdentityProvider>(
    `SELECT * FROM identity_providers 
     WHERE org_id = $1 
     ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Find identity provider by ID
 */
export async function findById(id: string): Promise<IdentityProvider | null> {
  const result = await query<IdentityProvider>(
    `SELECT * FROM identity_providers WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new identity provider
 */
export async function create(data: {
  orgId: string;
  type: "google" | "oidc" | "saml";
  name: string;
  domain: string;
  clientId?: string;
  clientSecretEncrypted?: string;
  issuerUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  metadata?: Record<string, unknown>;
}): Promise<IdentityProvider> {
  const result = await query<IdentityProvider>(
    `INSERT INTO identity_providers (
      org_id, type, name, domain, client_id, client_secret_encrypted,
      issuer_url, authorization_endpoint, token_endpoint,
      userinfo_endpoint, jwks_uri, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.orgId,
      data.type,
      data.name,
      data.domain.toLowerCase(),
      data.clientId || null,
      data.clientSecretEncrypted || null,
      data.issuerUrl || null,
      data.authorizationEndpoint || null,
      data.tokenEndpoint || null,
      data.userinfoEndpoint || null,
      data.jwksUri || null,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

/**
 * Update an identity provider
 */
export async function update(
  id: string,
  data: Partial<{
    name: string;
    clientId: string;
    clientSecretEncrypted: string;
    issuerUrl: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    jwksUri: string;
    metadata: Record<string, unknown>;
    isActive: boolean;
  }>
): Promise<IdentityProvider | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.clientId !== undefined) {
    updates.push(`client_id = $${paramCount++}`);
    values.push(data.clientId);
  }
  if (data.clientSecretEncrypted !== undefined) {
    updates.push(`client_secret_encrypted = $${paramCount++}`);
    values.push(data.clientSecretEncrypted);
  }
  if (data.issuerUrl !== undefined) {
    updates.push(`issuer_url = $${paramCount++}`);
    values.push(data.issuerUrl);
  }
  if (data.authorizationEndpoint !== undefined) {
    updates.push(`authorization_endpoint = $${paramCount++}`);
    values.push(data.authorizationEndpoint);
  }
  if (data.tokenEndpoint !== undefined) {
    updates.push(`token_endpoint = $${paramCount++}`);
    values.push(data.tokenEndpoint);
  }
  if (data.userinfoEndpoint !== undefined) {
    updates.push(`userinfo_endpoint = $${paramCount++}`);
    values.push(data.userinfoEndpoint);
  }
  if (data.jwksUri !== undefined) {
    updates.push(`jwks_uri = $${paramCount++}`);
    values.push(data.jwksUri);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(data.metadata));
  }
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(data.isActive);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<IdentityProvider>(
    `UPDATE identity_providers SET ${updates.join(", ")} 
     WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete an identity provider
 */
export async function remove(id: string, orgId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM identity_providers WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}
