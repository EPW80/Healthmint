// utils/asyncHandler.js
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
