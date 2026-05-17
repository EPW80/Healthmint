// server/errors/errors.js
import { ERROR_CODES } from "../config/networkConfig.js";

// Error class for the application
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

  // map error codes to HTTP status codes
  getStatusCode(code) {
    return ERROR_CODES[code]?.status || 500;
  }

  // format error response as JSON
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

// api-specific error class
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

// HIPAA-specific error class
export class HIPAAError extends AppError {
  constructor(code = "HIPAA_ERROR", message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);

    // Add HIPAA-specific metadata
    this.details.hipaaRelevant = true;
    this.details.requiresAudit = true;
    this.details.severity = details.severity || "medium";
  }
}

// Database Error - Use for database related errors
export class DatabaseError extends AppError {
  constructor(code = "DB_ERROR", message, details = {}, statusCode = null) {
    super(code, message, details, statusCode);
  }
}

// Authentication Error - Use for authentication related errors
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

// Validation Error - Use for validation related errors
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

// transaction Error - Use for blockchain transaction related errors
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
