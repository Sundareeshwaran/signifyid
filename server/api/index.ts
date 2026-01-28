/**
 * Vercel Serverless Handler
 *
 * Exports the Express app for Vercel Functions with CORS handling
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app.js";

/**
 * Handles incoming Vercel requests with explicit CORS handling and forwards non-preflight requests to the Express app.
 *
 * Sets CORS response headers based on the request Origin (allowing the configured frontend URL or localhost origins).
 * Responds to preflight OPTIONS requests with a 204 No Content and an empty body; all other requests are passed through to the Express app.
 *
 * @returns The HTTP response sent to the client: for OPTIONS requests, a 204 No Content with an empty body; for other requests, the response produced by the Express app.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Get the requesting origin
  const requestOrigin = req.headers.origin || "";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  // Define allowed origins - production URL and localhost for development
  const isAllowedOrigin =
    requestOrigin === frontendUrl ||
    requestOrigin.startsWith("http://localhost:") ||
    requestOrigin.startsWith("http://127.0.0.1:");

  // Set CORS headers - use requesting origin if allowed, otherwise use frontend URL
  const allowedOrigin = isAllowedOrigin ? requestOrigin : frontendUrl;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // Pass to Express app
  return app(req, res);
}