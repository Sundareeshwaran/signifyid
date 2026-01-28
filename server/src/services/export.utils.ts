/**
 * Export Utilities
 *
 * Generate CSV and JSON exports for users and clients
 * with security safeguards and CSV injection prevention
 */

interface UserExportData {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
  createdAt: string;
  mfaEnabled?: boolean;
}

interface ClientExportData {
  id: string;
  clientId: string;
  name: string | null;
  redirectUris: string[];
  scopes: string[];
  createdAt: string;
  projectType?: string;
}

/**
 * Escape CSV field to prevent injection attacks
 * Removes formulas starting with =, +, -, @, tab, carriage return
 */
function escapeCsvField(value: string): string {
  if (value === null || value === undefined) {
    return "";
  }

  let stringValue = String(value);

  // Prevent CSV injection - remove leading dangerous characters
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];
  while (
    stringValue.length > 0 &&
    dangerousChars.some((char) => stringValue.startsWith(char))
  ) {
    stringValue = stringValue.substring(1);
  }

  // Escape double quotes and wrap in quotes if contains special chars
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV export for users
 */
export function generateUsersCsv(users: UserExportData[]): string {
  // Define headers
  const headers = [
    "ID",
    "Email",
    "Display Name",
    "Status",
    "Roles",
    "MFA Enabled",
    "Created At",
  ].join(",");

  // Generate rows
  const rows = users.map((user) => {
    return [
      escapeCsvField(user.id),
      escapeCsvField(user.email),
      escapeCsvField(user.displayName || ""),
      escapeCsvField(user.status),
      escapeCsvField(user.roles.join("; ")),
      escapeCsvField(user.mfaEnabled ? "Yes" : "No"),
      escapeCsvField(user.createdAt),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Generate JSON export for users
 */
export function generateUsersJson(users: UserExportData[]): string {
  // Filter out sensitive fields (already done, but being explicit)
  const sanitizedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
  }));

  return JSON.stringify(sanitizedUsers, null, 2);
}

/**
 * Generate CSV export for clients
 */
export function generateClientsCsv(clients: ClientExportData[]): string {
  // Define headers
  const headers = [
    "ID",
    "Client ID",
    "Name",
    "Redirect URIs",
    "Scopes",
    "Project Type",
    "Created At",
  ].join(",");

  // Generate rows
  const rows = clients.map((client) => {
    return [
      escapeCsvField(client.id),
      escapeCsvField(client.clientId),
      escapeCsvField(client.name || ""),
      escapeCsvField(client.redirectUris.join("; ")),
      escapeCsvField(client.scopes.join("; ")),
      escapeCsvField(client.projectType || ""),
      escapeCsvField(client.createdAt),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Generate JSON export for clients
 */
export function generateClientsJson(clients: ClientExportData[]): string {
  // Filter out sensitive fields
  const sanitizedClients = clients.map((client) => ({
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    redirectUris: client.redirectUris,
    scopes: client.scopes,
    projectType: client.projectType,
    createdAt: client.createdAt,
  }));

  return JSON.stringify(sanitizedClients, null, 2);
}
