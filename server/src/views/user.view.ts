/**
 * User View
 *
 * Response formatters for user-related endpoints
 */

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  roles?: string[];
  mfa_enabled?: boolean | string;
  created_at: Date;
  last_login_at: Date | null;
  org_id?: string;
  permissions?: string[];
}

/**
 * Convert PostgreSQL boolean (which may be string 't'/'f' or true/false) to JS boolean
 */
function toBoolean(value: boolean | string | undefined | null): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "t" || value === "true" || value === "1";
  }
  return false;
}

/**
 * Format a single user for API response
 */
export function formatUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    roles: row.roles || [],
    mfaEnabled: toBoolean(row.mfa_enabled),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/**
 * Format user with full details (for detail view)
 */
export function formatUserDetail(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    roles: row.roles || [],
    permissions: row.permissions || [],
    mfaEnabled: toBoolean(row.mfa_enabled),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/**
 * Format user list response
 */
export function formatUserList(rows: UserRow[]) {
  return {
    users: rows.map(formatUser),
  };
}

/**
 * Format paginated user list response
 */
export function formatUserListPaginated(
  rows: UserRow[],
  total: number,
  page: number,
  limit: number
) {
  return {
    users: rows.map(formatUser),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Format created user response
 */
export function formatCreatedUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Format user profile for self-view
 */
export function formatProfile(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roles: row.roles || [],
    permissions: row.permissions || [],
    mfaEnabled: toBoolean(row.mfa_enabled),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}
