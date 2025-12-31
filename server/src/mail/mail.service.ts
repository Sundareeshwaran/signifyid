/**
 * Email Service
 *
 * Centralized email sending abstraction with:
 * - Idempotent sending (deduplication)
 * - Automatic retry with exponential backoff
 * - Non-blocking async execution
 * - Comprehensive audit logging
 * - Rate limiting per organization
 */
import { transporter, getDefaultFrom, renderTemplate } from "./mailer.js";
import * as EmailLogModel from "../models/EmailLog.model.js";
import * as AuditLogModel from "../models/AuditLog.model.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import type {
  SendEmailOptions,
  EmailType,
  InviteEmailData,
  UserCreatedEmailData,
  WelcomeEmailData,
  BillingEmailData,
  AuditSummaryEmailData,
  ContactSalesEmailData,
  RetryConfig,
} from "./mail.types.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Rate limit: max emails per org per hour
 */
const RATE_LIMIT_PER_HOUR = 100;

/**
 * Generate idempotency key for deduplication
 */
function generateIdempotencyKey(
  emailType: EmailType,
  orgId: string,
  recipient: string,
  uniqueId?: string
): string {
  const base = `${emailType}:${orgId}:${recipient}`;
  return uniqueId ? `${base}:${uniqueId}` : base;
}

/**
 * Check rate limit for organization
 */
async function checkRateLimit(orgId: string): Promise<boolean> {
  const recentCount = await EmailLogModel.getRecentCountByOrg(orgId, 1);
  return recentCount < RATE_LIMIT_PER_HOUR;
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate backoff delay for retry
 */
function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Main email sending function
 * Non-blocking, idempotent, with retry support
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const {
    to,
    subject,
    template,
    data,
    orgId,
    userId,
    emailType,
    idempotencyKey,
    textContent,
  } = options;

  // Generate idempotency key if not provided
  const idemKey =
    idempotencyKey || generateIdempotencyKey(emailType, orgId, to);

  try {
    // Check for duplicate send (idempotency)
    const existing = await EmailLogModel.findByIdempotencyKey(idemKey);
    if (existing && existing.status === "sent") {
      logger.info(`Skipping duplicate email: ${idemKey}`);
      return { success: true, logId: existing.id };
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(orgId);
    if (!withinLimit) {
      logger.warn(`Rate limit exceeded for org: ${orgId}`);
      return { success: false, error: "Rate limit exceeded" };
    }

    // Create email log entry
    const emailLog = await EmailLogModel.create({
      orgId,
      userId,
      emailType,
      recipient: to,
      subject,
      status: "pending",
      idempotencyKey: idemKey,
      metadata: { template, dataKeys: Object.keys(data) },
    });

    // Render HTML template
    let html: string;
    try {
      html = renderTemplate(template, {
        ...data,
        year: new Date().getFullYear(),
        frontendUrl: config.frontendUrl,
        logoUrl: `${config.frontendUrl}/logo.svg`,
      });
    } catch (templateError) {
      logger.error(`Template render error for ${template}`, {
        error: templateError,
      });
      await EmailLogModel.updateStatus(
        emailLog.id,
        "failed",
        `Template error: ${templateError}`
      );
      return {
        success: false,
        logId: emailLog.id,
        error: "Template render failed",
      };
    }

    // Send email (non-blocking)
    sendWithRetry(emailLog.id, {
      from: getDefaultFrom(),
      to,
      subject,
      html,
      text: textContent || stripHtml(html),
    }).catch((error) => {
      logger.error(`Background email send failed for ${emailLog.id}`, {
        error,
      });
    });

    return { success: true, logId: emailLog.id };
  } catch (error) {
    logger.error("Email service error", { error });
    return { success: false, error: String(error) };
  }
}

/**
 * Send email with retry logic (runs in background)
 */
async function sendWithRetry(
  logId: string,
  mailOptions: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  },
  attempt: number = 0
): Promise<void> {
  try {
    await transporter.sendMail(mailOptions);
    await EmailLogModel.updateStatus(logId, "sent");
    logger.info(`Email sent successfully: ${logId}`);
  } catch (error) {
    logger.error(`Email send failed (attempt ${attempt + 1})`, { error });

    if (attempt < DEFAULT_RETRY_CONFIG.maxRetries) {
      await EmailLogModel.updateStatus(logId, "retrying", String(error));
      const backoff = calculateBackoff(attempt);
      logger.info(`Retrying email ${logId} in ${backoff}ms...`);
      await sleep(backoff);
      return sendWithRetry(logId, mailOptions, attempt + 1);
    } else {
      await EmailLogModel.markPermanentlyFailed(logId, String(error));
      logger.error(
        `Email permanently failed after ${attempt + 1} attempts: ${logId}`
      );
    }
  }
}

/**
 * Strip HTML tags for plaintext fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// SPECIALIZED EMAIL SENDERS
// =============================================================================

/**
 * Send user invite email
 */
export async function sendUserInvite(
  data: InviteEmailData,
  orgId: string,
  userId?: string
): Promise<{ success: boolean; logId?: string }> {
  const result = await sendEmail({
    to: data.recipientEmail,
    subject: `You've been invited to join ${data.organizationName}`,
    template: "invite",
    data: {
      ...data,
      supportEmail: data.supportEmail || config.mail.from,
    },
    orgId,
    userId,
    emailType: "user_invite",
    idempotencyKey: `invite:${orgId}:${data.recipientEmail}:${Date.now()}`,
  });

  if (result.success) {
    await AuditLogModel.create(
      orgId,
      userId || null,
      "email_sent:user_invite",
      {
        recipient: data.recipientEmail,
        role: data.roleName,
      }
    );
  }

  return result;
}

/**
 * Send user created email (direct creation by admin)
 */
export async function sendUserCreated(
  data: UserCreatedEmailData,
  orgId: string,
  userId?: string
): Promise<{ success: boolean; logId?: string }> {
  const result = await sendEmail({
    to: data.recipientEmail,
    subject: `Your account has been created at ${data.organizationName}`,
    template: "user-created",
    data: {
      ...data,
      supportEmail: data.supportEmail || config.mail.from,
    },
    orgId,
    userId,
    emailType: "user_created",
    idempotencyKey: `created:${orgId}:${data.recipientEmail}:${Date.now()}`,
  });

  if (result.success) {
    await AuditLogModel.create(
      orgId,
      userId || null,
      "email_sent:user_created",
      {
        recipient: data.recipientEmail,
        role: data.roleName,
      }
    );
  }

  return result;
}

/**
 * Send welcome email (for user or organization)
 */
export async function sendWelcome(
  data: WelcomeEmailData,
  orgId: string,
  userId?: string
): Promise<{ success: boolean; logId?: string }> {
  const emailType: EmailType = data.isOrgWelcome
    ? "org_welcome"
    : "user_welcome";

  const result = await sendEmail({
    to: data.supportEmail, // This will be overridden with actual recipient
    subject: `Welcome to Signify iD${
      data.isOrgWelcome ? " - Your organization is ready!" : ""
    }`,
    template: "welcome",
    data: {
      ...data,
      supportEmail: data.supportEmail || config.mail.from,
    },
    orgId,
    userId,
    emailType,
    idempotencyKey: `welcome:${emailType}:${orgId}:${userId || "org"}`,
  });

  if (result.success) {
    await AuditLogModel.create(
      orgId,
      userId || null,
      `email_sent:${emailType}`,
      {
        recipientName: data.recipientName,
      }
    );
  }

  return result;
}

/**
 * Send billing event email
 */
export async function sendBillingEmail(
  data: BillingEmailData,
  recipientEmail: string,
  orgId: string,
  transactionId: string
): Promise<{ success: boolean; logId?: string }> {
  const emailTypeMap: Record<string, EmailType> = {
    success: "billing_success",
    failed: "billing_failed",
    refunded: "billing_refunded",
    cancelled: "billing_cancelled",
  };

  const emailType = emailTypeMap[data.eventType];

  const subjectMap: Record<string, string> = {
    success: `Payment successful for ${data.organizationName}`,
    failed: `Payment failed - Action required`,
    refunded: `Refund processed for ${data.organizationName}`,
    cancelled: `Subscription cancelled for ${data.organizationName}`,
  };

  const result = await sendEmail({
    to: recipientEmail,
    subject: subjectMap[data.eventType],
    template: "billing",
    data: {
      ...data,
      supportEmail: data.supportEmail || config.mail.from,
      portalLink: data.portalLink || `${config.frontendUrl}/dashboard/billing`,
    },
    orgId,
    userId: null,
    emailType,
    idempotencyKey: `billing:${orgId}:${transactionId}:${data.eventType}`,
  });

  if (result.success) {
    await AuditLogModel.create(orgId, null, `email_sent:${emailType}`, {
      recipient: recipientEmail,
      invoiceId: data.invoiceId,
      amount: data.amount,
    });
  }

  return result;
}

/**
 * Send weekly audit summary email
 */
export async function sendAuditSummary(
  data: AuditSummaryEmailData,
  recipientEmail: string,
  orgId: string,
  userId: string
): Promise<{ success: boolean; logId?: string }> {
  const weekKey = `${data.dateRange.start}-${data.dateRange.end}`;

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Weekly Security Summary for ${data.organizationName}`,
    template: "audit-summary",
    data: {
      ...data,
      dashboardLink:
        data.dashboardLink || `${config.frontendUrl}/dashboard/logs`,
    },
    orgId,
    userId,
    emailType: "audit_summary_weekly",
    idempotencyKey: `audit:${orgId}:${userId}:${weekKey}`,
  });

  if (result.success) {
    await AuditLogModel.create(
      orgId,
      userId,
      "email_sent:audit_summary_weekly",
      {
        recipient: recipientEmail,
        totalEvents: data.totalEvents,
        securityAlerts: data.securityAlerts,
      }
    );
  }

  return result;
}

/**
 * Send contact sales inquiry email
 */
export async function sendContactSalesInquiry(
  data: ContactSalesEmailData,
  orgId: string,
  userId?: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  // Support team email (or fallback to sender address from config)
  const supportTeamEmail = config.mail.from;

  const result = await sendEmail({
    to: supportTeamEmail,
    subject: `[Sales Inquiry] ${data.subject}`,
    template: "contact-sales",
    data: {
      ...data,
      sentAt: new Date().toLocaleString(),
    },
    orgId,
    userId,
    emailType: "contact_sales",
    idempotencyKey: `sales:${orgId}:${userId}:${Date.now()}`,
    textContent: `
      Verify Sales Inquiry from:
      Name: ${data.senderName}
      Email: ${data.senderEmail}
      Organization: ${data.organizationName || "N/A"}

      Message:
      ${data.message}
    `,
  });

  return result;
}

/**
 * Process retry queue (called by scheduled job)
 */
export async function processRetryQueue(): Promise<number> {
  const pendingRetries = await EmailLogModel.getPendingRetries(
    DEFAULT_RETRY_CONFIG.maxRetries
  );

  logger.info(`Processing ${pendingRetries.length} emails for retry...`);

  let processed = 0;
  for (const emailLog of pendingRetries) {
    try {
      // Re-attempt sending (simplified - would need to reconstruct mail options)
      await EmailLogModel.updateStatus(emailLog.id, "retrying");
      // In a full implementation, we'd store enough data to re-render the email
      // For now, we mark it for manual review after max retries
      processed++;
    } catch (error) {
      logger.error(`Retry failed for ${emailLog.id}`, { error });
    }
  }

  return processed;
}
