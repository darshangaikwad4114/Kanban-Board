import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public status: number;
  public code: string;
  public details?: Record<string, string[]>;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Don't log expected authentication failures (they're not real errors)
  const quietCodes = ['INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED'];
  if (!(err instanceof AppError && quietCodes.includes(err.code))) {
    console.error('Error:', err);
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        status: err.status,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        status: 400,
        details,
      },
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        code: 'INVALID_ID',
        status: 400,
      },
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        message: 'Duplicate entry',
        code: 'DUPLICATE_KEY',
        status: 409,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500,
    },
  });
};