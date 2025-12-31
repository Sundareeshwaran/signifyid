/**
 * Logs Controller
 *
 * Handles audit log retrieval business logic
 */
import type { Request, Response } from "express";
import { query } from "../config/db.js";

/**
 * GET /logs - List audit logs for the organization (paginated)
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const [logsResult, countResult] = await Promise.all([
      query(
        `SELECT 
          al.id,
          al.action,
          al.meta,
          al.created_at,
          u.email as user_email,
          u.display_name as user_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.org_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user?.org_id, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM audit_logs WHERE org_id = $1`, [
        req.user?.org_id,
      ]),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: logsResult.rows.map((row) => ({
        id: row.id,
        action: row.action,
        meta: row.meta,
        createdAt: row.created_at,
        userEmail: row.user_email,
        userName: row.user_name,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /logs error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
}
