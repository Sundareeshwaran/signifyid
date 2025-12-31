/**
 * Audit Summary Cron Job - Vercel Cron Handler
 *
 * Sends weekly audit summary reports to org admins
 * Schedule: Sundays at 9 AM
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runAuditSummaryJob } from "../../src/jobs/auditSummary.job";
import { logger } from "../../src/config/logger";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (Vercel sets this automatically for cron calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.error("Unauthorized cron request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    logger.info("Running audit summary cron job...");
    await runAuditSummaryJob();
    logger.info("Audit summary job completed");

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Audit summary cron failed", { error });
    return res.status(500).json({
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
