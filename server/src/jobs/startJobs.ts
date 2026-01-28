/**
 * Job Orchestrator
 *
 * Initializes and manages all scheduled background jobs
 */
import cron, { type ScheduledTask } from "node-cron";
import {
  scheduleAuditSummaryJob,
  runAuditSummaryJob,
} from "./auditSummary.job.js";
import { processRetryQueue } from "../mail/mail.service.js";
import { verifyConnection } from "../mail/mailer.js";
import { logger } from "../config/logger.js";

/**
 * Active scheduled tasks for graceful shutdown
 */
const scheduledTasks: ScheduledTask[] = [];

/**
 * Email retry job - runs every 5 minutes
 */
function scheduleEmailRetryJob(): ScheduledTask {
  logger.info("Scheduling email retry job: every 5 minutes");

  const task = cron.schedule("*/5 * * * *", async () => {
    logger.debug("Running email retry job...");
    try {
      const processed = await processRetryQueue();
      if (processed > 0) {
        logger.info(`Email retry job: processed ${processed} emails`);
      }
    } catch (error) {
      logger.error("Email retry job failed", { error });
    }
  });

  return task;
}

/**
 * Initialize all background jobs
 */
export async function startJobs(): Promise<void> {
  logger.info("Starting background jobs...");

  // Verify email connection first
  await verifyConnection();

  // Schedule audit summary job (every Sunday at 9 AM)
  const auditTask = scheduleAuditSummaryJob("0 9 * * 0");
  scheduledTasks.push(auditTask);

  // Schedule email retry job (every 5 minutes)
  const retryTask = scheduleEmailRetryJob();
  scheduledTasks.push(retryTask);

  logger.info(`${scheduledTasks.length} background jobs scheduled`);
}

/**
 * Stop all scheduled jobs
 */
export function stopJobs(): void {
  logger.info("Stopping background jobs...");

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks.length = 0;
  logger.info("All background jobs stopped");
}

/**
 * Run a specific job manually (for testing/CLI)
 */
export async function runJobManually(jobName: string): Promise<void> {
  switch (jobName) {
    case "audit-summary":
      await runAuditSummaryJob();
      break;
    case "email-retry":
      await processRetryQueue();
      break;
    default:
      logger.error(`Unknown job: ${jobName}`);
      logger.info("Available jobs: audit-summary, email-retry");
  }
}

/**
 * Get job status
 */
export function getJobStatus(): Array<{ name: string; active: boolean }> {
  return [
    { name: "audit-summary", active: scheduledTasks.length > 0 },
    { name: "email-retry", active: scheduledTasks.length > 0 },
  ];
}
