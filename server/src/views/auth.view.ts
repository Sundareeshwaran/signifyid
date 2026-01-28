/**
 * Auth View
 * 
 * Response formatters for authentication-related endpoints
 */

interface UserData {
  id: string;
  email: string;
  display_name: string | null;
}

interface OrgData {
  id: string;
  name: string;
  domain: string | null;
}

interface UserWithRolesData {
  id: string;
  email: string;
  display_name: string | null;
  org_id: string;
  roles: string[];
  permissions: string[];
  status: string;
}

/**
 * Format registration success response
 */
export function formatRegistration(user: UserData, org: OrgData, roles: string[]) {
  return {
    message: 'Organization created successfully',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles,
    },
    organization: {
      id: org.id,
      name: org.name,
      domain: org.domain,
    },
  };
}

/**
 * Format login success response
 */
export function formatLogin(user: UserData, roles: string[], mfaRequired: boolean = false) {
  return {
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles,
    },
    mfaRequired,
  };
}

/**
 * Format current user (me) response
 */
export function formatMe(user: UserWithRolesData) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    orgId: user.org_id,
    roles: user.roles,
    permissions: user.permissions,
    status: user.status,
  };
}
