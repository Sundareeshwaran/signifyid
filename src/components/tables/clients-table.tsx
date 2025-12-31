"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Server,
  Wrench,
  Check,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role, hasPermission } from "@/lib/rbac";
import Link from "next/link";

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

interface ClientsTableProps {
  clients: Client[];
  currentUserRole: Role;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  onRegenerateSecret?: (client: Client) => void;
  onToggleActive?: (client: Client, isActive: boolean) => Promise<void>;
}

export function ClientsTable({
  clients,
  currentUserRole,
  onEdit,
  onDelete,
  onRegenerateSecret,
  onToggleActive,
}: ClientsTableProps) {
  const canEdit = hasPermission(currentUserRole, "clients:update");
  const canDelete = hasPermission(currentUserRole, "clients:delete");
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Copy client ID to clipboard
  const copyClientId = async (clientId: string) => {
    await navigator.clipboard.writeText(clientId);
    setCopiedClientId(clientId);
    setTimeout(() => {
      setCopiedClientId(null);
    }, 2000);
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Redirect URIs</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            {(canEdit || canDelete) && (
              <TableHead className="w-[70px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              {/* Application Name */}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {client.name || client.clientId.replace("client_", "App ")}
                  </span>
                </div>
              </TableCell>

              {/* Client ID */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[180px]">
                    {client.clientId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-pointer"
                    onClick={() => copyClientId(client.clientId)}
                  >
                    {copiedClientId === client.clientId ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>

              {/* Project Type */}
              <TableCell>
                <div className="flex items-center gap-2">
                  {client.projectType === "api" ? (
                    <Badge
                      variant="outline"
                      className="text-blue-600 border-blue-300 bg-blue-50"
                    >
                      <Server className="h-3 w-3 mr-1" />
                      API
                    </Badge>
                  ) : client.projectType === "internal" ? (
                    <Badge
                      variant="outline"
                      className="text-purple-600 border-purple-300 bg-purple-50"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Internal
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-cyan-600 border-cyan-300 bg-cyan-50"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Website
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Redirect URIs */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  {client.redirectUris.length > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Link href={client.redirectUris[0]} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {client.redirectUris[0]}
                      </span>
                      {client.redirectUris.length > 1 && (
                        <Badge variant="outline" className="text-xs w-fit">
                          +{client.redirectUris.length - 1} more
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>

              {/* Scopes */}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {client.scopes.slice(0, 3).map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                  {client.scopes.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{client.scopes.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                {client.isActive !== false ? (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-300 bg-green-50"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </TableCell>

              {/* Created Date */}
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(client.createdAt)}
              </TableCell>

              {/* Actions */}
              {(canEdit || canDelete) && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit?.(client)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRegenerateSecret?.(client)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerate Secret
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {client.isActive !== false ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                setTogglingClientId(client.id);
                                await onToggleActive?.(client, false);
                                setTogglingClientId(null);
                              }}
                              disabled={togglingClientId === client.id}
                            >
                              {togglingClientId === client.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <PowerOff className="mr-2 h-4 w-4" />
                              )}
                              Disable Client
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={async () => {
                                setTogglingClientId(client.id);
                                await onToggleActive?.(client, true);
                                setTogglingClientId(null);
                              }}
                              disabled={togglingClientId === client.id}
                            >
                              {togglingClientId === client.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Power className="mr-2 h-4 w-4" />
                              )}
                              Enable Client
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete?.(client)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Client
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
