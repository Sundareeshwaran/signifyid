/**
 * Role Controller
 *
 * Handles role management business logic including
 * CRUD operations and user assignment.
 */
import type { Request, Response } from "express";
import * as RoleModel from "../models/Role.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import {
  validatePermissions,
  ALL_PERMISSIONS,
} from "../services/permission.service.js";

/**
 * List all roles in organization
 */
export async function list(req: Request, res: Response) {
  try {
    const roles = await RoleModel.list(req.user!.org_id);

    res.json({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystemRole: role.is_system_role,
        createdAt: role.created_at,
      })),
    });
  } catch (error) {
    console.error("List roles error:", error);
    res.status(500).json({ error: "Failed to list roles" });
  }
}

/**
 * Get role by ID
 */
export async function getById(req: Request, res: Response) {
  try {
    const role = await RoleModel.findById(req.params.id, req.user!.org_id);

    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // Get users with this role
    const users = await RoleModel.getRoleUsers(role.id);

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.is_system_role,
      createdAt: role.created_at,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
      })),
    });
  } catch (error) {
    console.error("Get role error:", error);
    res.status(500).json({ error: "Failed to get role" });
  }
}

/**
 * Create a new custom role
 */
export async function create(req: Request, res: Response) {
  try {
    const { name, permissions, description } = req.body;
    const orgId = req.user!.org_id;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res
        .status(400)
        .json({ error: "Role name must be at least 2 characters" });
      return;
    }

    // Check if name already exists
    const existing = await RoleModel.findByName(
      orgId,
      name.trim().toLowerCase()
    );
    if (existing) {
      res.status(409).json({ error: "Role with this name already exists" });
      return;
    }

    // Validate permissions
    if (!Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({ error: "At least one permission is required" });
      return;
    }

    const validation = validatePermissions(permissions);
    if (!validation.valid) {
      res.status(400).json({
        error: "Invalid permissions",
        invalid: validation.invalid,
        valid: ALL_PERMISSIONS,
      });
      return;
    }

    // Create role
    const role = await RoleModel.create(
      orgId,
      name.trim().toLowerCase(),
      permissions,
      description,
      req.user!.sub
    );

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "role.created", {
      role_id: role.id,
      role_name: role.name,
      permissions,
    });

    res.status(201).json({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.is_system_role,
      createdAt: role.created_at,
    });
  } catch (error) {
    console.error("Create role error:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
}

/**
 * Update role permissions/description
 */
export async function update(req: Request, res: Response) {
  try {
    const { permissions, description } = req.body;
    const orgId = req.user!.org_id;
    const roleId = req.params.id;

    // Find role
    const role = await RoleModel.findById(roleId, orgId);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // Cannot update system roles (except description)
    if (role.is_system_role && permissions !== undefined) {
      res
        .status(403)
        .json({ error: "Cannot modify permissions of system roles" });
      return;
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (!Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({ error: "At least one permission is required" });
        return;
      }

      const validation = validatePermissions(permissions);
      if (!validation.valid) {
        res.status(400).json({
          error: "Invalid permissions",
          invalid: validation.invalid,
        });
        return;
      }
    }

    // Update role
    await RoleModel.update(roleId, orgId, { permissions, description });

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "role.updated", {
      role_id: roleId,
      role_name: role.name,
      changes: { permissions, description },
    });

    res.json({ message: "Role updated" });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
}

/**
 * Delete a custom role
 */
export async function remove(req: Request, res: Response) {
  try {
    const orgId = req.user!.org_id;
    const roleId = req.params.id;

    // Find role
    const role = await RoleModel.findById(roleId, orgId);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // Cannot delete system roles
    if (role.is_system_role) {
      res.status(403).json({ error: "Cannot delete system roles" });
      return;
    }

    // Delete role
    const deleted = await RoleModel.remove(roleId, orgId);
    if (!deleted) {
      res.status(500).json({ error: "Failed to delete role" });
      return;
    }

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "role.deleted", {
      role_id: roleId,
      role_name: role.name,
    });

    res.json({ message: "Role deleted" });
  } catch (error) {
    console.error("Delete role error:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
}

/**
 * Assign role to user
 */
export async function assignToUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    const orgId = req.user!.org_id;
    const roleId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Find role
    const role = await RoleModel.findById(roleId, orgId);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // Assign role
    await RoleModel.assignToUser(userId, roleId);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "role.assigned", {
      role_id: roleId,
      role_name: role.name,
      user_id: userId,
    });

    res.json({ message: "Role assigned" });
  } catch (error) {
    console.error("Assign role error:", error);
    res.status(500).json({ error: "Failed to assign role" });
  }
}

/**
 * Remove role from user
 */
export async function removeFromUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    const orgId = req.user!.org_id;
    const roleId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Find role
    const role = await RoleModel.findById(roleId, orgId);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    // Remove role
    const removed = await RoleModel.removeFromUser(userId, roleId);
    if (!removed) {
      res.status(400).json({ error: "User does not have this role" });
      return;
    }

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "role.unassigned", {
      role_id: roleId,
      role_name: role.name,
      user_id: userId,
    });

    res.json({ message: "Role removed from user" });
  } catch (error) {
    console.error("Remove role error:", error);
    res.status(500).json({ error: "Failed to remove role" });
  }
}

/**
 * Get available permissions list
 */
export async function getPermissions(req: Request, res: Response) {
  res.json({ permissions: ALL_PERMISSIONS });
}
