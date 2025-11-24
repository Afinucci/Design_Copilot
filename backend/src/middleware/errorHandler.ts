import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express routes
 * Catches async errors and passes them to the error handler
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: 'An error occurred processing your request',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};