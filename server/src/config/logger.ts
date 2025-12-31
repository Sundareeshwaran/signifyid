/**
 * Production-safe logging utility
 *
 * Sanitizes sensitive data from log output to prevent
 * accidental exposure of secrets in server logs.
 */
import { config } from "./env.js";

// Keys that should never appear in logs
const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "creditcard",
  "ssn",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "bearer",
  "credential",
  "private",
];

/**
 * Recursively sanitize an object by redacting sensitive keys
 */
function sanitize(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return "[MAX_DEPTH]";

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Truncate very long strings
    return obj.length > 500 ? obj.substring(0, 500) + "...[TRUNCATED]" : obj;
  }

  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.slice(0, 10).map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Format log message with timestamp
 */
function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

export const logger = {
  /**
   * Log error - always logged, details only in development
   */
  error: (message: string, data?: unknown) => {
    if (config.nodeEnv === "production") {
      console.error(formatMessage("ERROR", message));
    } else {
      console.error(
        formatMessage("ERROR", message),
        data ? sanitize(data) : ""
      );
    }
  },

  /**
   * Log warning - always logged with sanitized data
   */
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage("WARN", message), data ? sanitize(data) : "");
  },

  /**
   * Log info - general information
   */
  info: (message: string) => {
    console.log(formatMessage("INFO", message));
  },

  /**
   * Log debug - development only
   */
  debug: (message: string, data?: unknown) => {
    if (config.nodeEnv !== "production") {
      console.log(formatMessage("DEBUG", message), data ? sanitize(data) : "");
    }
  },

  /**
   * Log security event - always logged for audit
   */
  security: (event: string, details: Record<string, unknown>) => {
    // Always log security events but sanitize the data
    console.log(formatMessage("SECURITY", event), sanitize(details));
  },
};
