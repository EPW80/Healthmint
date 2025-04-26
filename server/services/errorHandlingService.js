// Basic error handling service

/**
 * Standardized error handling service
 */
class ErrorHandlingService {
  /**
   * Handle errors consistently throughout the application
   * @param {Error} error - The error object
   * @param {Object} options - Options for error handling
   * @param {string} options.code - Error code
   * @param {string} options.context - Context where error occurred
   * @param {boolean} options.userVisible - Whether error should be shown to user
   * @param {any} options.defaultValue - Default value to return in case of error
   * @param {boolean} options.throw - Whether to throw the error after handling
   * @returns {any} The default value or throws the error
   */
  handleError(error, options = {}) {
    const {
      code = "UNKNOWN_ERROR",
      context = "General",
      userVisible = false,
      defaultValue = null,
      throw: shouldThrow = false,
    } = options;

    // Log the error
    console.error(`[${code}] Error in ${context}:`, error);

    // Create a standardized error object
    const standardError = {
      success: false,
      error: userVisible ? error.message : "An error occurred",
      code,
      context,
      timestamp: new Date().toISOString(),
    };

    // Throw or return based on options
    if (shouldThrow) {
      throw standardError;
    }

    return defaultValue !== undefined ? defaultValue : standardError;
  }
}

const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;
