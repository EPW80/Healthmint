// Basic error handling service
class ErrorHandlingService {
  // Constructor
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
