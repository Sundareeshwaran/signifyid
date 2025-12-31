/**
 * Express Application Setup
 *
 * Signify iD Backend API - Vercel Serverless Compatible
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import { corsOriginChecker } from "./services/cors.service.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import clientRoutes from "./routes/clients.js";
import oauthRoutes from "./routes/oauth.js";
import mfaRoutes from "./routes/mfa.js";
import sessionsRoutes from "./routes/sessions.js";
import logsRoutes from "./routes/logs.js";
import fingerprintingRoutes from "./routes/fingerprinting.js";
import dashboardRoutes from "./routes/dashboard.js";
import rolesRoutes from "./routes/roles.js";
import analyticsRoutes from "./routes/analytics.js";
import settingsRoutes from "./routes/settings.js";
import organizationsRoutes from "./routes/organizations.js";
import clientAuthRoutes from "./routes/clientAuth.js";
import exportRoutes from "./routes/export.js";
import securityRoutes from "./routes/security.js";
import workflowsRoutes from "./routes/workflows.js";
import billingRoutes from "./routes/billing.js";
import { supportRouter } from "./routes/support.js";

import * as oauthController from "./controllers/oauth.controller.js";
import { errorHandler } from "./middleware/error.middleware.js";
import type { Application } from "express";

const app: Application = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware - enhanced configuration
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", config.frontendUrl],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.nodeEnv === "production" ? [] : null,
      },
    },
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Additional security headers
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    xssFilter: true,
  })
);

// CORS - Dynamic origins from database
app.use(
  cors({
    origin: corsOriginChecker,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api/", limiter);

// Stricter rate limit for auth endpoints (relaxed in dev mode)
const authLimiter = rateLimit({
  windowMs: config.nodeEnv === "development" ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: config.nodeEnv === "development" ? 100 : 10,
  message: { error: "Too many authentication attempts" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Raw body parsing for Stripe webhooks (must be before json parsing)
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parsing
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/mfa", mfaRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/fingerprinting", fingerprintingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/client-auth", clientAuthRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/workflows", workflowsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/support", supportRouter);

// OIDC Discovery endpoints (outside /api prefix)
app.get(
  "/.well-known/openid-configuration",
  oauthController.openidConfiguration
);

// 404 handler
app.use("/api/{*splat}", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(errorHandler);

export default app;
