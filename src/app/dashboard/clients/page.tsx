"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientsTable } from "@/components/tables/clients-table";
import { CreateClientDialog } from "@/components/dialogs/create-client-dialog";
import { EditClientDialog } from "@/components/dialogs/edit-client-dialog";
import { DeleteClientDialog } from "@/components/dialogs/delete-client-dialog";
import { RegenerateSecretDialog } from "@/components/dialogs/regenerate-secret-dialog";
import { ExportDataDialog } from "@/components/dialogs/export-data-dialog";
import { clientsApi, authApi, exportApi } from "@/lib/api";
import { Role, hasPermission } from "@/lib/rbac";

// Client type
interface Client {
  id: string;
  clientId: string;
  name?: string | null;
  redirectUris: string[];
  scopes: string[];
  isActive?: boolean;
  allowedDomains?: string[];
  status?: string;
  projectType?: string;
  createdAt: string;
}

/**
 * OAuth Clients (Applications) Management Page
 *
 * Full CRUD with real API integration
 */
export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>("user");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [regenerateClient, setRegenerateClient] = useState<Client | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Fetch current user role
  useEffect(() => {
    async function fetchCurrentUser() {
      const result = await authApi.me();
      if (result.data) {
        const roles = result.data.roles || [];
        if (roles.includes("super_admin")) setCurrentRole("super_admin");
        else if (roles.includes("tenant_admin")) setCurrentRole("tenant_admin");
        else if (roles.includes("security_admin"))
          setCurrentRole("security_admin");
        else if (roles.includes("developer")) setCurrentRole("developer");
        else setCurrentRole("user");
      }
    }
    fetchCurrentUser();
  }, []);

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    const result = await clientsApi.list();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setClients(result.data.clients as Client[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await fetchClients();
    })();
  }, []);

  const canCreateClients = hasPermission(currentRole, "clients:create");
  const canExport = hasPermission(currentRole, "data:export");

  // Filter clients
  const filteredClients = clients.filter(
    (client) =>
      (client.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClients = clients.filter((c) => c.isActive !== false).length;
  const inactiveClients = clients.filter((c) => c.isActive === false).length;

  // Action handlers
  const handleEdit = (client: Client) => {
    setEditClient(client);
  };

  const handleDelete = (client: Client) => {
    setDeleteClient(client);
  };

  const handleRegenerateSecret = (client: Client) => {
    setRegenerateClient(client);
  };

  const handleRefresh = () => {
    fetchClients();
  };

  const handleToggleActive = async (client: Client, isActive: boolean) => {
    try {
      if (isActive) {
        await clientsApi.enable(client.id);
      } else {
        await clientsApi.disable(client.id);
      }
      fetchClients();
    } catch (err) {
      console.error("Failed to toggle client status:", err);
    }
  };

  // Export handler with file download
  const handleExportConfirm = async (format: "csv" | "json") => {
    try {
      const { blob, filename } = await exportApi.clients(format);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      throw err; // Re-throw to let dialog handle error display
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Manage OAuth2 / OIDC client applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {canCreateClients && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register App
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : clients.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "—" : activeClients}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {loading ? "—" : inactiveClients}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>
                OAuth2/OIDC client applications registered with your
                organization
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {searchQuery
                ? "No applications match your search"
                : "No applications registered yet"}
            </div>
          ) : (
            <ClientsTable
              clients={filteredClients}
              currentUserRole={currentRole}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRegenerateSecret={handleRegenerateSecret}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateClientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchClients}
      />
      <EditClientDialog
        open={editClient !== null}
        onOpenChange={(open) => !open && setEditClient(null)}
        client={editClient}
        onSuccess={fetchClients}
      />
      <DeleteClientDialog
        open={deleteClient !== null}
        onOpenChange={(open) => !open && setDeleteClient(null)}
        client={deleteClient}
        onSuccess={fetchClients}
      />
      <RegenerateSecretDialog
        open={regenerateClient !== null}
        onOpenChange={(open) => !open && setRegenerateClient(null)}
        client={regenerateClient}
        onSuccess={fetchClients}
      />

      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        resource="clients"
        rowCount={clients.length}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
