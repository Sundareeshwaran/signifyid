"use client";

/**
 * useNotifications Hook
 *
 * Manages notification state with localStorage persistence.
 * Displays only the latest 5 notifications, automatically trimming older ones.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";

const STORAGE_KEY = "signify_notifications";
const MAX_NOTIFICATIONS = 5;

export type NotificationSeverity = "info" | "warning" | "critical";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt" | "read">
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Generate unique ID
function generateId(): string {
  return `ntf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load notifications from localStorage
function loadFromStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save notifications to localStorage
function saveToStorage(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error("Failed to save notifications:", err);
  }
}

export function useNotifications(): UseNotificationsReturn {
  // Use lazy initialization to load from localStorage on first render
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadFromStorage()
  );

  // Save to localStorage when notifications change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  // Add a new notification
  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        // Add to beginning and trim to max
        const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
        return updated;
      });
    },
    []
  );

  // Mark a single notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Remove a single notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
}

// Context for global notification access
const NotificationContext = createContext<UseNotificationsReturn | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notificationState = useNotifications();

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): UseNotificationsReturn {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}
