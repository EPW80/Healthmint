// validation/errors.js

/**
 * Unified validation error class
 * Standardizes error handling across validation functions
 */
export class ValidationError extends Error {
  constructor(message, code = "VALIDATION_ERROR", field = null, details = {}) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.field = field;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Format the error for API responses
   * @returns {Object} Formatted error object
   */
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        field: this.field,
        details:
          Object.keys(this.details).length > 0 ? this.details : undefined,
        timestamp: this.timestamp,
      },
    };
  }
}

// Export named class
export default ValidationError;
