/**
 * Seed Default Roles
 *
 * Seeds the 5 default system roles for an organization.
 * Run after organization creation or to reset role permissions.
 *
 * Usage: npx tsx src/seed-default-roles.ts [org_id]
 */
import { pool, query } from "./config/db.js";

// Default system roles with their permissions
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
 * Seed default roles for a specific organization
 */
export async function seedRolesForOrg(orgId: string): Promise<void> {
  console.log(`📦 Seeding default roles for organization: ${orgId}`);

  for (const role of DEFAULT_ROLES) {
    try {
      await query(
        `INSERT INTO roles (org_id, name, description, permissions, is_system_role, created_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())
         ON CONFLICT (org_id, name) DO UPDATE SET
           description = EXCLUDED.description,
           permissions = EXCLUDED.permissions,
           is_system_role = TRUE`,
        [orgId, role.name, role.description, role.permissions]
      );
      console.log(`   ✅ ${role.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to seed ${role.name}:`, error);
    }
  }
}

/**
 * Seed default roles for ALL organizations
 */
async function seedAllOrganizations(): Promise<void> {
  console.log("🚀 Seeding default roles for all organizations...\n");

  try {
    const result = await query("SELECT id, name FROM organizations");

    if (result.rows.length === 0) {
      console.log("No organizations found.");
      return;
    }

    for (const org of result.rows) {
      await seedRolesForOrg(org.id);
      console.log(`   Organization: ${org.name}\n`);
    }

    console.log("✅ All organizations seeded!");
  } catch (error) {
    console.error("❌ Failed to seed roles:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI execution
const orgIdArg = process.argv[2];

if (orgIdArg) {
  // Seed specific organization
  seedRolesForOrg(orgIdArg)
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  // Seed all organizations
  seedAllOrganizations();
}
