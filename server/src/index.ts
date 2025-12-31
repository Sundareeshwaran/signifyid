/**
 * Express Server Entry Point
 *
 * Signify iD Backend API - Traditional Server Mode
 * For local development and non-serverless deployments
 */
import app from "./app.js";
import { config } from "./config/env.js";
import { pool } from "./config/db.js";
import { logger } from "./config/logger.js";
import {
  initRedis,
  disconnectRedis,
  isRedisConnected,
} from "./config/redis.js";
// Initialize Prisma (for status logs and Optimize setup)
import "./config/prisma.js";
// Background jobs (email, audit summaries)
import { startJobs, stopJobs } from "./jobs/startJobs.js";
import { closeTransporter } from "./mail/mailer.js";

const PORT = config.port;

async function start() {
  try {
    // Test database connection
    await pool.query("SELECT NOW()");
    logger.info("Database connected");

    // Initialize Redis
    await initRedis();
    logger.info(
      `Redis: ${
        isRedisConnected() ? "connected" : "not configured or unavailable"
      }`
    );

    // Start background jobs (email retry, audit summary)
    await startJobs();

    app.listen(PORT, () => {
      logger.info(`Signify iD API Server v1.0.0
      ----------------------------------
      📍 Port: ${PORT}
      🌍 Environment: ${config.nodeEnv}
      🔗 Frontend: ${config.frontendUrl}
      📦 Redis: ${isRedisConnected() ? "enabled" : "disabled"}
      ----------------------------------`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  stopJobs();
  closeTransporter();
  await disconnectRedis();
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  stopJobs();
  closeTransporter();
  await disconnectRedis();
  await pool.end();
  process.exit(0);
});

start();
