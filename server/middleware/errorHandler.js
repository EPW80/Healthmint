const hipaaCompliance = require("./hipaaCompliance");

class HIPAAError extends Error {
  constructor(message, code = "HIPAA_ERROR", details = {}) {
    super(message);
    this.name = "HIPAAError";
    this.code = code;
    this.details = details;
  }
}

const errorHandler = async (err, req, res, next) => {
  try {
    // Generate error ID for tracking
    const errorId = generateErrorId();

    // Prepare error metadata
    const errorMetadata = {
      errorId,
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.address || "anonymous",
      errorType: err.name || "UnknownError",
      errorCode: err.code || "UNKNOWN_ERROR",
    };

    // Sanitize error stack to remove sensitive information
    const sanitizedStack = sanitizeErrorStack(err.stack);

    // Log error with metadata (avoiding PHI)
    await logError({
      ...errorMetadata,
      error: err.message,
      stack: sanitizedStack,
    });

    // Handle different types of errors
    if (err instanceof HIPAAError) {
      return handleHIPAAError(err, res, errorId);
    }

    if (err.name === "ValidationError") {
      return handleValidationError(err, res, errorId);
    }

    if (err.code === 11000) {
      return handleDuplicateError(err, res, errorId);
    }

    if (err.name === "UnauthorizedError") {
      return handleAuthError(err, res, errorId);
    }

    // Handle generic errors
    return handleGenericError(err, res, errorId);
  } catch (handlingError) {
    // Fallback error handling
    console.error("Error in error handler:", handlingError);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      errorId: generateErrorId(),
    });
  }
};

// Helper function to generate unique error ID
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sanitize error stack to remove sensitive information
const sanitizeErrorStack = (stack) => {
  if (!stack) return undefined;

  // Remove file paths that might contain sensitive information
  return stack
    .split("\n")
    .map((line) => {
      // Remove full file paths
      line = line.replace(/\(?.+\\|\//, "");
      // Remove query parameters
      line = line.replace(/\?.*:/, ":");
      return line;
    })
    .join("\n");
};

// Log error securely
const logError = async (errorData) => {
  try {
    // Log to secure audit trail
    await hipaaCompliance.auditLog({
      action: "error_occurred",
      severity: errorData.errorCode.includes("HIPAA") ? "high" : "medium",
      details: errorData,
    });

    // If in development, also console log
    if (process.env.NODE_ENV === "development") {
      console.error("Error occurred:", {
        errorId: errorData.errorId,
        message: errorData.error,
        type: errorData.errorType,
        path: errorData.path,
      });
    }
  } catch (loggingError) {
    console.error("Error logging failed:", loggingError);
  }
};

// Handle HIPAA-specific errors
const handleHIPAAError = (err, res, errorId) => {
  const response = {
    success: false,
    message: "A compliance-related error occurred",
    errorId,
    code: err.code,
  };

  // Add additional details in development
  if (process.env.NODE_ENV === "development") {
    response.details = err.details;
  }

  return res.status(400).json(response);
};

// Handle validation errors
const handleValidationError = (err, res, errorId) => {
  // Sanitize validation error messages
  const sanitizedErrors = Object.values(err.errors).map((error) => ({
    field: error.path,
    message: sanitizeErrorMessage(error.message),
  }));

  return res.status(400).json({
    success: false,
    message: "Validation Error",
    errorId,
    errors: sanitizedErrors,
  });
};

// Handle duplicate key errors
const handleDuplicateError = (err, res, errorId) => {
  const field = Object.keys(err.keyPattern)[0];

  return res.status(400).json({
    success: false,
    message: "Duplicate Entry Error",
    errorId,
    field: sanitizeFieldName(field),
  });
};

// Handle authentication errors
const handleAuthError = (err, res, errorId) => {
  return res.status(401).json({
    success: false,
    message: "Authentication Error",
    errorId,
  });
};

// Handle generic errors
const handleGenericError = (err, res, errorId) => {
  const response = {
    success: false,
    message: "An unexpected error occurred",
    errorId,
  };

  // Add error details in development
  if (process.env.NODE_ENV === "development") {
    response.error = sanitizeErrorMessage(err.message);
  }

  return res.status(500).json(response);
};

// Sanitize error messages to remove sensitive information
const sanitizeErrorMessage = (message) => {
  if (!message) return "An error occurred";

  // Remove potential PII/PHI patterns
  return message
    .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, "***-**-****") // SSN
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]") // Email
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]") // Phone
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[DATE]"); // Dates
};

// Sanitize field names to remove sensitive information
const sanitizeFieldName = (field) => {
  // List of sensitive field names to mask
  const sensitiveFields = [
    "ssn",
    "socialSecurity",
    "dob",
    "dateOfBirth",
    "password",
    "secret",
  ];

  if (
    sensitiveFields.some((sensitive) => field.toLowerCase().includes(sensitive))
  ) {
    return "[PROTECTED_FIELD]";
  }

  return field;
};

module.exports = {
  errorHandler,
  HIPAAError,
};
