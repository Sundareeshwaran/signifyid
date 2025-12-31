/**
 * Organizations Controller
 *
 * Handles organization management business logic
 */
import type { Request, Response } from "express";
import * as OrganizationModel from "../models/Organization.model.js";

/**
 * DELETE /organizations/:orgId - Soft delete an organization
 *
 * SUPER_ADMIN ONLY + org:delete permission
 *
 * Requires confirmation string in body: { confirmation: "delete-{orgName}" }
 *
 * This is an irreversible operation that:
 * - Marks org as deleted
 * - Disables all users
 * - Deletes all clients
 * - Revokes all sessions and tokens
 * - Deletes MFA methods
 * - Preserves audit logs
 */
export async function deleteOrganization(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { orgId } = req.params;
    const { confirmation } = req.body;
    const performedBy = req.user!.sub;

    // 1. Validate orgId format
    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "Invalid organization ID" });
      return;
    }

    // 2. Get organization to validate it exists and get name for confirmation
    const org = await OrganizationModel.findById(orgId);

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    // 3. Check if already deleted
    if ((org as any).status === "deleted") {
      res.status(409).json({ error: "Organization already deleted" });
      return;
    }

    // 4. Validate confirmation string: "delete-{orgName}"
    const expectedConfirmation = `delete-${org.name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

    if (!confirmation || confirmation !== expectedConfirmation) {
      res.status(422).json({
        error: "Invalid confirmation",
        message: `To delete this organization, provide exact confirmation: "${expectedConfirmation}"`,
        expected: expectedConfirmation,
      });
      return;
    }

    // 5. Execute soft delete with cascading effects
    const result = await OrganizationModel.softDelete(
      orgId,
      performedBy,
      confirmation
    );

    if (!result.success) {
      if (result.error === "Organization not found") {
        res.status(404).json({ error: result.error });
        return;
      }
      if (result.error === "Organization already deleted") {
        res.status(409).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error || "Deletion failed" });
      return;
    }

    // 6. Return 204 No Content on success
    res.status(204).send();
  } catch (error) {
    console.error("Organization deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /organizations/:orgId - Get organization details (for deletion confirmation)
 *
 * SUPER_ADMIN ONLY
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const org = await OrganizationModel.findById(orgId);

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json({
      id: org.id,
      name: org.name,
      domain: org.domain,
      plan: org.plan || "free",
      status: (org as any).status || "active",
      createdAt: org.created_at,
      deletedAt: (org as any).deleted_at || null,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
