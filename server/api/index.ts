/**
 * Vercel Serverless Handler
 *
 * Exports the Express app for Vercel Functions with CORS handling
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app.js";

// Handle Vercel requests with explicit CORS for preflight
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Get allowed origin from environment
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // Pass to Express app
  return app(req, res);
}
