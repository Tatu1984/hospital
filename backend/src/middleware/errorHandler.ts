import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: any[];

  constructor(message: string, errors: any[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// Error response formatter
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  stack?: string;
}

function formatErrorResponse(error: AppError, includeStack: boolean): ErrorResponse {
  const response: ErrorResponse = {
    error: error.code || 'INTERNAL_ERROR',
    message: error.message,
  };

  if (error instanceof ValidationError && error.errors.length > 0) {
    response.details = error.errors;
  }

  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

// Handle Zod validation errors
function handleZodError(error: ZodError): ValidationError {
  const errors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return new ValidationError('Validation failed', errors);
}

// Handle Prisma errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new ConflictError(`A record with this ${field} already exists`);

    case 'P2003': // Foreign key constraint violation
      return new ValidationError('Invalid reference: related record does not exist');

    case 'P2025': // Record not found
      return new NotFoundError('Record');

    case 'P2014': // Required relation violation
      return new ValidationError('The operation violates required relationships');

    default:
      logger.error('Unhandled Prisma error:', { code: error.code, meta: error.meta });
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId,
  });

  // Handle specific error types
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = handleZodError(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new ValidationError('Invalid data provided');
  } else if (err instanceof SyntaxError && 'body' in err) {
    appError = new ValidationError('Invalid JSON in request body');
  } else {
    // Unknown error - don't expose details in production
    appError = new AppError(
      config.isProduction ? 'An unexpected error occurred' : err.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Send response
  const response = formatErrorResponse(appError, config.isDevelopment);
  res.status(appError.statusCode).json(response);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
