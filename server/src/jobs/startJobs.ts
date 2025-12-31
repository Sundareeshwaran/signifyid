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

/**
 * Active scheduled tasks for graceful shutdown
 */
const scheduledTasks: ScheduledTask[] = [];

/**
 * Email retry job - runs every 5 minutes
 */
function scheduleEmailRetryJob(): ScheduledTask {
  console.log("📅 Scheduling email retry job: every 5 minutes");

  const task = cron.schedule("*/5 * * * *", async () => {
    console.log("🔄 Running email retry job...");
    try {
      const processed = await processRetryQueue();
      if (processed > 0) {
        console.log(`✅ Email retry job: processed ${processed} emails`);
      }
    } catch (error) {
      console.error("❌ Email retry job failed:", error);
    }
  });

  return task;
}

/**
 * Initialize all background jobs
 */
export async function startJobs(): Promise<void> {
  console.log("\n🚀 Starting background jobs...");

  // Verify email connection first
  await verifyConnection();

  // Schedule audit summary job (every Sunday at 9 AM)
  const auditTask = scheduleAuditSummaryJob("0 9 * * 0");
  scheduledTasks.push(auditTask);

  // Schedule email retry job (every 5 minutes)
  const retryTask = scheduleEmailRetryJob();
  scheduledTasks.push(retryTask);

  console.log(`✅ ${scheduledTasks.length} background jobs scheduled\n`);
}

/**
 * Stop all scheduled jobs
 */
export function stopJobs(): void {
  console.log("🛑 Stopping background jobs...");

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks.length = 0;
  console.log("✅ All background jobs stopped");
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
      console.error(`Unknown job: ${jobName}`);
      console.log("Available jobs: audit-summary, email-retry");
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
