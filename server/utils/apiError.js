// utils/apiError.js
const { ERROR_CODES } = require("../config/networkConfig");

/**
 * Custom error class for API errors with HIPAA compliance
 * @extends Error
 */
class ApiError extends Error {
  constructor(code, message, details = {}, statusCode = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Map error codes to status codes if not explicitly provided
    this.statusCode = statusCode || this.getStatusCode(code);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Maps error codes to HTTP status codes using centralized error codes
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
 * Factory functions for common API errors with HIPAA compliance
 */
const createApiError = {
  validation: (message, details) =>
    new ApiError(ERROR_CODES.VALIDATION_ERROR.code, message, details),

  unauthorized: (message = ERROR_CODES.UNAUTHORIZED.message) =>
    new ApiError(ERROR_CODES.UNAUTHORIZED.code, message),

  forbidden: (message = ERROR_CODES.FORBIDDEN.message) =>
    new ApiError(ERROR_CODES.FORBIDDEN.code, message),

  notFound: (message = ERROR_CODES.NOT_FOUND.message) =>
    new ApiError(ERROR_CODES.NOT_FOUND.code, message),

  rateLimit: (message = ERROR_CODES.RATE_LIMIT.message) =>
    new ApiError(ERROR_CODES.RATE_LIMIT.code, message),

  internal: (message = ERROR_CODES.SERVER_ERROR.message) =>
    new ApiError(ERROR_CODES.SERVER_ERROR.code, message),

  networkError: (message = ERROR_CODES.NETWORK_ERROR.message) =>
    new ApiError(ERROR_CODES.NETWORK_ERROR.code, message),

  data: (message, details) => new ApiError("DATA_ERROR", message, details),

  integrity: (message, details) =>
    new ApiError("INTEGRITY_ERROR", message, details),

  consent: (message = "Consent required") =>
    new ApiError("CONSENT_REQUIRED", message),
};

module.exports = {
  ApiError,
  createApiError,
};
