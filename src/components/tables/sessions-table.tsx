import {
  Monitor,
  Clock,
  User,
  ShieldCheck,
  ShieldX,
  Trash2,
  Loader2,
  Globe,
  Smartphone,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Session {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  clientId: string | null;
  deviceInfo: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  mfaVerified: boolean;
  issuedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  revoked: boolean;
}

interface SessionsTableProps {
  sessions: Session[];
  currentUserId: string | null;
  revokingId: string | null;
  onRevoke: (sessionId: string) => void;
}

export function SessionsTable({
  sessions,
  currentUserId,
  revokingId,
  onRevoke,
}: SessionsTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getTimeUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: "Unknown", os: "Unknown" };

    let browser = "Unknown";
    let os = "Unknown";

    // Detect browser
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    // Detect OS
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return { browser, os };
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active sessions
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Device / Location</TableHead>
          <TableHead>MFA</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const { browser, os } = parseUserAgent(session.userAgent);
          const isCurrentUser = session.userId === currentUserId;

          return (
            <TableRow key={session.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {session.userName || "Unknown"}
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.userEmail}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {browser} on {os}
                    </span>
                  </div>
                  {session.ipAddress && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{session.ipAddress}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {session.mfaVerified ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-accent text-accent-foreground hover:bg-accent"
                  >
                    <ShieldX className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">
                      {getTimeAgo(session.lastActivityAt || session.issuedAt)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(session.issuedAt)}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{getTimeUntil(session.expiresAt)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(session.expiresAt)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
