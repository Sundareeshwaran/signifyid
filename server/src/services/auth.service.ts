/**
 * Authentication Service
 *
 * Handles user registration, login, and password verification
 */
import argon2 from "argon2";
import { query, getClient } from "../config/db.js";
import type { User, UserWithRoles, Organization } from "../types/index.js";

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return result.rows[0] || null;
}

/**
 * Find user by ID with roles
 */
export async function findUserById(
  userId: string
): Promise<UserWithRoles | null> {
  const result = await query<UserWithRoles>(
    `SELECT 
      u.id, u.org_id, u.email, u.display_name, u.status, u.last_login_at, u.created_at,
      COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
      COALESCE(array_agg(DISTINCT unnest_perms) FILTER (WHERE unnest_perms IS NOT NULL), '{}') as permissions
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     LEFT JOIN LATERAL unnest(r.permissions) AS unnest_perms ON TRUE
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const result = await query(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => row.name);
}

/**
 * Create a new organization with admin user
 */
export async function createOrganization(
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

    // Create tenant_admin role if not exists
    const roleResult = await client.query(
      `INSERT INTO roles (org_id, name, permissions, is_system_role, description)
       VALUES ($1, 'tenant_admin', $2, TRUE, 'Full administrative access')
       ON CONFLICT (org_id, name) DO UPDATE SET name = roles.name
       RETURNING id`,
      [
        org.id,
        [
          "users:read",
          "users:create",
          "users:update",
          "users:delete",
          "clients:read",
          "clients:create",
          "clients:update",
          "clients:delete",
          "roles:read",
          "roles:manage",
          "logs:read",
          "billing:read",
          "billing:manage",
          "org:read",
          "org:manage",
        ],
      ]
    );

    // Create default 'user' role for regular users
    await client.query(
      `INSERT INTO roles (org_id, name, permissions, is_system_role, description)
       VALUES ($1, 'user', $2, TRUE, 'Basic user access')
       ON CONFLICT (org_id, name) DO NOTHING`,
      [org.id, ["users:read"]]
    );

    // Assign role to user
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
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  orgId: string,
  userId: string | null,
  action: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (org_id, user_id, action, meta) VALUES ($1, $2, $3, $4)`,
    [orgId, userId, action, meta || null]
  );
}
