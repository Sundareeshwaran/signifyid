/**
 * Nodemailer Configuration
 *
 * Configures and exports the mail transporter with:
 * - SMTP transport with connection pooling
 * - TLS enabled
 * - Handlebars template compilation
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import Handlebars from "handlebars";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template cache to avoid re-reading files
 */
const templateCache = new Map<
  string,
  Handlebars.TemplateDelegate<Record<string, unknown>>
>();

/**
 * Create the mail transporter with connection pooling
 */
function createTransporter(): Transporter {
  const mailConfig = config.mail;

  // Skip if no SMTP configured
  if (!mailConfig.host || !mailConfig.user) {
    logger.warn("SMTP not configured - emails will be logged only");
    // Return a mock transporter for development
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        logger.debug("Email would be sent (DEV mode)", {
          // Sanitized by logger automatically
          to: options.to,
          subject: options.subject,
        });
        return { messageId: `dev-${Date.now()}` };
      },
      verify: async () => true,
      close: () => {},
    } as unknown as Transporter;
  }

  return nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure, // true for 465, false for other ports
    auth: {
      user: mailConfig.user,
      pass: mailConfig.pass,
    },
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // Rate limit: 1 second between messages
    rateLimit: 10, // Max 10 messages per rateDelta
    tls: {
      rejectUnauthorized: true, // Verify certificates
    },
  });
}

/**
 * Mail transporter singleton
 */
export const transporter = createTransporter();

/**
 * Register Handlebars helpers
 */
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("formatDate", (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});
Handlebars.registerHelper(
  "formatCurrency",
  (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100); // Stripe amounts are in cents
  }
);

/**
 * Get the default sender address
 */
export function getDefaultFrom(): string {
  const mailConfig = config.mail;
  return `"${mailConfig.fromName}" <${mailConfig.from}>`;
}

/**
 * Compile a Handlebars template from file
 */
export function compileTemplate(
  templateName: string
): Handlebars.TemplateDelegate<Record<string, unknown>> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatePath = join(__dirname, "templates", `${templateName}.hbs`);

  if (!existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  const templateSource = readFileSync(templatePath, "utf-8");
  const compiled = Handlebars.compile(templateSource);

  // Cache the compiled template
  templateCache.set(templateName, compiled);

  return compiled;
}

/**
 * Render a template with data
 */
export function renderTemplate(
  templateName: string,
  data: Record<string, unknown>
): string {
  const template = compileTemplate(templateName);
  return template(data);
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Verify SMTP connection
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info("SMTP connection verified");
    return true;
  } catch (error) {
    logger.error("SMTP connection failed", { error });
    return false;
  }
}

/**
 * Close the transporter connection pool
 */
export function closeTransporter(): void {
  transporter.close();
}
