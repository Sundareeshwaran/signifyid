/**
 * Client Controller
 *
 * Handles OAuth client management business logic
 */
import type { Request, Response } from "express";
import * as ClientModel from "../models/Client.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import * as clientView from "../views/client.view.js";
import { invalidateCorsCache } from "../services/cors.service.js";
import * as PlanLimitsService from "../services/planLimits.service.js";

/**
 * List all clients in organization
 */
export async function list(req: Request, res: Response) {
  try {
    const clients = await ClientModel.list(req.user!.org_id);
    res.json(clientView.formatClientList(clients));
  } catch (error) {
    console.error("List clients error:", error);
    res.status(500).json({ error: "Failed to list clients" });
  }
}

/**
 * Get client by ID
 */
export async function getById(req: Request, res: Response) {
  try {
    const client = await ClientModel.findById(req.params.id, req.user!.org_id);

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json(clientView.formatClient(client));
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Failed to get client" });
  }
}

/**
 * Create a new OAuth client
 */
export async function create(req: Request, res: Response) {
  try {
    const { name, redirectUris, scopes, allowedDomains, projectType } =
      req.body;
    const orgId = req.user!.org_id;

    // Check plan limit before creating
    const limitCheck = await PlanLimitsService.canCreateClient(orgId);
    if (!limitCheck.allowed) {
      res.status(403).json({
        error: "Plan limit exceeded",
        message: limitCheck.message,
        usage: { current: limitCheck.current, max: limitCheck.max },
      });
      return;
    }

    // Validate redirect URIs
    if (
      !redirectUris ||
      !Array.isArray(redirectUris) ||
      redirectUris.length === 0
    ) {
      res.status(400).json({ error: "At least one redirect URI is required" });
      return;
    }

    // Validate URIs format
    for (const uri of redirectUris) {
      try {
        new URL(uri);
      } catch {
        res.status(400).json({ error: `Invalid redirect URI: ${uri}` });
        return;
      }
    }

    // Validate allowed domains if provided
    if (allowedDomains && !Array.isArray(allowedDomains)) {
      res.status(400).json({ error: "allowedDomains must be an array" });
      return;
    }

    // Validate projectType if provided
    if (projectType && !["website", "api", "internal"].includes(projectType)) {
      res
        .status(400)
        .json({ error: "projectType must be website, api, or internal" });
      return;
    }

    const { row, clientSecret } = await ClientModel.create(
      orgId,
      name || null,
      redirectUris,
      scopes || ["openid"],
      allowedDomains,
      projectType
    );

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "client.created", {
      client_id: row.client_id,
      name,
    });

    // Invalidate CORS cache to include new redirect URIs
    invalidateCorsCache();

    res.status(201).json(clientView.formatCreatedClient(row, clientSecret));
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
}

/**
 * Update client
 */
export async function update(req: Request, res: Response) {
  try {
    const { name, redirectUris, scopes, allowedDomains, projectType } =
      req.body;
    const clientId = req.params.id;
    const orgId = req.user!.org_id;

    // Validate redirect URIs if provided
    if (redirectUris) {
      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        res
          .status(400)
          .json({ error: "At least one redirect URI is required" });
        return;
      }
      for (const uri of redirectUris) {
        try {
          new URL(uri);
        } catch {
          res.status(400).json({ error: `Invalid redirect URI: ${uri}` });
          return;
        }
      }
    }

    // Validate projectType if provided
    if (projectType && !["website", "api", "internal"].includes(projectType)) {
      res
        .status(400)
        .json({ error: "projectType must be website, api, or internal" });
      return;
    }

    await ClientModel.update(clientId, orgId, {
      name,
      redirectUris,
      scopes,
      allowedDomains,
      projectType,
    });
    await AuditLogModel.create(orgId, req.user!.sub, "client.updated", {
      client_db_id: clientId,
    });

    // Invalidate CORS cache if redirect URIs changed
    if (redirectUris) {
      invalidateCorsCache();
    }

    // Return the updated client
    const client = await ClientModel.findById(clientId, orgId);
    if (client) {
      res.json(clientView.formatClient(client));
    } else {
      res.json({ message: "Client updated" });
    }
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ error: "Failed to update client" });
  }
}

/**
 * Delete client
 */
export async function remove(req: Request, res: Response) {
  try {
    const clientId = req.params.id;
    const orgId = req.user!.org_id;

    // Verify client exists
    const client = await ClientModel.findById(clientId, orgId);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await ClientModel.remove(clientId, orgId);
    await AuditLogModel.create(orgId, req.user!.sub, "client.deleted", {
      client_db_id: clientId,
      client_id: client.client_id,
    });

    // Invalidate CORS cache to remove deleted client's URIs
    invalidateCorsCache();

    res.json({ message: "Client deleted" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
}

/**
 * Regenerate client secret
 */
export async function regenerateSecret(req: Request, res: Response) {
  try {
    const clientDbId = req.params.id;
    const orgId = req.user!.org_id;

    // Verify client exists
    const client = await ClientModel.findById(clientDbId, orgId);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const clientSecret = await ClientModel.regenerateSecret(clientDbId, orgId);
    await AuditLogModel.create(
      orgId,
      req.user!.sub,
      "client.secret_regenerated",
      {
        client_db_id: clientDbId,
        client_id: client.client_id,
      }
    );

    res.json(clientView.formatRegeneratedSecret(clientSecret));
  } catch (error) {
    console.error("Regenerate secret error:", error);
    res.status(500).json({ error: "Failed to regenerate secret" });
  }
}

/**
 * Disable client (set is_active to false)
 */
export async function disable(req: Request, res: Response) {
  try {
    const clientDbId = req.params.id;
    const orgId = req.user!.org_id;

    // Verify client exists
    const client = await ClientModel.findById(clientDbId, orgId);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Update is_active to false
    await ClientModel.setActive(clientDbId, orgId, false);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "client.disabled", {
      client_db_id: clientDbId,
      client_id: client.client_id,
    });

    res.json({ message: "Client disabled" });
  } catch (error) {
    console.error("Disable client error:", error);
    res.status(500).json({ error: "Failed to disable client" });
  }
}

/**
 * Enable client (set is_active to true)
 */
export async function enable(req: Request, res: Response) {
  try {
    const clientDbId = req.params.id;
    const orgId = req.user!.org_id;

    // Verify client exists
    const client = await ClientModel.findById(clientDbId, orgId);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Update is_active to true
    await ClientModel.setActive(clientDbId, orgId, true);

    // Audit log
    await AuditLogModel.create(orgId, req.user!.sub, "client.enabled", {
      client_db_id: clientDbId,
      client_id: client.client_id,
    });

    res.json({ message: "Client enabled" });
  } catch (error) {
    console.error("Enable client error:", error);
    res.status(500).json({ error: "Failed to enable client" });
  }
}
