// server/errors/errorFactory.js
import {
  AppError,
  ApiError,
  HIPAAError,
  DatabaseError,
  AuthError,
  ValidationError,
  TransactionError,
} from "./errors.js";
import { ERROR_CODES } from "../config/networkConfig.js";

// This function creates a new error object based on the provided parameters.
export const createError = {
  // Generic app error
  app: (code = ERROR_CODES.SERVER_ERROR.code, message, details) =>
    new AppError(code, message, details),

  // API-specific errors
  api: (code = ERROR_CODES.SERVER_ERROR.code, message, details) =>
    new ApiError(code, message, details),

  // HIPAA-related errors
  hipaa: (code = "HIPAA_ERROR", message, details) =>
    new HIPAAError(code, message, details),

  // Database errors
  db: (code = "DB_ERROR", message, details) =>
    new DatabaseError(code, message, details),

  // Authentication errors
  auth: (code = ERROR_CODES.UNAUTHORIZED.code, message, details) =>
    new AuthError(code, message, details),

  // Validation errors
  validation: (code = ERROR_CODES.VALIDATION_ERROR.code, message, details) =>
    new ValidationError(code, message, details),

  // Blockchain transaction errors
  transaction: (code = "TRANSACTION_ERROR", message, details) =>
    new TransactionError(code, message, details),

  // Common error shortcuts
  unauthorized: (message = ERROR_CODES.UNAUTHORIZED.message, details) =>
    new AuthError(ERROR_CODES.UNAUTHORIZED.code, message, details),

  forbidden: (message = ERROR_CODES.FORBIDDEN.message, details) =>
    new ApiError(ERROR_CODES.FORBIDDEN.code, message, details),

  notFound: (message = ERROR_CODES.NOT_FOUND.message, details) =>
    new ApiError(ERROR_CODES.NOT_FOUND.code, message, details),

  badRequest: (message = ERROR_CODES.VALIDATION_ERROR.message, details) =>
    new ValidationError(ERROR_CODES.VALIDATION_ERROR.code, message, details),

  internal: (message = ERROR_CODES.SERVER_ERROR.message, details) =>
    new ApiError(ERROR_CODES.SERVER_ERROR.code, message, details),

  rateLimit: (message = ERROR_CODES.RATE_LIMIT.message, details) =>
    new ApiError(ERROR_CODES.RATE_LIMIT.code, message, details),
};

// Exporting specific error types for easier access
export const createAPIError = (code, message, details = {}) => {
  // Implementation...
};

export const createValidationError = (message, details = {}) => {
  // Implementation...
};

export default createError;
