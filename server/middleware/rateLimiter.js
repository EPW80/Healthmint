// middleware/rateLimiter.js
import rateLimit from "express-rate-limit";

/**
 * Creates a customizable rate limiter
 */
const createRateLimiter = ({
  name = "default-limiter",
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxAttempts = 100,
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
    standardHeaders: true, // ✅ Return rate limit info in standard headers
    legacyHeaders: false, // ✅ Disable legacy `X-RateLimit-*` headers
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator: (req) => req.user?.address || req.ip, // ✅ Use wallet address or IP
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

// ✅ Named exports for ES Module compatibility
export const rateLimiters = {
  auth: createRateLimiter({
    name: "auth-limiter",
    windowMs: 15 * 60 * 1000,
    maxAttempts: process.env.NODE_ENV === "production" ? 5 : 100,
    message: "Too many authentication attempts",
    skipSuccessfulRequests: true,
  }),

  api: createRateLimiter({
    name: "api-limiter",
    windowMs: 15 * 60 * 1000,
    maxAttempts: process.env.NODE_ENV === "production" ? 100 : 1000,
    message: "Too many API requests",
  }),

  upload: createRateLimiter({
    name: "upload-limiter",
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: process.env.NODE_ENV === "production" ? 10 : 100,
    message: "Too many upload attempts",
  }),

  profile: createRateLimiter({
    name: "profile-limiter",
    windowMs: 15 * 60 * 1000,
    maxAttempts: 30,
    message: "Too many profile update attempts",
  }),

  emergency: createRateLimiter({
    name: "emergency-limiter",
    windowMs: 60 * 60 * 1000,
    maxAttempts: 5,
    message: "Too many emergency access attempts",
    skipSuccessfulRequests: true,
  }),
};

// ✅ Export `createRateLimiter` for custom usage
export { createRateLimiter };
