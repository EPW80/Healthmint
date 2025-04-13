// server/errors/errors.js
import { ERROR_CODES } from "../config/networkConfig.js";

/**
 * Base Application Error Class
 * All other error types extend this class for consistent structure
 */
export class AppError extends Error {
  constructor(code = "SERVER_ERROR", message, details = {}, statusCode = null) {
    super(message || ERROR_CODES[code]?.message || "An error occurred");

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
   * Formats error for API response
   * @param {boolean} includeDetails - Whether to include error details
   * @returns {Object} Formatted error response
   */
  toJSON(includeDetails = process.env.NODE_ENV === "development") {
    const response = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
      },
    };

    // Include details if in development or explicitly requested
    if (includeDetails && Object.keys(this.details).length > 0) {
      response.error.details = this.details;
    }

    // Include stack trace in development only
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
  constructor(
    code = ERROR_CODES.SERVER_ERROR.code,
    message,
    details = {},
    statusCode = null
  ) {
    super(code, message, details, statusCode);
  }
}

/**
 * HIPAA Compliance Error - Use for HIPAA related compliance errors
 */
export class HIPAAError extends AppError {
  constructor(code = "HIPAA_ERROR", message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);

    // Add HIPAA-specific metadata
    this.details.hipaaRelevant = true;
    this.details.requiresAudit = true;
    this.details.severity = details.severity || "medium";
  }
}

/**
 * Database Error - Use for database related errors
 */
export class DatabaseError extends AppError {
  constructor(code = "DB_ERROR", message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
  }
}

/**
 * Authentication Error - Use for auth related errors
 */
export class AuthError extends AppError {
  constructor(
    code = ERROR_CODES.UNAUTHORIZED.code,
    message,
    details = {},
    statusCode = null
  ) {
    super(code, message, details, statusCode);
  }
}

/**
 * Validation Error - Use for input validation errors
 */
export class ValidationError extends AppError {
  constructor(
    code = ERROR_CODES.VALIDATION_ERROR.code,
    message,
    details = {},
    statusCode = null
  ) {
    super(code, message, details, statusCode);
  }
}

/**
 * Transaction Error - Use for blockchain transaction errors
 */
export class TransactionError extends AppError {
  constructor(
    code = "TRANSACTION_ERROR",
    message,
    details = {},
    statusCode = null
  ) {
    super(code, message, details, statusCode);
  }
}
