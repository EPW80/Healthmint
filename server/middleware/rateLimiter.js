// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

/**
 * Creates a rate limiter middleware with custom configuration
 */
const createRateLimiter = ({
  name = "default-limiter",
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxAttempts = 100, // Max attempts per window
  message = "Too many requests, please try again later",
  skipFailedRequests = false,
  skipSuccessfulRequests = false,
}) => {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    message: {
      success: false,
      message,
      code: "RATE_LIMIT_EXCEEDED",
      limiter: name,
    },
    standardHeaders: true, // Return rate limit info in standard headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      // Use user's wallet address if authenticated, otherwise use IP
      return req.user?.address || req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Please wait ${Math.ceil(
          windowMs / 60000
        )} minutes.`,
        code: "RATE_LIMIT_EXCEEDED",
        limiter: name,
        windowMs,
        maxAttempts,
      });
    },
  });
};

// Predefined rate limiters for different use cases
const rateLimiters = {
  // Authentication rate limiter
  auth: createRateLimiter({
    name: "auth-limiter",
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: process.env.NODE_ENV === "production" ? 5 : 100,
    message: "Too many authentication attempts",
    skipSuccessfulRequests: true,
  }),

  // API rate limiter
  api: createRateLimiter({
    name: "api-limiter",
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: process.env.NODE_ENV === "production" ? 100 : 1000,
    message: "Too many API requests",
  }),

  // Data upload rate limiter
  upload: createRateLimiter({
    name: "upload-limiter",
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: process.env.NODE_ENV === "production" ? 10 : 100,
    message: "Too many upload attempts",
  }),

  // Profile update rate limiter
  profile: createRateLimiter({
    name: "profile-limiter",
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 30,
    message: "Too many profile update attempts",
  }),

  // Emergency access rate limiter
  emergency: createRateLimiter({
    name: "emergency-limiter",
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
    message: "Too many emergency access attempts",
    skipSuccessfulRequests: true,
  }),
};

module.exports = {
  createRateLimiter,
  rateLimiters,
};
