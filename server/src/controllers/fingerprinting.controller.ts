/**
 * Fingerprinting Controller
 *
 * Handles device fingerprinting and risk analysis business logic
 */
import type { Request, Response } from "express";
import { query } from "../config/db.js";

// Default fingerprinting settings
const DEFAULT_SETTINGS = {
  deviceFingerprint: true,
  browserFingerprint: true,
  ipRiskAnalysis: true,
  geoVelocity: false,
  deviceBinding: false,
};

/**
 * GET /fingerprinting/settings - Get organization fingerprinting settings
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(`SELECT meta FROM organizations WHERE id = $1`, [
      req.user?.org_id,
    ]);

    const meta = result.rows[0]?.meta || {};
    const settings = meta.fingerprintSettings || DEFAULT_SETTINGS;

    res.json({ settings });
  } catch (error) {
    console.error("GET /fingerprinting/settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}

/**
 * PATCH /fingerprinting/settings - Update fingerprinting settings
 */
export async function updateSettings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { settings } = req.body;

    // Get current meta
    const orgResult = await query(
      `SELECT meta FROM organizations WHERE id = $1`,
      [req.user?.org_id]
    );

    const currentMeta = orgResult.rows[0]?.meta || {};
    const updatedMeta = {
      ...currentMeta,
      fingerprintSettings: {
        ...DEFAULT_SETTINGS,
        ...settings,
      },
    };

    await query(`UPDATE organizations SET meta = $1 WHERE id = $2`, [
      JSON.stringify(updatedMeta),
      req.user?.org_id,
    ]);

    res.json({ settings: updatedMeta.fingerprintSettings });
  } catch (error) {
    console.error("PATCH /fingerprinting/settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

/**
 * GET /fingerprinting/devices - List trusted devices for the organization
 */
export async function getDevices(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT 
        d.id,
        d.user_id,
        u.email as user_email,
        u.display_name as user_name,
        d.fingerprint_hash,
        d.last_seen_ip,
        d.last_seen_at,
        d.risk_score,
        d.created_at
       FROM devices d
       JOIN users u ON d.user_id = u.id
       WHERE u.org_id = $1
       ORDER BY d.last_seen_at DESC
       LIMIT 100`,
      [req.user?.org_id]
    );

    res.json({
      devices: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        fingerprintHash: row.fingerprint_hash,
        lastSeenIp: row.last_seen_ip,
        lastSeenAt: row.last_seen_at,
        riskScore: parseFloat(row.risk_score) || 0,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /fingerprinting/devices error:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
}

/**
 * GET /fingerprinting/risk-events - List recent risk events
 */
export async function getRiskEvents(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await query(
      `SELECT 
        r.id,
        r.user_id,
        u.email as user_email,
        u.display_name as user_name,
        r.event_type,
        r.features,
        r.risk_score,
        r.decision,
        r.created_at
       FROM risk_events r
       JOIN users u ON r.user_id = u.id
       WHERE u.org_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.user?.org_id]
    );

    res.json({
      riskEvents: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        eventType: row.event_type,
        features: row.features,
        riskScore: parseFloat(row.risk_score) || 0,
        decision: row.decision,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /fingerprinting/risk-events error:", error);
    res.status(500).json({ error: "Failed to fetch risk events" });
  }
}

/**
 * GET /fingerprinting/stats - Get aggregated fingerprinting stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    // Get device count
    const devicesResult = await query(
      `SELECT COUNT(*) as count FROM devices d
       JOIN users u ON d.user_id = u.id
       WHERE u.org_id = $1`,
      [req.user?.org_id]
    );

    // Get risk event counts by severity
    const riskResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE risk_score <= 0.3) as low_risk,
        COUNT(*) FILTER (WHERE risk_score > 0.3 AND risk_score <= 0.7) as medium_risk,
        COUNT(*) FILTER (WHERE risk_score > 0.7) as high_risk,
        COUNT(*) FILTER (WHERE decision = 'blocked') as blocked
       FROM risk_events r
       JOIN users u ON r.user_id = u.id
       WHERE u.org_id = $1 AND r.created_at > NOW() - INTERVAL '30 days'`,
      [req.user?.org_id]
    );

    res.json({
      stats: {
        trustedDevices: parseInt(devicesResult.rows[0]?.count) || 0,
        lowRiskEvents: parseInt(riskResult.rows[0]?.low_risk) || 0,
        mediumRiskEvents: parseInt(riskResult.rows[0]?.medium_risk) || 0,
        highRiskEvents: parseInt(riskResult.rows[0]?.high_risk) || 0,
        blockedAttempts: parseInt(riskResult.rows[0]?.blocked) || 0,
      },
    });
  } catch (error) {
    console.error("GET /fingerprinting/stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}
