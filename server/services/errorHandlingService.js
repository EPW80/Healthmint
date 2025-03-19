// server/services/errorHandlingService.js

/**
 * Server-side Error Handling Service
 */
class ErrorHandlingService {
  constructor() {
    this.auditLogger = null;
    console.log("✅ ErrorHandlingService initialized");
  }

  /**
   * Set the audit logger - called by the application startup
   * @param {Object} logger - The audit logger instance
   */
  setAuditLogger(logger) {
    if (!logger) {
      console.warn("⚠️ Null audit logger provided to ErrorHandlingService");
      return;
    }

    this.auditLogger = logger;
    console.log("✅ Audit logger set in ErrorHandlingService");
  }

  /**
   * Handle an error globally with consistent patterns
   */
  handleError(error, options = {}) {
    const {
      code = "SERVER_ERROR",
      context = "Application",
      userVisible = false,
      details = {},
    } = options;

    // Create a standardized error object
    const standardError = this.standardizeError(error, context);

    // Log the error
    this.logError(standardError, context);

    // Create HIPAA audit log if applicable
    this.createAuditLog(standardError, context);

    // Prepare error for response
    const errorResponse = {
      code,
      message: userVisible
        ? this.getUserErrorMessage(standardError, context)
        : "An unexpected error occurred",
      details: process.env.NODE_ENV === "development" ? details : undefined,
    };

    // Return the processed error
    return new Error(JSON.stringify(errorResponse));
  }

  /**
   * Standardize the error object
   */
  standardizeError(error, context) {
    return {
      originalError: error,
      message:
        typeof error === "string"
          ? error
          : error?.message || "An unknown error occurred",
      code: error?.code || "UNKNOWN_ERROR",
      context,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserErrorMessage(standardError, context) {
    const genericMessages = {
      Authentication: "Authentication failed. Please try again.",
      "Data Upload": "Failed to upload data. Please try again.",
      "User Profile": "Failed to update profile. Please try again.",
      Network: "Network connection issue. Please check your connection.",
      Server: "Server error occurred. Please try again later.",
      Wallet: "Wallet connection issue. Please check your configuration.",
      Blockchain: "Blockchain interaction failed. Please try again.",
      Database: "Data operation failed. Please try again.",
    };

    return (
      genericMessages[context] ||
      standardError.message ||
      "An error occurred. Please try again."
    );
  }

  /**
   * Log the error
   */
  logError(standardError, context) {
    console.error(`[${context}] Error:`, {
      message: standardError.message,
      code: standardError.code,
      timestamp: standardError.timestamp,
      stack:
        process.env.NODE_ENV !== "production" ? standardError.stack : undefined,
    });
  }

  /**
   * Create HIPAA audit log for the error
   */
  createAuditLog(standardError, context) {
    try {
      if (
        this.auditLogger &&
        typeof this.auditLogger.createAuditLog === "function"
      ) {
        this.auditLogger.createAuditLog("ERROR_OCCURRED", {
          errorContext: context,
          errorCode: standardError.code,
          errorMessage: standardError.message,
          timestamp: standardError.timestamp,
        });
      } else {
        // Fall back to console logging if audit logger isn't available
        console.warn(
          `[AUDIT] Error occurred in ${context}: ${standardError.message}`
        );
      }
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }
  }

  /**
   * Wrap an async function with error handling
   */
  wrapAsync(fn, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handleError(error, options);
      }
    };
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;
export { ErrorHandlingService };
