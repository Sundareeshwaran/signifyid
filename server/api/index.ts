/**
 * Vercel Serverless Handler
 *
 * Exports the Express app for Vercel Functions with CORS handling
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app.js";
import { getAllowedOrigins } from "../src/services/cors.service.js";

// Handle Vercel requests with explicit CORS for preflight
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the requesting origin
  const requestOrigin = req.headers.origin || "";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  // Get allowed origins from database (cached)
  let isAllowedOrigin = false;

  try {
    const allowedOrigins = await getAllowedOrigins();
    isAllowedOrigin =
      allowedOrigins.includes(requestOrigin) ||
      requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:");
  } catch {
    // Fallback: allow frontend URL and localhost on database error
    isAllowedOrigin =
      requestOrigin === frontendUrl ||
      requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:");
  }

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
