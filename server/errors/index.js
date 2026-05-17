// server/errors/index.js
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createError = {
  // Error factory methods
  api: (code, message, details = {}) => {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
  },

  validation: (message, details = {}) => {
    const error = new Error(message);
    error.code = "VALIDATION_ERROR";
    error.statusCode = 400;
    error.details = details;
    return error;
  },

  unauthorized: (message, details = {}) => {
    const error = new Error(message || "Unauthorized");
    error.code = "UNAUTHORIZED";
    error.statusCode = 401;
    error.details = details;
    return error;
  },

  forbidden: (message, details = {}) => {
    const error = new Error(message || "Forbidden");
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    error.details = details;
    return error;
  },

  hipaa: (code, message, details = {}) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = 400;
    error.details = details;
    error.hipaaRelated = true;
    return error;
  },
};

export const errorHandler = (err, req, res, next) => {
  // Error handler middleware implementation
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    code: err.code || "SERVER_ERROR",
    details: process.env.NODE_ENV === "development" ? err.details : undefined,
  });
};

// Export HIPAAError class for compatibility
export class HIPAAError extends Error {
  constructor(message, code = "HIPAA_ERROR", details = {}) {
    super(message);
    this.name = "HIPAAError";
    this.code = code;
    this.details = details;
    this.hipaaRelated = true;
  }
}

import * as errorClasses from "./errors.js";

export default {
  ...errorClasses,
  createError,
  errorHandler,
  asyncHandler,
};
