/**
 * Role Model
 *
 * Data access layer for role operations including
 * CRUD, user assignment, and permission resolution.
 */
import { query } from "../config/db.js";

// Role type from database
export interface Role {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system_role: boolean;
  created_by: string | null;
  created_at: Date;
}

/**
 * List all roles for an organization
 */
export async function list(orgId: string): Promise<Role[]> {
  const result = await query<Role>(
    `SELECT id, org_id, name, description, permissions, is_system_role, created_by, created_at
     FROM roles
     WHERE org_id = $1
     ORDER BY is_system_role DESC, name ASC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Find role by ID within an organization
 */
export async function findById(
  id: string,
  orgId: string
): Promise<Role | null> {
  const result = await query<Role>(
    `SELECT id, org_id, name, description, permissions, is_system_role, created_by, created_at
     FROM roles
     WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  return result.rows[0] || null;
}

/**
 * Find role by name in organization
 */
export async function findByName(
  orgId: string,
  name: string
): Promise<Role | null> {
  const result = await query<Role>(
    `SELECT id, org_id, name, description, permissions, is_system_role, created_by, created_at
     FROM roles
     WHERE org_id = $1 AND name = $2`,
    [orgId, name]
  );
  return result.rows[0] || null;
}

/**
 * Create a new role
 */
export async function create(
  orgId: string,
  name: string,
  permissions: string[],
  description?: string,
  createdBy?: string
): Promise<Role> {
  const result = await query<Role>(
    `INSERT INTO roles (org_id, name, description, permissions, is_system_role, created_by)
     VALUES ($1, $2, $3, $4, FALSE, $5)
     RETURNING *`,
    [orgId, name, description || null, permissions, createdBy || null]
  );
  return result.rows[0];
}

/**
 * Update role permissions and description
 */
export async function update(
  id: string,
  orgId: string,
  data: { permissions?: string[]; description?: string }
): Promise<void> {
  const updates: string[] = [];
  const values: (string | string[])[] = [];
  let paramIndex = 1;

  if (data.permissions !== undefined) {
    updates.push(`permissions = $${paramIndex++}`);
    values.push(data.permissions);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (updates.length > 0) {
    values.push(id, orgId);
    await query(
      `UPDATE roles SET ${updates.join(", ")} 
       WHERE id = $${paramIndex} AND org_id = $${
        paramIndex + 1
      } AND is_system_role = FALSE`,
      values
    );
  }
}

/**
 * Delete a non-system role
 */
export async function remove(id: string, orgId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM roles WHERE id = $1 AND org_id = $2 AND is_system_role = FALSE`,
    [id, orgId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get all roles for a user
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
 * Get full role objects for a user
 */
export async function getUserRolesFull(userId: string): Promise<Role[]> {
  const result = await query<Role>(
    `SELECT r.id, r.org_id, r.name, r.description, r.permissions, r.is_system_role, r.created_by, r.created_at
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return result.rows;
}

/**
 * Get aggregated permissions for a user across all roles
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT unnest(r.permissions) as permission
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => row.permission);
}

/**
 * Assign role to user
 */
export async function assignToUser(
  userId: string,
  roleId: string
): Promise<void> {
  await query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId]
  );
}

/**
 * Remove role from user
 */
export async function removeFromUser(
  userId: string,
  roleId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
    [userId, roleId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Remove all roles from user
 */
export async function removeAllFromUser(userId: string): Promise<void> {
  await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

/**
 * Get users with a specific role
 */
export async function getRoleUsers(
  roleId: string
): Promise<{ id: string; email: string; display_name: string }[]> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
  }>(
    `SELECT u.id, u.email, u.display_name
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     WHERE ur.role_id = $1`,
    [roleId]
  );
  return result.rows;
}

/**
 * Check if user has a specific role
 */
export async function userHasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r.name = $2
     LIMIT 1`,
    [userId, roleName]
  );
  return result.rows.length > 0;
}

/**
 * Validate roles belong to organization
 */
export async function validateRolesForOrg(
  orgId: string,
  roleNames: string[]
): Promise<{ valid: boolean; invalidRoles: string[] }> {
  if (roleNames.length === 0) {
    return { valid: true, invalidRoles: [] };
  }
  const result = await query<{ name: string }>(
    `SELECT name FROM roles WHERE org_id = $1 AND name = ANY($2)`,
    [orgId, roleNames]
  );
  const foundNames = result.rows.map((r) => r.name);
  const invalidRoles = roleNames.filter((r) => !foundNames.includes(r));
  return { valid: invalidRoles.length === 0, invalidRoles };
}

/**
 * Assign multiple roles to user, replacing existing roles
 */
export async function replaceUserRoles(
  userId: string,
  orgId: string,
  roleNames: string[]
): Promise<void> {
  // Remove all existing roles
  await removeAllFromUser(userId);

  // Assign new roles
  for (const roleName of roleNames) {
    const roleRecord = await findByName(orgId, roleName);
    if (roleRecord) {
      await assignToUser(userId, roleRecord.id);
    }
  }
}

/**
 * Validate role IDs belong to organization
 */
export async function validateRoleIdsForOrg(
  orgId: string,
  roleIds: string[]
): Promise<{ valid: boolean; invalidRoleIds: string[]; roles: Role[] }> {
  if (roleIds.length === 0) {
    return { valid: true, invalidRoleIds: [], roles: [] };
  }

  const result = await query<Role>(
    `SELECT id, org_id, name, description, permissions, is_system_role, created_by, created_at
     FROM roles 
     WHERE org_id = $1 AND id = ANY($2)`,
    [orgId, roleIds]
  );

  const foundIds = result.rows.map((r) => r.id);
  const invalidRoleIds = roleIds.filter((id) => !foundIds.includes(id));

  return {
    valid: invalidRoleIds.length === 0,
    invalidRoleIds,
    roles: result.rows,
  };
}

/**
 * Get user's role IDs
 */
export async function getUserRoleIds(userId: string): Promise<string[]> {
  const result = await query<{ role_id: string }>(
    `SELECT role_id FROM user_roles WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => row.role_id);
}

/**
 * Assign multiple roles to user by IDs, replacing existing roles
 */
export async function replaceUserRolesByIds(
  userId: string,
  orgId: string,
  roleIds: string[]
): Promise<void> {
  // Validate all role IDs belong to the organization
  const validation = await validateRoleIdsForOrg(orgId, roleIds);
  if (!validation.valid) {
    throw new Error(
      `Invalid role IDs: ${validation.invalidRoleIds.join(", ")}`
    );
  }

  // Remove all existing roles
  await removeAllFromUser(userId);

  // Assign new roles
  for (const roleId of roleIds) {
    await assignToUser(userId, roleId);
  }
}
