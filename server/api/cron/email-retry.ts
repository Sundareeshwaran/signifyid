/**
 * Email Retry Cron Job - Vercel Cron Handler
 *
 * Processes failed emails from the retry queue
 * Schedule: Daily at 6 AM
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processRetryQueue } from "../../src/mail/mail.service";
import { logger } from "../../src/config/logger";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (Vercel sets this automatically for cron calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.error("Unauthorized cron request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    logger.info("Running email retry cron job...");
    const processed = await processRetryQueue();
    logger.info(`Email retry: processed ${processed} emails`);

    return res.status(200).json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Email retry cron failed", { error });
    return res.status(500).json({
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
