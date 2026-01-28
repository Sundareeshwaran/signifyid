/**
 * Export Controller
 *
 * Handles secure data export with mandatory confirmation,
 * format selection, RBAC enforcement, and audit logging
 */
import type { Request, Response } from "express";
import { query } from "../config/db.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import {
  generateUsersCsv,
  generateUsersJson,
  generateClientsCsv,
  generateClientsJson,
} from "../services/export.utils.js";

// Interface for user export query result
interface UserExportRow {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  roles: string[];
  mfaEnabled: boolean;
}

// Interface for client export query result
interface ClientExportRow {
  id: string;
  clientId: string;
  name: string | null;
  redirectUris: string[];
  scopes: string[];
  projectType: string;
  createdAt: string;
}

/**
 * Export users
 * POST /api/export/users
 *
 * Request body: { format: "csv" | "json", filters?: { status?: string, role?: string, search?: string } }
 */
export async function exportUsers(req: Request, res: Response): Promise<void> {
  try {
    const { format, filters } = req.body;

    // Validate format
    if (!format || (format !== "csv" && format !== "json")) {
      res.status(422).json({
        error: "Invalid format",
        message: 'Format must be either "csv" or "json"',
      });
      return;
    }

    const orgId = req.user!.org_id;

    // Build query with filters
    let queryText = `
      SELECT 
        u.id,
        u.email,
        u.display_name as "displayName",
        u.status,
        u.created_at as "createdAt",
        COALESCE(
          json_agg(
            DISTINCT r.name
          ) FILTER (WHERE r.name IS NOT NULL),
          '[]'
        ) as roles,
        EXISTS(
          SELECT 1 FROM mfa_methods 
          WHERE user_id = u.id AND verified = true
        ) as "mfaEnabled"
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.org_id = $1
    `;

    const queryParams: unknown[] = [orgId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status) {
      queryText += ` AND u.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters?.role) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM user_roles ur2
        JOIN roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id AND r2.name = $${paramIndex}
      )`;
      queryParams.push(filters.role);
      paramIndex++;
    }

    if (filters?.search) {
      queryText += ` AND (
        u.email ILIKE $${paramIndex} OR 
        u.display_name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    queryText += ` GROUP BY u.id, u.email, u.display_name, u.status, u.created_at ORDER BY u.created_at DESC`;

    // Fetch users
    const result = await query<UserExportRow>(queryText, queryParams);
    const users = result.rows.map((row) => ({
      ...row,
      roles: Array.isArray(row.roles) ? row.roles : [],
    }));

    // Generate file content
    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (format === "csv") {
      content = generateUsersCsv(users);
      contentType = "text/csv; charset=utf-8";
      fileExtension = "csv";
    } else {
      content = generateUsersJson(users);
      contentType = "application/json; charset=utf-8";
      fileExtension = "json";
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `users_export_${timestamp}.${fileExtension}`;

    // Audit log the export
    try {
      await AuditLogModel.create(
        req.user!.org_id,
        req.user!.sub,
        "data_exported",
        {
          resource: "users",
          format,
          row_count: users.length,
          filters: filters || {},
          ip_address: req.ip,
          user_agent: req.get("user-agent"),
        }
      );
    } catch (err) {
      console.error("Failed to log export:", err);
      // Continue with export even if audit log fails
    }

    // Set response headers for download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    // Send file content
    res.send(content);
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({
      error: "Export failed",
      message: "An error occurred while generating the export",
    });
  }
}

/**
 * Export clients
 * POST /api/export/clients
 *
 * Request body: { format: "csv" | "json" }
 */
export async function exportClients(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { format } = req.body;

    // Validate format
    if (!format || (format !== "csv" && format !== "json")) {
      res.status(422).json({
        error: "Invalid format",
        message: 'Format must be either "csv" or "json"',
      });
      return;
    }

    const orgId = req.user!.org_id;

    // Fetch clients (exclude client_secret)
    const result = await query<ClientExportRow>(
      `
      SELECT 
        id,
        client_id as "clientId",
        name,
        redirect_uris as "redirectUris",
        scopes,
        project_type as "projectType",
        created_at as "createdAt"
      FROM clients
      WHERE org_id = $1
      ORDER BY created_at DESC
    `,
      [orgId]
    );

    const clients = result.rows;

    // Generate file content
    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (format === "csv") {
      content = generateClientsCsv(clients);
      contentType = "text/csv; charset=utf-8";
      fileExtension = "csv";
    } else {
      content = generateClientsJson(clients);
      contentType = "application/json; charset=utf-8";
      fileExtension = "json";
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `clients_export_${timestamp}.${fileExtension}`;

    // Audit log the export
    try {
      await AuditLogModel.create(
        req.user!.org_id,
        req.user!.sub,
        "data_exported",
        {
          resource: "clients",
          format,
          row_count: clients.length,
          ip_address: req.ip,
          user_agent: req.get("user-agent"),
        }
      );
    } catch (err) {
      console.error("Failed to log export:", err);
      // Continue with export even if audit log fails
    }

    // Set response headers for download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    // Send file content
    res.send(content);
  } catch (error) {
    console.error("Export clients error:", error);
    res.status(500).json({
      error: "Export failed",
      message: "An error occurred while generating the export",
    });
  }
}
