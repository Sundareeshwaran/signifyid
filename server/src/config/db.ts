/**
 * PostgreSQL Database Connection
 *
 * Uses pg Pool for connection pooling.
 * Configured for Neon serverless PostgreSQL with SSL.
 */
import pg from "pg";
import { config } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pg;

// Determine if we need SSL (Neon requires it)
const isNeonConnection = config.databaseUrl.includes(".neon.tech");

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Neon requires SSL; local dev typically doesn't
  ssl: isNeonConnection ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on("connect", () => {
  const connType = isNeonConnection ? "Neon" : "Local";
  logger.info(`Connected to ${connType} PostgreSQL database`);
});

pool.on("error", (err) => {
  logger.error("Unexpected database error", { error: err });
  process.exit(-1);
});

/**
 * Execute a query with parameters
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (config.nodeEnv === "development") {
    logger.debug("Query", {
      text: text.slice(0, 50),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
  }

  return result;
}

/**
 * Get a client for transactions
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Execute a query with RLS context pre-set.
 * This sets the session variables before running the query.
 *
 * @param text - SQL query text
 * @param params - Query parameters
 * @param orgId - Organization UUID for RLS context
 * @param userId - User UUID for RLS context
 */
export async function queryWithRLS<
  T extends pg.QueryResultRow = pg.QueryResultRow
>(
  text: string,
  params: unknown[] = [],
  orgId: string,
  userId: string
): Promise<pg.QueryResult<T>> {
  const client = await pool.connect();
  const start = Date.now();

  try {
    // Set RLS context for this connection
    await client.query(
      `SELECT set_config('app.current_org_id', $1, true),
              set_config('app.current_user_id', $2, true)`,
      [orgId, userId]
    );

    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;

    if (config.nodeEnv === "development") {
      logger.debug("RLS Query", {
        text: text.slice(0, 50),
        duration: `${duration}ms`,
        rows: result.rowCount,
        org: orgId.slice(0, 8) + "...",
      });
    }

    return result;
  } finally {
    client.release();
  }
}
