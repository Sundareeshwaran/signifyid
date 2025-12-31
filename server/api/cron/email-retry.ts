/**
 * Email Retry Cron Job - Vercel Cron Handler
 *
 * Processes failed emails from the retry queue
 * Schedule: Daily at 6 AM
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processRetryQueue } from "../../src/mail/mail.service";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (Vercel sets this automatically for cron calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("Unauthorized cron request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("🔄 Running email retry cron job...");
    const processed = await processRetryQueue();
    console.log(`✅ Email retry: processed ${processed} emails`);

    return res.status(200).json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Email retry cron failed:", error);
    return res.status(500).json({
      error: "Cron job failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
