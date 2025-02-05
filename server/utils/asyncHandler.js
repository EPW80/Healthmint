// utils/asyncHandler.js

/**
 * Wraps async route handlers to handle rejected promises
 * @param {Function} fn - The async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Log error details
    console.error("Route handler error:", {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Pass error to express error handler
    next(error);
  });
};

module.exports = {
  asyncHandler,
};
