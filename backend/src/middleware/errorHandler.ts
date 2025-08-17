import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Database validation error';
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  // Handle database connection errors
  if (error.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Database connection failed';
  }

  // Handle network errors
  if (error.message?.includes('ENOTFOUND')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Handle timeout errors
  if (error.message?.includes('ETIMEDOUT')) {
    statusCode = 504;
    message = 'Request timeout';
  }

  // Handle rate limiting errors
  if (error.message?.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too many requests, please try again later';
  }

  // Production error handling
  if (process.env.NODE_ENV === 'production') {
    // Don't leak error details in production
    if (statusCode === 500) {
      message = 'Internal server error';
    }
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.message
      })
    }
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.url
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
};

export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
};
