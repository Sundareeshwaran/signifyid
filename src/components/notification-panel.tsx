"use client";

/**
 * Notification Panel
 *
 * Dropdown panel displaying the latest notifications.
 * Shows bell icon with unread badge, notifications list with severity icons,
 * and actions to mark as read.
 */

import { useState } from "react";
import { Bell, Info, AlertTriangle, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useNotificationContext,
  type Notification,
  type NotificationSeverity,
} from "@/hooks/useNotifications";

// Severity icon mapping
function getSeverityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3 transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Severity icon */}
      <div className="mt-0.5 shrink-0">
        {getSeverityIcon(notification.severity)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-none truncate",
              !notification.read && "text-foreground",
              notification.read && "text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Action buttons - visible on hover */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationContext();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {/* Header */}
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  clearAll();
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No recent notifications
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onRemove={removeNotification}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
