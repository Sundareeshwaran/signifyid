/**
 * User Model
 *
 * Data access layer for user operations
 */
import argon2 from "argon2";
import { query, getClient } from "../config/db.js";
import type { User, UserWithRoles } from "../types/index.js";

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
export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return result.rows[0] || null;
}

/**
 * Find user by ID with roles and permissions
 */
export async function findById(userId: string): Promise<UserWithRoles | null> {
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
 * List all users in an organization
 */
export async function list(orgId: string) {
  const result = await query(
    `SELECT 
      u.id, u.email, u.display_name, u.status, u.created_at, u.last_login_at,
      COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.org_id = $1
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Create a new user
 */
export async function create(
  orgId: string,
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const passwordHash = await hashPassword(password);
  const result = await query<User>(
    `INSERT INTO users (org_id, email, password_hash, display_name, status)
     VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
    [orgId, email.toLowerCase(), passwordHash, displayName]
  );
  return result.rows[0];
}

/**
 * Update user fields
 */
export async function update(
  userId: string,
  orgId: string,
  data: { displayName?: string; status?: string }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(data.displayName);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }

  if (updates.length > 0) {
    values.push(userId, orgId);
    await query(
      `UPDATE users SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
      values
    );
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  return result.rows.length > 0;
}

/**
 * Create an invited user (no password, status = invited)
 */
export async function createInvite(
  orgId: string,
  email: string,
  displayName: string
): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (org_id, email, password_hash, display_name, status)
     VALUES ($1, $2, '', $3, 'invited') RETURNING *`,
    [orgId, email.toLowerCase(), displayName]
  );
  return result.rows[0];
}

/**
 * Activate an invited user (set password, change status to active)
 */
export async function activate(
  userId: string,
  password: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  const result = await query(
    `UPDATE users SET password_hash = $1, status = 'active' 
     WHERE id = $2 AND status = 'invited'`,
    [passwordHash, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Enable a disabled user
 */
export async function enable(userId: string, orgId: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET status = 'active' WHERE id = $1 AND org_id = $2 AND status = 'disabled'`,
    [userId, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Disable user with proper status
 */
export async function disable(userId: string, orgId: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET status = 'disabled' WHERE id = $1 AND org_id = $2`,
    [userId, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Find user by ID with roles, permissions and MFA status
 */
export async function findByIdWithMfa(
  userId: string
): Promise<(UserWithRoles & { mfa_enabled: boolean }) | null> {
  const result = await query<UserWithRoles & { mfa_enabled: boolean }>(
    `SELECT 
      u.id, u.org_id, u.email, u.display_name, u.status, u.last_login_at, u.created_at,
      COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
      COALESCE(array_agg(DISTINCT unnest_perms) FILTER (WHERE unnest_perms IS NOT NULL), '{}') as permissions,
      EXISTS(SELECT 1 FROM mfa_methods m WHERE m.user_id = u.id AND m.verified = TRUE) as mfa_enabled
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
 * List users with filters and pagination
 */
export async function listWithFilters(
  orgId: string,
  options: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  } = {}
): Promise<{ users: any[]; total: number }> {
  const { page = 1, limit = 25, status, role, search } = options;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions: string[] = ["u.org_id = $1"];
  const params: any[] = [orgId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`u.status = $${paramIndex++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(
      `(u.email ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex})`
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Role filter requires a subquery
  let roleJoin = "";
  if (role) {
    roleJoin = `
      AND u.id IN (
        SELECT ur2.user_id FROM user_roles ur2 
        JOIN roles r2 ON ur2.role_id = r2.id 
        WHERE r2.name = $${paramIndex}
      )`;
    params.push(role);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ") + roleJoin;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(DISTINCT u.id) as total 
     FROM users u 
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.total || "0");

  // Get paginated users with roles and MFA status
  const usersResult = await query(
    `SELECT 
      u.id, u.email, u.display_name, u.status, u.created_at, u.last_login_at,
      COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
      EXISTS(SELECT 1 FROM mfa_methods m WHERE m.user_id = u.id AND m.verified = TRUE) as mfa_enabled
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE ${whereClause}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return { users: usersResult.rows, total };
}

/**
 * Update user password
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    passwordHash,
    userId,
  ]);
}

/**
 * Get user with password hash for verification
 */
export async function findByIdWithPassword(
  userId: string
): Promise<User | null> {
  const result = await query<User>(`SELECT * FROM users WHERE id = $1`, [
    userId,
  ]);
  return result.rows[0] || null;
}

/**
 * Check if user is the last super_admin in the organization
 * Used to prevent accidentally disabling/deleting the only super_admin
 */
export async function isLastSuperAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(DISTINCT u.id) as count
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE u.org_id = $1 
       AND r.name = 'super_admin'
       AND u.status != 'disabled'`,
    [orgId]
  );

  const totalSuperAdmins = parseInt(result.rows[0]?.count || "0");

  // Check if the target user is a super_admin
  const userRolesResult = await query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r.name = 'super_admin'`,
    [userId]
  );

  const isSuperAdmin = userRolesResult.rows.length > 0;

  // User is the last super_admin if they are a super_admin and there's only 1 total
  return isSuperAdmin && totalSuperAdmins === 1;
}
