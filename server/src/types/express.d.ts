/**
 * Express Type Augmentation
 *
 * This file extends the Express Request interface to include
 * the authenticated user payload from JWT middleware and
 * client session/client data from client auth gateway middleware.
 *
 * IMPORTANT: This file must be a .d.ts file for global augmentation
 * to work properly across all modules without explicit imports.
 */

import { JwtPayload } from "./index";
import type { ClientSession } from "../models/ClientSession.model";
import type { Client } from "../models/Client.model";

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user payload from JWT middleware
       * Set by the auth middleware after token verification
       */
      user?: JwtPayload;

      /**
       * Client session from client auth gateway middleware
       * Set by the clientAuthGateway middleware after session validation
       */
      clientSession?: ClientSession;

      /**
       * Client record from client auth gateway middleware
       * Set by the clientAuthGateway middleware after client lookup
       */
      client?: Client;
    }
  }
}

// This export is required to make this a module and enable declaration merging
export {};
