/**
 * Email System Type Definitions
 *
 * Types for the centralized email notification system
 */

/**
 * Supported email types for audit logging
 */
export type EmailType =
  | "user_invite"
  | "user_created"
  | "user_welcome"
  | "org_welcome"
  | "audit_summary_weekly"
  | "billing_success"
  | "billing_failed"
  | "billing_refunded"
  | "billing_refunded"
  | "billing_cancelled"
  | "contact_sales";

/**
 * Email status for logging
 */
export type EmailStatus = "pending" | "sent" | "failed" | "retrying";

/**
 * Main email sending options
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  orgId: string;
  userId?: string | null;
  emailType: EmailType;
  idempotencyKey?: string;
  textContent?: string;
}

/**
 * Email log entry stored in database
 */
export interface EmailLogEntry {
  id: string;
  org_id: string;
  user_id: string | null;
  email_type: EmailType;
  recipient: string;
  subject: string | null;
  status: EmailStatus;
  error_message: string | null;
  retry_count: number;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  sent_at: Date | null;
}

/**
 * Template data for invite emails
 */
export interface InviteEmailData {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  inviteLink: string;
  roleName: string;
  expiresInDays: number;
  invitedByName?: string;
  supportEmail?: string;
}

/**
 * Template data for user created emails
 */
export interface UserCreatedEmailData {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  loginLink: string;
  roleName: string;
  createdByName?: string;
  supportEmail?: string;
}

/**
 * Template data for welcome emails
 */
export interface WelcomeEmailData {
  recipientName: string;
  organizationName: string;
  isOrgWelcome: boolean;
  dashboardLink: string;
  docsLink: string;
  supportEmail: string;
  features?: string[];
}

/**
 * Template data for billing emails
 */
export interface BillingEmailData {
  recipientName: string;
  organizationName: string;
  eventType: "success" | "failed" | "refunded" | "cancelled";
  invoiceId?: string;
  amount?: string;
  currency?: string;
  planName?: string;
  nextSteps?: string;
  portalLink?: string;
  supportEmail: string;
}

/**
 * Template data for contact sales emails
 */
export interface ContactSalesEmailData {
  senderName: string;
  senderEmail: string;
  organizationName?: string;
  subject: string;
  message: string;
}

/**
 * Template data for audit summary emails
 */
export interface AuditSummaryEmailData {
  recipientName: string;
  organizationName: string;
  dateRange: {
    start: string;
    end: string;
  };
  topEvents: Array<{
    action: string;
    count: number;
    lastOccurred: string;
  }>;
  totalEvents: number;
  securityAlerts: number;
  dashboardLink: string;
}

/**
 * Organization branding for email customization
 */
export interface OrgBranding {
  primaryColor?: string;
  logoUrl?: string;
  supportEmail?: string;
  companyName?: string;
}

/**
 * Email retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxPerHour: number;
  maxPerDay: number;
}
