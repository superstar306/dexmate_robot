import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  let message = err.message || 'Internal server error';

  // Handle validation errors
  if (message.startsWith('[') && message.includes('ValidationError')) {
    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed)) {
        message = parsed.map((e: any) => e.message || e.msg || JSON.stringify(e)).join(', ');
      }
    } catch {
      // If parsing fails, use the original message
    }
  }

  console.error(`[${statusCode}] ${status}: ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Return format compatible with frontend expectations
  res.status(statusCode).json({
    status,
    message,
    detail: message, // Some frontend code might look for 'detail'
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
  return error;
}

