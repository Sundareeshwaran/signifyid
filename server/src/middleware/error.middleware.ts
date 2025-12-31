/**
 * Error Handling Middleware
 *
 * Centralized error handling for the application with special support
 * for missing controller errors and standardized HTTP error responses
 */
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Custom error for missing controller implementations
 */
export class ControllerNotImplementedError extends Error {
  status: number;
  code: string;

  constructor(message: string = "Controller not implemented for this route") {
    super(message);
    this.name = "ControllerNotImplementedError";
    this.status = 501;
    this.code = "CONTROLLER_NOT_IMPLEMENTED";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error for application-level errors with HTTP status codes
 */
export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Global error handler middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 if no status is set
  const status = err.status || err.statusCode || 500;
  const isProduction = config.nodeEnv === "production";

  // Production-safe error response
  // Never expose internal error details, stack traces, or system info
  const response: ErrorResponse = isProduction
    ? {
        error: "Error",
        message:
          status >= 500
            ? "An error occurred. Please try again."
            : err.message || "Request failed",
      }
    : {
        error: err.name || "ServerError",
        message: err.message || "Internal server error",
        // Add error code in development only
        ...(err.code && { code: err.code }),
        // Include stack trace in development mode only
        ...(err.stack && { stack: err.stack }),
      };

  // Log error for server-side debugging (never sent to client)
  if (isProduction) {
    // Production: minimal logging without sensitive data
    logger.error(`${status} ${req.method} ${req.path}`);
  } else {
    // Development: detailed logging for debugging
    logger.error(`[${status}] ${err.name}: ${err.message}`, {
      stack: err.stack,
    });
  }

  // Send response
  res.status(status).json(response);
}

/**
 * Handle 404 Not Found errors
 * Should be registered BEFORE the global error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    "NOT_FOUND"
  );
  next(error);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(asyncControllerFunction))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate controller exists and throw ControllerNotImplementedError if missing
 */
export function requireController(
  controllerFn: any,
  routePath: string
): (req: Request, res: Response) => Promise<void> {
  if (!controllerFn || typeof controllerFn !== "function") {
    throw new ControllerNotImplementedError(
      `Controller not implemented for route: ${routePath}`
    );
  }
  return controllerFn;
}
