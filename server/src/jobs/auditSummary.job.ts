/**
 * Audit Summary Job
 *
 * Weekly cron job that sends security audit summaries
 * to super_admin and security_admin users
 */
import cron, { type ScheduledTask } from "node-cron";
import { query } from "../config/db.js";
import { config } from "../config/env.js";
import { sendAuditSummary } from "../mail/mail.service.js";
import { logger } from "../config/logger.js";

/**
 * Security-relevant action prefixes to include in summary
 */
const SECURITY_ACTIONS = [
  "login",
  "logout",
  "mfa",
  "session",
  "password",
  "auth",
  "user.created",
  "user.invited",
  "user.disabled",
  "user.deleted",
  "role",
  "permission",
  "client",
  "token",
  "billing",
  "org",
  "security",
];

/**
 * Roles that should receive audit summaries
 */
const RECIPIENT_ROLES = ["super_admin", "security_admin"];

interface AuditEvent {
  action: string;
  count: number;
  lastOccurred: string;
}

interface OrgSummary {
  orgId: string;
  orgName: string;
  events: AuditEvent[];
  totalEvents: number;
  securityAlerts: number;
}

/**
 * Get audit log summary for an organization
 */
async function getOrgAuditSummary(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<OrgSummary | null> {
  // Get organization name
  const orgResult = await query(
    `SELECT id, name FROM organizations WHERE id = $1`,
    [orgId]
  );

  if (!orgResult.rows.length) {
    return null;
  }

  const org = orgResult.rows[0];

  // Get top 10 audit events grouped by action
  const eventsResult = await query(
    `SELECT 
       action,
       COUNT(*) as count,
       MAX(created_at) as last_occurred
     FROM audit_logs
     WHERE org_id = $1
       AND created_at >= $2
       AND created_at < $3
     GROUP BY action
     ORDER BY count DESC
     LIMIT 10`,
    [orgId, startDate.toISOString(), endDate.toISOString()]
  );

  if (!eventsResult.rows.length) {
    return null; // No logs for this org
  }

  // Count security alerts (actions matching security patterns)
  const securityAlerts = eventsResult.rows.filter((row) =>
    SECURITY_ACTIONS.some((prefix) => row.action.toLowerCase().includes(prefix))
  ).length;

  // Get total event count
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs
     WHERE org_id = $1 AND created_at >= $2 AND created_at < $3`,
    [orgId, startDate.toISOString(), endDate.toISOString()]
  );

  return {
    orgId: org.id,
    orgName: org.name,
    events: eventsResult.rows.map((row) => ({
      action: formatActionName(row.action),
      count: parseInt(row.count, 10),
      lastOccurred: formatDate(row.last_occurred),
    })),
    totalEvents: parseInt(totalResult.rows[0].total, 10),
    securityAlerts,
  };
}

/**
 * Format action name for display
 */
function formatActionName(action: string): string {
  return action
    .split(/[._]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get admin users for an organization who should receive summaries
 */
async function getAdminRecipients(
  orgId: string
): Promise<Array<{ id: string; email: string; display_name: string }>> {
  const result = await query(
    `SELECT DISTINCT u.id, u.email, u.display_name
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE u.org_id = $1
       AND u.status = 'active'
       AND r.name = ANY($2::text[])`,
    [orgId, RECIPIENT_ROLES]
  );

  return result.rows as Array<{
    id: string;
    email: string;
    display_name: string;
  }>;
}

/**
 * Process audit summary for all organizations
 */
async function processAllOrganizations(): Promise<{
  processed: number;
  emailsSent: number;
}> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  logger.info(
    `Processing audit summaries for ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  // Get all active organizations
  const orgsResult = await query(
    `SELECT DISTINCT org_id FROM audit_logs
     WHERE created_at >= $1 AND created_at < $2`,
    [startDate.toISOString(), endDate.toISOString()]
  );

  let processed = 0;
  let emailsSent = 0;

  for (const row of orgsResult.rows) {
    try {
      const summary = await getOrgAuditSummary(row.org_id, startDate, endDate);

      if (!summary) {
        continue; // Skip orgs with no events
      }

      // Get admin recipients
      const recipients = await getAdminRecipients(row.org_id);

      if (!recipients.length) {
        logger.warn(`No admin recipients for org ${row.org_id}`);
        continue;
      }

      // Send email to each recipient
      for (const recipient of recipients) {
        try {
          await sendAuditSummary(
            {
              recipientName: recipient.display_name || recipient.email,
              organizationName: summary.orgName,
              dateRange: {
                start: startDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                end: endDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              },
              topEvents: summary.events,
              totalEvents: summary.totalEvents,
              securityAlerts: summary.securityAlerts,
              dashboardLink: `${config.frontendUrl}/dashboard/logs`,
            },
            recipient.email,
            row.org_id,
            recipient.id
          );
          emailsSent++;
        } catch (emailError) {
          logger.error(`Failed to send audit summary to ${recipient.email}`, {
            error: emailError,
          });
        }
      }

      processed++;
    } catch (error) {
      logger.error(`Error processing org ${row.org_id}`, { error });
    }
  }

  return { processed, emailsSent };
}

/**
 * Run the audit summary job manually
 */
export async function runAuditSummaryJob(): Promise<void> {
  logger.info("Starting weekly audit summary job...");
  const startTime = Date.now();

  try {
    const { processed, emailsSent } = await processAllOrganizations();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info(
      `Audit summary job completed: ${processed} orgs processed, ${emailsSent} emails sent (${duration}s)`
    );
  } catch (error) {
    logger.error("Audit summary job failed", { error });
  }
}

/**
 * Schedule the audit summary job
 * Default: Every Sunday at 9:00 AM
 */
export function scheduleAuditSummaryJob(
  cronExpression: string = "0 9 * * 0"
): ScheduledTask {
  logger.info(`Scheduling audit summary job: ${cronExpression}`);

  const task = cron.schedule(cronExpression, () => {
    runAuditSummaryJob();
  });

  return task;
}
