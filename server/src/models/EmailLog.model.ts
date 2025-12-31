/**
 * Email Log Model
 *
 * Data access layer for email log operations
 * Handles logging, idempotency checks, and retry management
 */
import { query } from "../config/db.js";
import type {
  EmailLogEntry,
  EmailType,
  EmailStatus,
} from "../mail/mail.types.js";

/**
 * Create a new email log entry
 */
export async function create(data: {
  orgId: string;
  userId?: string | null;
  emailType: EmailType;
  recipient: string;
  subject?: string;
  status?: EmailStatus;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<EmailLogEntry> {
  const result = await query(
    `INSERT INTO email_logs (
      org_id, user_id, email_type, recipient, subject, 
      status, idempotency_key, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.orgId,
      data.userId || null,
      data.emailType,
      data.recipient,
      data.subject || null,
      data.status || "pending",
      data.idempotencyKey || null,
      data.metadata || {},
    ]
  );
  return result.rows[0] as EmailLogEntry;
}

/**
 * Update email log status
 */
export async function updateStatus(
  id: string,
  status: EmailStatus,
  errorMessage?: string
): Promise<void> {
  const updates: string[] = ["status = $2"];
  const params: (string | Date | null)[] = [id, status];

  if (status === "sent") {
    updates.push("sent_at = NOW()");
  }

  if (errorMessage) {
    updates.push(`error_message = $${params.length + 1}`);
    params.push(errorMessage);
  }

  if (status === "retrying") {
    updates.push("retry_count = retry_count + 1");
  }

  await query(
    `UPDATE email_logs SET ${updates.join(", ")} WHERE id = $1`,
    params
  );
}

/**
 * Find email log by idempotency key
 * Used to prevent duplicate sends
 */
export async function findByIdempotencyKey(
  key: string
): Promise<EmailLogEntry | null> {
  const result = await query(
    `SELECT * FROM email_logs WHERE idempotency_key = $1`,
    [key]
  );
  return (result.rows[0] as EmailLogEntry) || null;
}

/**
 * Get pending emails for retry
 * Returns failed emails that haven't exceeded max retries
 */
export async function getPendingRetries(
  maxRetries: number = 3
): Promise<EmailLogEntry[]> {
  const result = await query(
    `SELECT * FROM email_logs 
     WHERE status = 'failed' 
       AND retry_count < $1
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at ASC
     LIMIT 50`,
    [maxRetries]
  );
  return result.rows as EmailLogEntry[];
}

/**
 * Get recent email count for rate limiting
 */
export async function getRecentCountByOrg(
  orgId: string,
  intervalHours: number = 1
): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM email_logs 
     WHERE org_id = $1 
       AND created_at > NOW() - INTERVAL '${intervalHours} hours'`,
    [orgId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get email logs for an organization
 */
export async function listByOrg(
  orgId: string,
  options: { limit?: number; offset?: number; emailType?: EmailType } = {}
): Promise<{ logs: EmailLogEntry[]; total: number }> {
  const { limit = 50, offset = 0, emailType } = options;

  let whereClause = "WHERE org_id = $1";
  const params: (string | number)[] = [orgId];

  if (emailType) {
    whereClause += ` AND email_type = $${params.length + 1}`;
    params.push(emailType);
  }

  const countResult = await query(
    `SELECT COUNT(*) as count FROM email_logs ${whereClause}`,
    params
  );

  const result = await query(
    `SELECT * FROM email_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    logs: result.rows as EmailLogEntry[],
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Mark email as permanently failed (exceeded retries)
 */
export async function markPermanentlyFailed(
  id: string,
  errorMessage: string
): Promise<void> {
  await query(
    `UPDATE email_logs 
     SET status = 'failed', 
         error_message = $2
     WHERE id = $1`,
    [id, `PERMANENT: ${errorMessage}`]
  );
}

/**
 * Get email statistics for an organization
 */
export async function getStatsByOrg(
  orgId: string,
  days: number = 30
): Promise<{
  total: number;
  sent: number;
  failed: number;
  byType: Record<string, number>;
}> {
  const result = await query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'sent') as sent,
       COUNT(*) FILTER (WHERE status = 'failed') as failed,
       email_type,
       COUNT(*) FILTER (WHERE status = 'sent') as type_count
     FROM email_logs
     WHERE org_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY email_type`,
    [orgId]
  );

  const stats = {
    total: 0,
    sent: 0,
    failed: 0,
    byType: {} as Record<string, number>,
  };

  for (const row of result.rows) {
    stats.total += parseInt(row.total, 10);
    stats.sent += parseInt(row.sent, 10);
    stats.failed += parseInt(row.failed, 10);
    stats.byType[row.email_type] = parseInt(row.type_count, 10);
  }

  return stats;
}
