// server/utils/errorUtils.js
import { ERROR_CODES } from "../config/networkConfig.js";

/**
 * Base Application Error Class
 * All other error types should extend this class
 */
export class AppError extends Error {
  constructor(code, message, details = {}, statusCode = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.statusCode = statusCode || this.getStatusCode(code);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Maps error codes to HTTP status codes
   * @param {string} code - Error code
   * @returns {number} HTTP status code
   */
  getStatusCode(code) {
    return ERROR_CODES[code]?.status || 500;
  }

  /**
   * Formats error for API response with enhanced security
   * @returns {Object} Formatted error response
   */
  toJSON() {
    const response = {
      success: false,
      error: {
        code: this.code,
        message: this.message || ERROR_CODES[this.code]?.message,
        timestamp: this.timestamp,
      },
    };

    // Add details in development or if specifically provided
    if (
      process.env.NODE_ENV === "development" ||
      Object.keys(this.details).length > 0
    ) {
      response.error.details = this.details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === "development") {
      response.error.stack = this.stack;
    }

    return response;
  }
}

/**
 * API Error - Use for REST API related errors
 */
export class ApiError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "ApiError";
  }
}

/**
 * HIPAA Compliance Error - Use for HIPAA related compliance errors
 */
export class HIPAAError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "HIPAAError";
  }
}

/**
 * Database Error - Use for database related errors
 */
export class DatabaseError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "DatabaseError";
  }
}

/**
 * Authentication Error - Use for auth related errors
 */
export class AuthError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "AuthError";
  }
}

/**
 * Validation Error - Use for input validation errors
 */
export class ValidationError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "ValidationError";
  }
}

/**
 * Transaction Error - Use for blockchain transaction errors
 */
export class TransactionError extends AppError {
  constructor(code, message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
    this.name = "TransactionError";
  }
}

/**
 * Error Factory - Simplifies creating different error types
 */
export const createError = {
  api: (code = ERROR_CODES.SERVER_ERROR.code, message, details) =>
    new ApiError(code, message, details),

  hipaa: (code = "HIPAA_ERROR", message, details) =>
    new HIPAAError(code, message, details),

  db: (code = "DB_ERROR", message, details) =>
    new DatabaseError(code, message, details),

  auth: (code = ERROR_CODES.UNAUTHORIZED.code, message, details) =>
    new AuthError(code, message, details),

  validation: (code = ERROR_CODES.VALIDATION_ERROR.code, message, details) =>
    new ValidationError(code, message, details),

  transaction: (code = "TRANSACTION_ERROR", message, details) =>
    new TransactionError(code, message, details),

  // Common error patterns
  unauthorized: (message = ERROR_CODES.UNAUTHORIZED.message) =>
    new ApiError(ERROR_CODES.UNAUTHORIZED.code, message),

  forbidden: (message = ERROR_CODES.FORBIDDEN.message) =>
    new ApiError(ERROR_CODES.FORBIDDEN.code, message),

  notFound: (message = ERROR_CODES.NOT_FOUND.message) =>
    new ApiError(ERROR_CODES.NOT_FOUND.code, message),

  internal: (message = ERROR_CODES.SERVER_ERROR.message) =>
    new ApiError(ERROR_CODES.SERVER_ERROR.code, message),
};

/**
 * Async error handler to wrap Express route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // If the error is already one of our custom types, pass it through
    if (error instanceof AppError) {
      next(error);
    } else {
      // Otherwise, convert it to an appropriate type
      const wrappedError = createError.internal(
        error.message || "An unexpected error occurred",
        { originalError: error.message }
      );
      next(wrappedError);
    }
  });
};

/**
 * Global error handler middleware for Express
 */
export const errorHandler = (err, req, res, _next) => {
  // Generate a unique error ID for tracking
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Log error for debugging
  console.error(`[${errorId}] Error:`, {
    name: err.name,
    code: err.code,
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Convert to standard format if it's not our custom error
  const formattedError =
    err instanceof AppError ? err : createError.internal(err.message);

  // Send formatted response
  const statusCode = formattedError.statusCode || 500;
  const errorResponse = {
    success: false,
    error: {
      id: errorId,
      code: formattedError.code,
      message: formattedError.message,
      timestamp: formattedError.timestamp || new Date().toISOString(),
    },
  };

  // Include details only in development or if explicitly set
  if (
    process.env.NODE_ENV === "development" ||
    Object.keys(formattedError.details || {}).length > 0
  ) {
    errorResponse.error.details = formattedError.details;
  }

  return res.status(statusCode).json(errorResponse);
};

export default {
  AppError,
  ApiError,
  HIPAAError,
  DatabaseError,
  AuthError,
  ValidationError,
  TransactionError,
  createError,
  asyncHandler,
  errorHandler,
};
