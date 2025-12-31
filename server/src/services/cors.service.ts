/**
 * CORS Configuration Service
 *
 * Dynamically loads allowed CORS origins from database (client redirect URIs)
 * and caches them to avoid hitting the database on every request
 */
import { query } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

// Cache for allowed origins
let allowedOriginsCache: string[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all client redirect URIs from the database
 */
async function loadAllowedOrigins(): Promise<string[]> {
  try {
    const result = await query(
      `SELECT DISTINCT unnest(redirect_uris) as origin 
       FROM clients 
       WHERE (is_active = TRUE OR is_active IS NULL)
       AND status = 'active'`
    );

    // Extract unique origins from redirect URIs
    const origins = new Set<string>();

    // Always include the frontend URL
    origins.add(config.frontendUrl);

    // Add all client redirect URIs
    result.rows.forEach((row) => {
      if (row.origin) {
        try {
          const url = new URL(row.origin);
          // Add full origin (protocol + hostname + port)
          origins.add(url.origin);
        } catch (e) {
          // Invalid URL, skip it
          logger.warn(`Invalid redirect URI found in database: ${row.origin}`);
        }
      }
    });

    return Array.from(origins);
  } catch (error) {
    logger.error("Error loading CORS origins from database", { error });
    // Return default origins on error
    return [config.frontendUrl];
  }
}

/**
 * Get allowed origins with caching
 */
export async function getAllowedOrigins(): Promise<string[]> {
  const now = Date.now();

  // Return cached origins if cache is still valid
  if (allowedOriginsCache.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
    return allowedOriginsCache;
  }

  // Reload origins from database
  allowedOriginsCache = await loadAllowedOrigins();
  lastCacheUpdate = now;

  console.log(
    `📋 Loaded ${allowedOriginsCache.length} CORS origins from database`
  );
  return allowedOriginsCache;
}

/**
 * Invalidate the cache (call this when clients are created/updated/deleted)
 */
export function invalidateCorsCache(): void {
  allowedOriginsCache = [];
  lastCacheUpdate = 0;
  logger.info("CORS cache invalidated");
}

/**
 * CORS origin checker function
 * Can be passed directly to cors() middleware
 */
export async function corsOriginChecker(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): Promise<void> {
  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowedOrigins = await getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    logger.warn(`CORS request from unauthorized origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  }
}
