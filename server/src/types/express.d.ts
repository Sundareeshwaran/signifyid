/**
 * Express Type Augmentation
 *
 * This file extends the Express Request interface to include
 * the authenticated user payload from JWT middleware.
 *
 * IMPORTANT: This file must be a .d.ts file for global augmentation
 * to work properly across all modules without explicit imports.
 */

import { JwtPayload } from "./index";

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user payload from JWT middleware
       * Set by the auth middleware after token verification
       */
      user?: JwtPayload;
    }
  }
}

// This export is required to make this a module and enable declaration merging
export {};
