/**
 * Environment Configuration
 *
 * Loads and validates environment variables
 */
import "dotenv/config";

export const config = {
  // Server
  port: parseInt(process.env.PORT || "5000"),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Database
  databaseUrl: process.env.DIRECT_DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "1h",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
    resetPasswordExpires: process.env.JWT_RESET_PASSWORD_EXPIRES || "10m",
    verifyEmailExpires: process.env.JWT_VERIFY_EMAIL_EXPIRES || "10m",
    algorithm: process.env.JWT_ALGORITHM || "HS256",
  },

  // Cookies
  cookie: {
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: (process.env.COOKIE_SAMESITE || "Lax") as
      | "Lax"
      | "Strict"
      | "None",
    accessExpires: parseInt(process.env.COOKIE_ACCESS_EXPIRES || "900000"),
    refreshExpires: parseInt(process.env.COOKIE_REFRESH_EXPIRES || "604800000"),
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || "",
    keyPrefix: process.env.REDIS_KEY_PREFIX || "signifyid:",
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback",
  },

  // SSO
  sso: {
    callbackUrl:
      process.env.SSO_CALLBACK_URL ||
      "http://localhost:5000/api/auth/sso/callback",
  },

  // Stripe
  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY || "").trim(),
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || "").trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || "").trim(),
    starterPriceId: (process.env.STRIPE_STARTER_PRICE_ID || "").trim(),
    professionalPriceId: (
      process.env.STRIPE_PROFESSIONAL_PRICE_ID || ""
    ).trim(),
  },

  // Mail (SMTP)
  mail: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@signifyid.com",
    fromName: process.env.SMTP_FROM_NAME || "Signify iD",
  },

  // WebAuthn/Passkeys
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID || "localhost",
    origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:3000",
  },

  // Computed
  isProduction: process.env.NODE_ENV === "production",
};

// Validate required env vars
const required = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Production security validations
if (config.nodeEnv === "production") {
  // Cookie security validation
  if (!config.cookie.secure) {
    console.warn(
      "⚠️ SECURITY WARNING: Cookie secure flag is disabled in production!",
    );
  }
  if (config.cookie.sameSite === "None" && !config.cookie.secure) {
    throw new Error(
      "SECURITY ERROR: SameSite=None requires Secure cookies in production",
    );
  }
  // JWT secret length validation
  if (config.jwt.secret.length < 32) {
    console.warn(
      "⚠️ SECURITY WARNING: JWT secret should be at least 32 characters",
    );
  }
}
