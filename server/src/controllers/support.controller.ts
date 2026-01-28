/**
 * Support Controller
 *
 * Handles support and sales inquiries
 */
import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/error.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import * as MailService from "../mail/mail.service.js";
import { logger } from "../config/logger.js"; // Assessing you have a logger config

// Validation schemas
const ContactSalesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  organizationName: z.string().optional(),
});

/**
 * Handle contact sales form submission
 */
export const contactSales = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate Input
    const result = ContactSalesSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError("Invalid input", 400); // Or use a validation error helper if you have one
    }
    const data = result.data;

    // 2. Get Context from Auth Middleware (if authenticated)
    // Use intersection type to avoid conflict with global Request.user type
    type AuthenticatedRequest = Request & {
      user?: { id: string; [key: string]: any };
      orgId?: string;
    };
    const authReq = req as AuthenticatedRequest;

    const userId = authReq.user?.id || undefined;
    // Use "OUD Loud" org ID as the system fallback for contact form inquiries
    const orgId = authReq.orgId || "508e95a0-c7c8-4751-af7a-0d316cbadce7";

    // 3. Send Email
    const emailResult = await MailService.sendContactSalesInquiry(
      {
        senderName: data.name,
        senderEmail: data.email,
        subject: data.subject,
        message: data.message,
        organizationName: data.organizationName,
      },
      orgId,
      userId
    );

    if (!emailResult.success) {
      logger.error("Failed to send sales inquiry email", {
        error: emailResult,
      });
      // emailResult.error is optional string
      throw new AppError(
        `Failed to send inquiry: ${emailResult.error || "Unknown error"}`,
        500
      );
    }

    // 4. Respond
    res.status(200).json({
      success: true,
      message: "Your inquiry has been sent. Our team will contact you shortly.",
    });
  }
);
