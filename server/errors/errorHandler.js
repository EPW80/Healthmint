// server/errors/errorHandler.js
import { AppError } from "./errors.js";
import createError from "./errorFactory.js";
import { logger } from "../config/loggerConfig.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";

// Define patterns for PHI (Protected Health Information) to redact
const PHI_PATTERNS = [
  // SSN pattern
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
  // Email pattern
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // Phone number pattern
  /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // DOB pattern
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  // Medical record numbers
  /\bMRN[:# ]?\d{5,10}\b/gi,
  // Credit card numbers
  /\b(?:\d[ -]*?){13,16}\b/g,
];

// Sanitize error stack trace to remove sensitive information
const sanitizeErrorStack = (stack) => {
  if (!stack) return undefined;

  // Remove file paths that might contain sensitive information
  let sanitized = stack
    .split("\n")
    .map((line) => {
      // Remove full file paths
      line = line.replace(/\(?.+\\|\//, "");
      // Remove query parameters
      line = line.replace(/\?.*:/, ":");
      return line;
    })
    .join("\n");

  // Redact PHI patterns
  PHI_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });

  return sanitized;
};

// generate a unique error ID
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

// Log error details to the console and/or external logging service
const logError = (error, req, errorId) => {
  const errorData = {
    errorId,
    code: error.code || "UNKNOWN_ERROR",
    message: error.message,
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    userId: req?.user?.id || req?.user?.address || "anonymous",
    timestamp: new Date().toISOString(),
    stack: sanitizeErrorStack(error.stack),
  };

  // Determine log level based on status code
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error("Server error", errorData);
  } else if (statusCode >= 400) {
    logger.warn("Client error", errorData);
  } else {
    logger.info("Info error", errorData);
  }

  // Create HIPAA audit log for errors if needed
  if (error.name === "HIPAAError" || error.details?.hipaaRelevant) {
    hipaaCompliance
      .createAuditLog("ERROR_OCCURRED", {
        errorId,
        errorCode: error.code,
        errorContext: error.details?.context || "application",
        severity: error.details?.severity || "medium",
        timestamp: new Date().toISOString(),
        userAddress: req?.user?.address,
      })
      .catch((auditError) => {
        logger.error("Failed to create HIPAA audit log", {
          originalErrorId: errorId,
          auditError: auditError.message,
        });
      });
  }
};

// asyncHandler to wrap async route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // If the error is already one of our custom types, pass it through
    if (error instanceof AppError) {
      next(error);
    } else {
      // Otherwise, convert to an appropriate AppError
      next(
        createError.internal(error.message, { originalError: error.message })
      );
    }
  });
};

// global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Generate a unique error ID for tracking
  const errorId = generateErrorId();

  // Convert to standard format if it's not our custom error
  const error =
    err instanceof AppError
      ? err
      : createError.internal(err.message, { originalError: err.stack });

  // Add errorId to the error object
  error.details.errorId = errorId;

  // Log the error
  logError(error, req, errorId);

  // Get status code
  const statusCode = error.statusCode || 500;

  // Format and send response
  return res.status(statusCode).json({
    success: false,
    error: {
      id: errorId,
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { details: error.details }),
    },
    timestamp: new Date().toISOString(),
  });
};

export default {
  errorHandler,
  asyncHandler,
  sanitizeErrorStack,
  generateErrorId,
};
