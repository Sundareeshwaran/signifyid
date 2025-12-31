/**
 * User Controller
 *
 * Handles user management business logic
 */
import type { Request, Response } from "express";
import { getClient } from "../config/db.js";
import { ROLES, type RoleName } from "../config/rbac.constants.js";
import * as UserModel from "../models/User.model.js";
import * as RoleModel from "../models/Role.model.js";
import * as TokenModel from "../models/Token.model.js";
import * as MfaModel from "../models/Mfa.model.js";
import * as SessionModel from "../models/Session.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import * as InviteTokenModel from "../models/InviteToken.model.js";
import * as userView from "../views/user.view.js";
import * as PlanLimitsService from "../services/planLimits.service.js";
import * as MailService from "../mail/mail.service.js";
import { config } from "../config/env.js";
import * as OrganizationModel from "../models/Organization.model.js";

/**
 * List users in organization with pagination and filters
 */
export async function list(req: Request, res: Response) {
  try {
    const { page = "1", limit = "25", status, role, search } = req.query;

    const result = await UserModel.listWithFilters(req.user!.org_id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
      role: role as string,
      search: search as string,
    });

    res.json(
      userView.formatUserListPaginated(
        result.users,
        result.total,
        parseInt(page as string),
        parseInt(limit as string)
      )
    );
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
}

/**
 * Get user by ID with full details
 */
export async function getById(req: Request, res: Response) {
  try {
    const user = await UserModel.findByIdWithMfa(req.params.id);

    if (!user || user.org_id !== req.user!.org_id) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get active sessions count
    const activeSessionsCount = await SessionModel.getActiveCountForUser(
      user.id
    );

    // Format response with sessions count
    const userDetails = {
      ...userView.formatUserDetail(user),
      activeSessionsCount,
    };

    res.json(userDetails);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
}

/**
 * Create a new user (direct creation with password - super_admin only)
 */
export async function create(req: Request, res: Response) {
  const client = await getClient();

  try {
    const { email, password, displayName, role_ids } = req.body;
    const orgId = req.user!.org_id;

    // Check plan limit before creating
    const limitCheck = await PlanLimitsService.canCreateUser(orgId);
    if (!limitCheck.allowed) {
      res.status(403).json({
        error: "Plan limit exceeded",
        message: limitCheck.message,
        usage: { current: limitCheck.current, max: limitCheck.max },
      });
      return;
    }

    await client.query("BEGIN");

    // Check if email exists
    if (await UserModel.emailExists(email)) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    // Create user with active status
    const user = await UserModel.create(orgId, email, password, displayName);

    // Assign roles if provided, otherwise assign default 'user' role
    let roleIdsToAssign = role_ids;
    if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
      // Find default 'user' role ID
      const defaultRole = await RoleModel.findByName(orgId, "user");
      if (defaultRole) {
        roleIdsToAssign = [defaultRole.id];
      }
    }

    // Assign roles using IDs
    if (roleIdsToAssign && roleIdsToAssign.length > 0) {
      for (const roleId of roleIdsToAssign) {
        await RoleModel.assignToUser(user.id, roleId);
      }
    }

    // Get role names for audit log
    const assignedRoles = await RoleModel.getUserRoles(user.id);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "user.created", {
      created_user_id: user.id,
      email,
      role_ids: roleIdsToAssign,
      roles: assignedRoles,
    });

    await client.query("COMMIT");

    // Send user created email (non-blocking)
    (async () => {
      try {
        const org = await OrganizationModel.findById(orgId);
        const creatorUser = await UserModel.findById(req.user!.sub);
        await MailService.sendUserCreated(
          {
            recipientName: displayName || email.split("@")[0],
            recipientEmail: email,
            organizationName: org?.name || "Your Organization",
            loginLink: `${config.frontendUrl}/login`,
            roleName: assignedRoles.length > 0 ? assignedRoles[0] : "User",
            createdByName: creatorUser?.display_name || undefined,
          },
          orgId,
          req.user!.sub
        );
      } catch (emailError) {
        console.error("Failed to send user created email:", emailError);
      }
    })();

    res.status(201).json({
      message: "User created successfully",
      user: userView.formatCreatedUser(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  } finally {
    client.release();
  }
}

/**
 * Invite a new user (creates with invited status, no password)
 * Generates a secure invite token for email-based activation
 */
export async function invite(req: Request, res: Response) {
  const client = await getClient();

  try {
    const { email, displayName, role_ids } = req.body;
    const orgId = req.user!.org_id;

    // Check plan limit before inviting
    const limitCheck = await PlanLimitsService.canCreateUser(orgId);
    if (!limitCheck.allowed) {
      res.status(403).json({
        error: "Plan limit exceeded",
        message: limitCheck.message,
        usage: { current: limitCheck.current, max: limitCheck.max },
      });
      return;
    }

    await client.query("BEGIN");

    // Check if email exists
    if (await UserModel.emailExists(email)) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    // Create invited user
    const user = await UserModel.createInvite(orgId, email, displayName);

    // Assign roles if provided, otherwise assign default 'user' role
    let roleIdsToAssign = role_ids;
    if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
      // Find default 'user' role ID
      const defaultRole = await RoleModel.findByName(orgId, "user");
      if (defaultRole) {
        roleIdsToAssign = [defaultRole.id];
      }
    }

    // Assign roles using IDs
    if (roleIdsToAssign && roleIdsToAssign.length > 0) {
      for (const roleId of roleIdsToAssign) {
        await RoleModel.assignToUser(user.id, roleId);
      }
    }

    // Get role names for audit log
    const assignedRoles = await RoleModel.getUserRoles(user.id);

    // Generate secure invite token
    const inviteToken = await InviteTokenModel.create(user.id);

    // Build invite URL (frontend will handle this)
    const inviteUrl = `/invite/accept?token=${inviteToken.token}`;

    // TODO: Send invite email
    console.log(`[EMAIL] Invite email would be sent to ${email}`);
    console.log(`[EMAIL] Invite URL: ${inviteUrl}`);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "user.invited", {
      invited_user_id: user.id,
      email,
      role_ids: roleIdsToAssign,
      roles: assignedRoles,
    });

    await client.query("COMMIT");

    // Send invite email (non-blocking)
    (async () => {
      try {
        const org = await OrganizationModel.findById(orgId);
        const inviterUser = await UserModel.findById(req.user!.sub);
        const fullInviteUrl = `${config.frontendUrl}${inviteUrl}`;
        await MailService.sendUserInvite(
          {
            recipientName: displayName || email.split("@")[0],
            recipientEmail: email,
            organizationName: org?.name || "Your Organization",
            inviteLink: fullInviteUrl,
            roleName: assignedRoles.length > 0 ? assignedRoles[0] : "User",
            expiresInDays: 7,
            invitedByName: inviterUser?.display_name || undefined,
          },
          orgId,
          req.user!.sub
        );
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
      }
    })();

    res.status(201).json({
      message: "User invited successfully. Invitation email has been sent.",
      user: userView.formatCreatedUser(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Invite user error:", error);
    res.status(500).json({ error: "Failed to invite user" });
  } finally {
    client.release();
  }
}

/**
 * Accept an invite (public endpoint - validates token and sets password)
 */
export async function acceptInvite(req: Request, res: Response) {
  const client = await getClient();

  try {
    const { token, password } = req.body;

    // Find valid token
    const inviteToken = await InviteTokenModel.findValidToken(token);

    if (!inviteToken) {
      res.status(410).json({ error: "Invalid or expired invite token" });
      return;
    }

    // Check user status
    if (inviteToken.status !== "invited") {
      res.status(409).json({ error: "User has already been activated" });
      return;
    }

    await client.query("BEGIN");

    // Activate user with password
    const success = await UserModel.activate(inviteToken.user_id, password);

    if (!success) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Failed to activate user" });
      return;
    }

    // Mark token as used
    await InviteTokenModel.markUsed(inviteToken.id);

    // Audit log
    await AuditLogModel.create(
      inviteToken.org_id,
      inviteToken.user_id,
      "user.invite_accepted",
      {
        email: inviteToken.email,
      }
    );

    await client.query("COMMIT");

    res.json({
      message: "Account activated successfully",
      email: inviteToken.email,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Accept invite error:", error);
    res.status(500).json({ error: "Failed to accept invite" });
  } finally {
    client.release();
  }
}

/**
 * Validate an invite token (public endpoint - check if token is valid)
 */
export async function validateInviteToken(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const inviteToken = await InviteTokenModel.findValidToken(token);

    if (!inviteToken) {
      res.status(410).json({ error: "Invalid or expired invite token" });
      return;
    }

    if (inviteToken.status !== "invited") {
      res.status(409).json({ error: "User has already been activated" });
      return;
    }

    res.json({
      valid: true,
      email: inviteToken.email,
      displayName: inviteToken.display_name,
      expiresAt: inviteToken.expires_at,
    });
  } catch (error) {
    console.error("Validate invite token error:", error);
    res.status(500).json({ error: "Failed to validate token" });
  }
}

/**
 * Activate an invited user (public endpoint - sets password)
 */
export async function activate(req: Request, res: Response) {
  try {
    const { userId, password } = req.body;

    const success = await UserModel.activate(userId, password);

    if (!success) {
      res
        .status(400)
        .json({ error: "Invalid activation request or user already active" });
      return;
    }

    res.json({ message: "Account activated successfully" });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({ error: "Failed to activate user" });
  }
}

/**
 * Update user
 */
export async function update(req: Request, res: Response) {
  try {
    const { displayName, status, role_ids } = req.body;
    const userId = req.params.id;
    const orgId = req.user!.org_id;
    const assignerRoles = req.user!.roles || [];

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // SECURITY: Prevent self-modification of roles
    if (userId === req.user!.sub && role_ids !== undefined) {
      res.status(403).json({ error: "Cannot modify your own roles" });
      return;
    }

    // Update user fields
    await UserModel.update(userId, orgId, { displayName, status });

    // Update roles if provided (using role IDs)
    if (role_ids !== undefined && Array.isArray(role_ids)) {
      // Validate role IDs exist and belong to this organization
      const validation = await RoleModel.validateRoleIdsForOrg(orgId, role_ids);
      if (!validation.valid) {
        res.status(422).json({
          error: "Invalid role IDs",
          details: `The following role IDs do not exist or do not belong to your organization: ${validation.invalidRoleIds.join(
            ", "
          )}`,
          invalidRoleIds: validation.invalidRoleIds,
        });
        return;
      }

      // Get role details to check names for RBAC enforcement
      const roleRecords = validation.roles;
      const roleNames = roleRecords.map((r) => r.name);

      // SECURITY: Privilege escalation prevention
      const isSuperAdmin = assignerRoles.includes(ROLES.SUPER_ADMIN);
      const isTenantAdmin = assignerRoles.includes(ROLES.TENANT_ADMIN);

      const tenantAdminAssignableRoles: RoleName[] = [
        ROLES.TENANT_ADMIN,
        ROLES.SECURITY_ADMIN,
        ROLES.DEVELOPER,
        ROLES.USER,
      ];

      // Check each role being assigned
      for (const roleName of roleNames) {
        // Only super_admin can assign super_admin
        if (roleName === ROLES.SUPER_ADMIN && !isSuperAdmin) {
          res.status(403).json({
            error: "Insufficient privileges",
            details: "Only super_admin can assign the super_admin role",
          });
          return;
        }

        // Tenant admin can only assign specific roles
        if (isTenantAdmin && !isSuperAdmin) {
          if (!tenantAdminAssignableRoles.includes(roleName as RoleName)) {
            res.status(403).json({
              error: "Insufficient privileges",
              details: `Tenant admin cannot assign the ${roleName} role`,
            });
            return;
          }
        }
      }

      // Get old roles for audit
      const oldRoleIds = await RoleModel.getUserRoleIds(userId);
      const oldRoleNames = await RoleModel.getUserRoles(userId);

      // SECURITY: Prevent removing super_admin role unless assigner is super_admin
      if (
        oldRoleNames.includes(ROLES.SUPER_ADMIN) &&
        !roleNames.includes(ROLES.SUPER_ADMIN) &&
        !isSuperAdmin
      ) {
        res.status(403).json({
          error: "Insufficient privileges",
          details: "Only super_admin can remove the super_admin role",
        });
        return;
      }

      // Replace existing roles using IDs
      await RoleModel.replaceUserRolesByIds(userId, orgId, role_ids);

      // Audit log with role changes
      await AuditLogModel.create(orgId, req.user!.sub, "user.updated", {
        updated_user_id: userId,
        changes: req.body,
        old_role_ids: oldRoleIds,
        new_role_ids: role_ids,
        old_roles: oldRoleNames,
        new_roles: roleNames,
      });
    } else {
      // Audit log without role changes
      await AuditLogModel.create(orgId, req.user!.sub, "user.updated", {
        updated_user_id: userId,
        changes: req.body,
      });
    }

    res.json({ message: "User updated" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
}

/**
 * Disable user (revokes all sessions)
 */
export async function disable(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const orgId = req.user!.org_id;

    // Don't allow self-disable
    if (userId === req.user!.sub) {
      res.status(400).json({ error: "Cannot disable your own account" });
      return;
    }

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Disable user
    await UserModel.disable(userId, orgId);

    // Revoke all sessions
    await TokenModel.revokeAll(userId);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "user.disabled", {
      disabled_user_id: userId,
    });

    res.json({ message: "User disabled and sessions revoked" });
  } catch (error) {
    console.error("Disable user error:", error);
    res.status(500).json({ error: "Failed to disable user" });
  }
}

/**
 * Enable a disabled user
 */
export async function enable(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const orgId = req.user!.org_id;

    const success = await UserModel.enable(userId, orgId);

    if (!success) {
      res.status(400).json({ error: "User not found or not disabled" });
      return;
    }

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "user.enabled", {
      enabled_user_id: userId,
    });

    res.json({ message: "User enabled" });
  } catch (error) {
    console.error("Enable user error:", error);
    res.status(500).json({ error: "Failed to enable user" });
  }
}

/**
 * Get own profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    const user = await UserModel.findByIdWithMfa(req.user!.sub);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(userView.formatProfile(user));
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
}

/**
 * Update own profile
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const { displayName, currentPassword, newPassword } = req.body;
    const userId = req.user!.sub;

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: "Current password required" });
        return;
      }

      const user = await UserModel.findByIdWithPassword(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const validPassword = await UserModel.verifyPassword(
        user.password_hash,
        currentPassword
      );
      if (!validPassword) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      await UserModel.updatePassword(userId, newPassword);
    }

    // Update display name if provided
    if (displayName) {
      await UserModel.update(userId, req.user!.org_id, { displayName });
    }

    res.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

/**
 * Reset user's MFA (admin action)
 */
export async function resetMfa(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const orgId = req.user!.org_id;

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Remove all MFA methods
    await MfaModel.removeAll(userId);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "mfa.reset_by_admin", {
      target_user_id: userId,
    });

    res.json({ message: "User MFA reset successfully" });
  } catch (error) {
    console.error("Reset MFA error:", error);
    res.status(500).json({ error: "Failed to reset MFA" });
  }
}

/**
 * Assign/Update user roles (dedicated endpoint)
 * PUT /api/users/:id/roles
 */
export async function assignRoles(req: Request, res: Response) {
  const client = await getClient();

  try {
    const { role_ids } = req.body;
    const userId = req.params.id;
    const orgId = req.user!.org_id;
    const assignerRoles = req.user!.roles || [];

    await client.query("BEGIN");

    // SECURITY: Prevent self-assignment of roles
    if (userId === req.user!.sub) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "Cannot modify your own roles" });
      return;
    }

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Validate role IDs exist and belong to this organization
    const validation = await RoleModel.validateRoleIdsForOrg(orgId, role_ids);
    if (!validation.valid) {
      await client.query("ROLLBACK");
      res.status(422).json({
        error: "Invalid role IDs",
        details: `The following role IDs do not exist or do not belong to your organization: ${validation.invalidRoleIds.join(
          ", "
        )}`,
        invalidRoleIds: validation.invalidRoleIds,
      });
      return;
    }

    // Get role details to check names for RBAC enforcement
    const roleRecords = validation.roles;
    const roleNames = roleRecords.map((r) => r.name);

    // SECURITY: Privilege escalation prevention
    // Determine which roles the assigner can assign
    const isSuperAdmin = assignerRoles.includes(ROLES.SUPER_ADMIN);
    const isTenantAdmin = assignerRoles.includes(ROLES.TENANT_ADMIN);

    // Roles that tenant_admin can assign
    const tenantAdminAssignableRoles: RoleName[] = [
      ROLES.TENANT_ADMIN,
      ROLES.SECURITY_ADMIN,
      ROLES.DEVELOPER,
      ROLES.USER,
    ];

    // Check each role being assigned
    for (const roleName of roleNames) {
      // Only super_admin can assign super_admin
      if (roleName === ROLES.SUPER_ADMIN && !isSuperAdmin) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Insufficient privileges",
          details: "Only super_admin can assign the super_admin role",
        });
        return;
      }

      // Tenant admin can only assign specific roles
      if (isTenantAdmin && !isSuperAdmin) {
        if (
          !tenantAdminAssignableRoles.includes(
            roleName as (typeof ROLES)[keyof typeof ROLES]
          )
        ) {
          await client.query("ROLLBACK");
          res.status(403).json({
            error: "Insufficient privileges",
            details: `Tenant admin cannot assign the ${roleName} role`,
          });
          return;
        }
      }
    }

    // Get old roles for audit
    const oldRoleIds = await RoleModel.getUserRoleIds(userId);
    const oldRoleNames = await RoleModel.getUserRoles(userId);

    // SECURITY: Prevent removing super_admin role unless assigner is super_admin
    if (
      oldRoleNames.includes(ROLES.SUPER_ADMIN) &&
      !roleNames.includes(ROLES.SUPER_ADMIN) &&
      !isSuperAdmin
    ) {
      await client.query("ROLLBACK");
      res.status(403).json({
        error: "Insufficient privileges",
        details: "Only super_admin can remove the super_admin role",
      });
      return;
    }

    // Replace existing roles using IDs
    await RoleModel.replaceUserRolesByIds(userId, orgId, role_ids);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "user.roles_updated", {
      target_user_id: userId,
      old_role_ids: oldRoleIds,
      new_role_ids: role_ids,
      old_roles: oldRoleNames,
      new_roles: roleNames,
    });

    await client.query("COMMIT");
    res.json({
      message: "Roles updated successfully",
      role_ids,
      roles: roleNames,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Assign roles error:", error);
    res.status(500).json({ error: "Failed to assign roles" });
  } finally {
    client.release();
  }
}

/**
 * Disable user (explicit endpoint)
 * POST /api/users/:id/disable
 */
export async function disableExplicit(req: Request, res: Response) {
  const client = await getClient();

  try {
    const userId = req.params.id;
    const orgId = req.user!.org_id;

    // Don't allow self-disable
    if (userId === req.user!.sub) {
      res.status(400).json({ error: "Cannot disable your own account" });
      return;
    }

    await client.query("BEGIN");

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Already disabled check
    if (user.status === "disabled") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "User is already disabled" });
      return;
    }

    // SECURITY: Prevent disabling the last super_admin
    const isLastAdmin = await UserModel.isLastSuperAdmin(userId, orgId);
    if (isLastAdmin) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Cannot disable user",
        details: "Cannot disable the last super_admin in the organization",
      });
      return;
    }

    // Get active sessions count before revoking
    const activeSessionsCount = await SessionModel.getActiveCountForUser(
      userId
    );

    // Disable user
    await UserModel.disable(userId, orgId);

    // Revoke all sessions (blocks future logins)
    await TokenModel.revokeAll(userId);

    // Enhanced audit log with session count
    await AuditLogModel.create(orgId, req.user!.sub, "user.disabled", {
      disabled_user_id: userId,
      target_user_email: user.email,
      previous_status: user.status,
      revoked_sessions_count: activeSessionsCount,
    });

    await client.query("COMMIT");
    res.json({
      message: "User disabled and all sessions revoked",
      revokedSessionsCount: activeSessionsCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Disable user error:", error);
    res.status(500).json({ error: "Failed to disable user" });
  } finally {
    client.release();
  }
}

/**
 * Delete user (HARD DELETE - permanent removal from database)
 * DELETE /api/users/:id
 */
export async function deleteUser(req: Request, res: Response) {
  const client = await getClient();

  try {
    const userId = req.params.id;
    const orgId = req.user!.org_id;
    const assignerRoles = req.user!.roles || [];

    // Don't allow self-delete
    if (userId === req.user!.sub) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    await client.query("BEGIN");

    // Verify user exists in org
    const user = await UserModel.findById(userId);
    if (!user || user.org_id !== orgId) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found" });
      return;
    }

    // SECURITY: Check if user being deleted has super_admin role
    const targetUserRoles = await RoleModel.getUserRoles(userId);
    const isSuperAdmin = assignerRoles.includes(ROLES.SUPER_ADMIN);

    // Only super_admin can delete super_admin users
    if (targetUserRoles.includes(ROLES.SUPER_ADMIN) && !isSuperAdmin) {
      await client.query("ROLLBACK");
      res.status(403).json({
        error: "Insufficient privileges",
        details: "Only super_admin can delete users with super_admin role",
      });
      return;
    }

    // SECURITY: Prevent deleting the last super_admin
    const isLastAdmin = await UserModel.isLastSuperAdmin(userId, orgId);
    if (isLastAdmin) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Cannot delete user",
        details: "Cannot delete the last super_admin in the organization",
      });
      return;
    }

    // Create audit log BEFORE deletion (so we have the data)
    await AuditLogModel.create(orgId, req.user!.sub, "user.deleted", {
      deleted_user_id: userId,
      email: user.email,
      display_name: user.display_name,
      roles: targetUserRoles,
      permanent: true,
    });

    // HARD DELETE - Database CASCADE will handle related records automatically
    // The database has ON DELETE CASCADE for:
    // - user_roles, mfa_methods, devices, risk_events, sessions, tokens, invite_tokens
    // And ON DELETE SET NULL for:
    // - audit_logs.user_id

    const deleteResult = await client.query(
      "DELETE FROM users WHERE id = $1 AND org_id = $2",
      [userId, orgId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "User not found or already deleted" });
      return;
    }

    await client.query("COMMIT");
    res.json({
      message: "User permanently deleted from database",
      deletedUser: {
        id: userId,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("Delete user error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            code: (error as NodeJS.ErrnoException).code,
            detail: (error as { detail?: string }).detail,
          }
        : { message: "Unknown error" };
    console.error("Error details:", errorDetails);
    res.status(500).json({
      error: "Failed to delete user",
      details: errorMessage,
    });
  } finally {
    client.release();
  }
}
