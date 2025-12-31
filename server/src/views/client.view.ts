/**
 * Client View
 *
 * Response formatters for client-related endpoints
 */
import type { Client } from "../models/Client.model.js";

// ClientRow is an alias for the Client model type for view layer compatibility
type ClientRow = Client;

/**
 * Format a single client for API response
 */
export function formatClient(row: ClientRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name || null,
    redirectUris: row.redirect_uris,
    scopes: row.scopes,
    isActive: row.is_active ?? true,
    allowedDomains: row.allowed_domains || [],
    status: row.status || "active",
    projectType: row.project_type || "website",
    createdAt: row.created_at,
  };
}

/**
 * Format client list response
 */
export function formatClientList(rows: ClientRow[]) {
  return {
    clients: rows.map(formatClient),
  };
}

/**
 * Format created client response (includes secret)
 */
export function formatCreatedClient(row: ClientRow, clientSecret: string) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name || null,
    clientSecret,
    redirectUris: row.redirect_uris,
    scopes: row.scopes,
    isActive: row.is_active ?? true,
    allowedDomains: row.allowed_domains || [],
    status: row.status || "active",
    projectType: row.project_type || "website",
    createdAt: row.created_at,
    message: "Store the client secret securely - it cannot be retrieved later",
  };
}

/**
 * Format regenerated secret response
 */
export function formatRegeneratedSecret(clientSecret: string) {
  return {
    clientSecret,
    message:
      "Store the new client secret securely - it cannot be retrieved later",
  };
}
