// utils/asyncHandler.js

/**
 * Wraps async route handlers to catch errors and pass them to the error middleware
 * Simplifies error handling in Express route handlers
 *
 * @param {Function} fn - The async route handler function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Log error details
    console.error("Route handler error:", {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Send error response
    next(error);
  });
};

export default asyncHandler;
