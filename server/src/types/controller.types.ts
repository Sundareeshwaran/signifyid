/**
 * Controller Type Definitions
 *
 * Enforces strict typing for controller functions in the Router-Controller architecture
 */
import type { Request, Response } from "express";

/**
 * Standard controller function signature
 * All controllers must accept Request and Response, and return Promise<void>
 * Controllers are responsible for sending the response
 */
export type ControllerFunction = (req: Request, res: Response) => Promise<void>;

/**
 * Controller registry for validation
 * Maps route paths to their controller functions
 */
export interface ControllerRegistry {
  [key: string]: ControllerFunction;
}

/**
 * Controller module interface
 * All controller files should export functions matching this pattern
 */
export interface ControllerModule {
  [methodName: string]: ControllerFunction;
}
