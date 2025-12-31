/**
 * AuditLog Model
 * 
 * Data access layer for audit log operations
 */
import { query } from '../config/db.js';

/**
 * Create audit log entry
 */
export async function create(
  orgId: string,
  userId: string | null,
  action: string,
  meta?: Record<string, any>
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (org_id, user_id, action, meta) VALUES ($1, $2, $3, $4)`,
    [orgId, userId, action, meta || null]
  );
}
