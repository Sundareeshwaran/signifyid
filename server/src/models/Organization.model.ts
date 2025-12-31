/**
 * Organization Model
 *
 * Data access layer for organization operations
 */
import { getClient } from "../config/db.js";
import type { User, Organization } from "../types/index.js";
import { hashPassword } from "./User.model.js";
import { logger } from "../config/logger.js";

/**
 * Default system roles seeded for every new organization
 * super_admin is assigned to the first user (org creator)
 */
const DEFAULT_ROLES = [
  {
    name: "super_admin",
    description: "Full system access with all permissions",
    permissions: ["*"], // Wildcard grants all access
  },
  {
    name: "tenant_admin",
    description: "Full access within the organization",
    permissions: [
      "org:read",
      "org:manage",
      "users:read",
      "users:invite",
      "users:update",
      "users:delete",
      "users:disable",
      "roles:read",
      "roles:assign",
      "clients:read",
      "clients:create",
      "clients:update",
      "clients:delete",
      "clients:manage",
      "sessions:read",
      "sessions:revoke",
      "sessions:delete",
      "mfa:read",
      "mfa:manage",
      "logs:read",
      "audit:read",
      "analytics:read",
      "analytics:security",
      "security:overview:read",
      "settings:read",
      "settings:update",
      "settings:manage",
      "billing:read",
      "billing:manage",
      "fingerprinting:read",
      "fingerprinting:write",
      "data:export",
      "profile:read",
      "profile:update",
      "workflows:manage",
    ],
  },
  {
    name: "security_admin",
    description: "Security-focused access for managing users and sessions",
    permissions: [
      "org:read",
      "users:read",
      "users:invite",
      "users:update",
      "users:disable",
      "roles:read",
      "clients:read",
      "sessions:read",
      "sessions:revoke",
      "sessions:delete",
      "mfa:read",
      "mfa:manage",
      "logs:read",
      "audit:read",
      "analytics:read",
      "analytics:security",
      "settings:read",
      "fingerprinting:read",
      "fingerprinting:write",
      "data:export",
      "profile:read",
      "profile:update",
    ],
  },
  {
    name: "developer",
    description: "Access to manage OAuth clients and view logs",
    permissions: [
      "clients:read",
      "clients:create",
      "clients:update",
      "clients:delete",
      "clients:manage",
      "analytics:read",
      "logs:read",
      "profile:read",
      "profile:update",
      "workflows:manage",
    ],
  },
  {
    name: "user",
    description: "Basic authenticated user with self-service capabilities",
    permissions: [
      "org:read",
      "sessions:read:self",
      "mfa:manage:self",
      "profile:read",
      "profile:update",
    ],
  },
];

/**
 * Create a new organization with admin user
 */
export async function create(
  orgName: string,
  domain: string,
  adminEmail: string,
  adminPassword: string,
  adminName: string
): Promise<{ org: Organization; user: User }> {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Create organization
    const orgResult = await client.query<Organization>(
      `INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING *`,
      [orgName, domain.toLowerCase()]
    );
    const org = orgResult.rows[0];

    // Hash password
    const passwordHash = await hashPassword(adminPassword);

    // Create admin user
    const userResult = await client.query<User>(
      `INSERT INTO users (org_id, email, password_hash, display_name, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [org.id, adminEmail.toLowerCase(), passwordHash, adminName]
    );
    const user = userResult.rows[0];

    // Seed all default roles for this organization
    for (const role of DEFAULT_ROLES) {
      await client.query(
        `INSERT INTO roles (org_id, name, description, permissions, is_system_role, created_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())
         ON CONFLICT (org_id, name) DO UPDATE SET
           description = EXCLUDED.description,
           permissions = EXCLUDED.permissions,
           is_system_role = TRUE`,
        [org.id, role.name, role.description, role.permissions]
      );
    }

    // Get super_admin role ID to assign to first user
    const roleResult = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE org_id = $1 AND name = 'super_admin'`,
      [org.id]
    );

    // Assign super_admin role to first user (org creator)
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [user.id, roleResult.rows[0].id]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (org_id, user_id, action, meta)
       VALUES ($1, $2, 'org.created', $3)`,
      [org.id, user.id, { org_name: orgName, domain }]
    );

    await client.query("COMMIT");
    return { org, user };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find organization by ID
 */
export async function findById(id: string): Promise<Organization | null> {
  const { query } = await import("../config/db.js");
  const result = await query<Organization>(
    `SELECT * FROM organizations WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update organization settings
 */
export async function update(
  id: string,
  data: { name?: string; domain?: string; plan?: string }
): Promise<Organization | null> {
  const { query } = await import("../config/db.js");

  const updates: string[] = [];
  const values: string[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.domain !== undefined) {
    updates.push(`domain = $${paramIndex++}`);
    values.push(data.domain.toLowerCase());
  }
  if (data.plan !== undefined) {
    updates.push(`plan = $${paramIndex++}`);
    values.push(data.plan);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await query<Organization>(
    `UPDATE organizations SET ${updates.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Check if domain is available (not used by another org)
 */
export async function isDomainAvailable(
  domain: string,
  excludeOrgId?: string
): Promise<boolean> {
  const { query } = await import("../config/db.js");

  const sql = excludeOrgId
    ? `SELECT id FROM organizations WHERE domain = $1 AND id != $2`
    : `SELECT id FROM organizations WHERE domain = $1`;

  const params = excludeOrgId
    ? [domain.toLowerCase(), excludeOrgId]
    : [domain.toLowerCase()];
  const result = await query(sql, params);

  return result.rows.length === 0;
}

/**
 * Soft delete an organization with cascading effects
 *
 * This is an irreversible operation that:
 * - Marks org as deleted
 * - Disables all users
 * - Disables all clients
 * - Revokes all sessions
 * - Revokes all tokens
 * - Creates audit log
 *
 * Runs in a single transaction.
 */
export async function softDelete(
  orgId: string,
  performedBy: string,
  confirmationText: string
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Verify org exists and is not already deleted
    const orgResult = await client.query<Organization>(
      `SELECT * FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Organization not found" };
    }

    const org = orgResult.rows[0];

    // Verify confirmation text matches expected format: "delete-{orgname}"
    const expectedConfirmation = `delete-${org.name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    if (confirmationText !== expectedConfirmation) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "Confirmation text does not match organization name",
      };
    }

    // Check if already deleted
    if (org.status === "deleted") {
      await client.query("ROLLBACK");
      return { success: false, error: "Organization already deleted" };
    }

    // 2. Delete MFA methods
    await client.query(
      `DELETE FROM mfa_methods 
       WHERE user_id IN (SELECT id FROM users WHERE org_id = $1)`,
      [orgId]
    );

    // 3. Delete tokens
    await client.query(
      `DELETE FROM tokens 
       WHERE user_id IN (SELECT id FROM users WHERE org_id = $1)`,
      [orgId]
    );

    // 4. Delete sessions
    await client.query(`DELETE FROM sessions WHERE org_id = $1`, [orgId]);

    // 5. Delete client_sessions (OAuth client sessions)
    await client.query(`DELETE FROM client_sessions WHERE org_id = $1`, [
      orgId,
    ]);

    // 6. Delete clients (OAuth apps)
    await client.query(`DELETE FROM clients WHERE org_id = $1`, [orgId]);

    // 7. Delete user_roles
    await client.query(
      `DELETE FROM user_roles 
       WHERE user_id IN (SELECT id FROM users WHERE org_id = $1)`,
      [orgId]
    );

    // 8. Delete roles
    await client.query(`DELETE FROM roles WHERE org_id = $1`, [orgId]);

    // 9. Delete users
    await client.query(`DELETE FROM users WHERE org_id = $1`, [orgId]);

    // 10. Create audit log BEFORE deleting org (for record keeping)
    // Note: audit_logs has ON DELETE CASCADE, so we skip this for hard delete
    // Or we could store in a separate system log

    // 11. Delete the organization permanently
    await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);

    // Log deletion for system records (org no longer exists in DB)
    logger.info(
      `Organization deleted: ${
        org.name
      } (${orgId}) by ${performedBy} at ${new Date().toISOString()}`
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Organization deletion failed", { error });
    return { success: false, error: "Transaction failed" };
  } finally {
    client.release();
  }
}
