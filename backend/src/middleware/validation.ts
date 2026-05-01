import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Extended Request with validated data
export interface ValidatedRequest extends Request {
  validatedBody?: any;
  validatedQuery?: any;
  validatedParams?: any;
}

// Validation error response format
interface ValidationErrorResponse {
  error: string;
  message: string;
  code: string;
  details: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
}

// Format Zod errors into user-friendly format
function formatZodErrors(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation Error',
    message: 'Invalid request data',
    code: 'VALIDATION_ERROR',
    details: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

// Middleware to validate request body
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(formatZodErrors(result.error));
      }
      req.validatedBody = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware to validate query parameters
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json(formatZodErrors(result.error));
      }
      req.validatedQuery = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Middleware to validate path parameters
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json(formatZodErrors(result.error));
      }
      req.validatedParams = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Combined validation middleware
export function validate<B = any, Q = any, P = any>(options: {
  body?: ZodSchema<B>;
  query?: ZodSchema<Q>;
  params?: ZodSchema<P>;
}) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (options.body) {
        const bodyResult = options.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json(formatZodErrors(bodyResult.error));
        }
        req.validatedBody = bodyResult.data;
      }

      // Validate query
      if (options.query) {
        const queryResult = options.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json(formatZodErrors(queryResult.error));
        }
        req.validatedQuery = queryResult.data;
      }

      // Validate params
      if (options.params) {
        const paramsResult = options.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json(formatZodErrors(paramsResult.error));
        }
        req.validatedParams = paramsResult.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
