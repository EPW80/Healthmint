// middleware/requestLogger.js
import { logger } from "../config/loggerConfig.js";
import hipaaCompliance from "./hipaaCompliance.js";

// Clean sensitive data from request
const sanitizeRequest = (req) => {
  const sanitized = {
    id: req.id,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    params: { ...req.params },
    query: { ...req.query },
    headers: { ...req.headers },
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  };

  // Remove sensitive headers
  delete sanitized.headers.authorization;
  delete sanitized.headers.cookie;
  delete sanitized.headers["x-api-key"];

  // Mask sensitive query parameters
  if (sanitized.query.token) sanitized.query.token = "[MASKED]";
  if (sanitized.query.apiKey) sanitized.query.apiKey = "[MASKED]";

  return sanitized;
};

// Initialize request context
export const setupRequestContext = (req, res, next) => {
  req.id =
    req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();
  next();
};

// Main request logger
export const requestLogger = async (req, res, next) => {
  try {
    const sanitizedReq = sanitizeRequest(req);

    // Log request start
    logger.info("Request received", {
      request: sanitizedReq,
      context: {
        environment: process.env.NODE_ENV,
        requestId: req.id,
      },
    });

    // Create response listener
    const originalEnd = res.end;
    const chunks = [];

    // Override res.end to capture response data
    res.end = function (chunk) {
      if (chunk) chunks.push(Buffer.from(chunk));

      const responseTime = Date.now() - req.startTime;
      const responseBody = Buffer.concat(chunks).toString("utf8");

      // Log response
      logger.info("Request completed", {
        request: {
          id: req.id,
          method: req.method,
          path: req.path,
        },
        response: {
          statusCode: res.statusCode,
          responseTime,
          contentLength: res.get("Content-Length"),
          contentType: res.get("Content-Type"),
        },
        context: {
          environment: process.env.NODE_ENV,
          requestId: req.id,
        },
      });

      // HIPAA audit logging if needed
      if (req.path.startsWith("/api/") && req.user) {
        hipaaCompliance
          .auditLog({
            action: "api_request",
            performedBy: req.user.id,
            details: {
              requestId: req.id,
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseTime,
            },
          })
          .catch((err) => {
            logger.error("Failed to create HIPAA audit log", {
              error: err.message,
              requestId: req.id,
            });
          });
      }

      originalEnd.apply(res, arguments);
    };

    next();
  } catch (error) {
    logger.error("Request logging failed", {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });
    next(error);
  }
};

// Development request logger with more verbose output
export const developmentLogger = (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    return next();
  }

  const start = Date.now();
  logger.debug(`→ ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage = `← ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.debug(logMessage);
    }
  });

  next();
};

export { sanitizeRequest };

export default {
  setupRequestContext,
  requestLogger,
  developmentLogger,
};
