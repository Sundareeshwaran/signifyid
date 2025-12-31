/**
 * Validation Middleware
 *
 * Zod schema validation for request body
 */
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Validate request body against a Zod schema
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return;
    }

    // Replace body with parsed data (includes defaults and transforms)
    req.body = result.data;
    next();
  };
}

// Common validation schemas
export const schemas = {
  register: z.object({
    organizationName: z.string().min(2).max(100),
    domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    name: z.string().min(2).max(100),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),

  createUser: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2).max(100),
    role_ids: z.array(z.string().uuid()).optional(),
  }),

  updateUser: z.object({
    displayName: z.string().min(2).max(100).optional(),
    status: z.enum(["active", "disabled", "invited"]).optional(),
    role_ids: z.array(z.string().uuid()).optional(),
  }),

  assignRoles: z.object({
    role_ids: z
      .array(z.string().uuid())
      .min(1, "At least one role is required"),
  }),

  disableUser: z.object({}).optional(),

  createClient: z.object({
    name: z.string().min(2).max(100).optional(),
    redirectUris: z.array(z.string().url()),
    scopes: z.array(z.string()).default(["openid"]),
    allowedDomains: z.array(z.string()).optional(),
    projectType: z.enum(["website", "api", "internal"]).optional(),
  }),

  mfaVerify: z.object({
    code: z.string().length(6).regex(/^\d+$/),
  }),

  inviteUser: z.object({
    email: z.string().email(),
    displayName: z.string().min(2).max(100),
    role_ids: z.array(z.string().uuid()).optional(),
  }),

  activateUser: z.object({
    userId: z.string().uuid(),
    password: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
  }),

  acceptInvite: z.object({
    token: z.string().min(32).max(64),
    password: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
  }),

  updateProfile: z.object({
    displayName: z.string().min(2).max(100).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      )
      .optional(),
  }),
};
