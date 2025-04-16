// config/loggerConfig.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

/**
 * Enhanced logging configuration for HIPAA-compliant applications
 * Features:
 * - Environment-specific configurations
 * - Log rotation and retention policies
 * - Secure PHI redaction
 * - Request correlation through request IDs
 * - Configurable via environment variables
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants & Environment Configuration
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "../logs");
const MAX_LOG_SIZE = parseInt(process.env.MAX_LOG_SIZE || "5242880", 10); // 5MB default
const MAX_LOG_FILES = parseInt(process.env.MAX_LOG_FILES || "5", 10);
const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`Created log directory: ${LOG_DIR}`);
  }
} catch (error) {
  console.error(`Failed to create log directory ${LOG_DIR}:`, error);
}

// PHI Pattern detection for redaction
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

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Terminal colors for better readability
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to Winston
winston.addColors(colors);

/**
 * Custom format to redact PHI from logs
 */
const redactPHI = winston.format((info) => {
  // Only process strings to avoid errors with objects
  if (typeof info.message === "string") {
    // Redact each PHI pattern
    PHI_PATTERNS.forEach((pattern) => {
      info.message = info.message.replace(pattern, "[REDACTED]");
    });
  }

  // Also check if message is an object with a toString method
  if (typeof info.message === "object" && info.message !== null) {
    try {
      const stringified = JSON.stringify(info.message);
      let redacted = stringified;

      PHI_PATTERNS.forEach((pattern) => {
        redacted = redacted.replace(pattern, "[REDACTED]");
      });

      // Only parse back if we actually redacted something
      if (redacted !== stringified) {
        info.message = JSON.parse(redacted);
      }
    } catch (e) {
      // If we can't stringify/parse, just leave it as is
    }
  }

  return info;
});

/**
 * Format for development logs (human-readable, colorized)
 */
const developmentFormat = winston.format.combine(
  redactPHI(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let metadataStr = "";

    if (Object.keys(metadata).length > 0) {
      // Don't stringify requestId, correlationId, etc.
      const { requestId, correlationId, userId, ...rest } = metadata;

      // Format special fields
      const specialFields = [
        requestId ? `requestId=${requestId}` : "",
        correlationId ? `correlationId=${correlationId}` : "",
        userId ? `userId=${userId}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      // Format rest of metadata if any
      const restStr = Object.keys(rest).length > 0 ? JSON.stringify(rest) : "";

      metadataStr = [specialFields, restStr].filter(Boolean).join(" ");
    }

    return `${timestamp} ${level}: ${message} ${metadataStr}`;
  })
);

/**
 * Format for production logs (structured JSON)
 */
const productionFormat = winston.format.combine(
  redactPHI(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Daily file rotation transport factory
 */
const createFileTransport = (filename, level) => {
  return new winston.transports.File({
    filename: path.join(LOG_DIR, filename),
    level,
    format: productionFormat,
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    tailable: true,
    zippedArchive: true, // Compress rotated logs
  });
};

/**
 * Environment-specific logger configurations
 */
const loggerConfig = {
  development: {
    format: "dev",
    options: {
      levels: logLevels,
      level: LOG_LEVEL,
      exitOnError: false,
      transports: [
        // Console for immediate feedback
        new winston.transports.Console({
          level: LOG_LEVEL,
          format: developmentFormat,
          handleExceptions: true,
        }),
        // Error log file
        createFileTransport("error.log", "error"),
        // Combined log file
        createFileTransport("combined.log", LOG_LEVEL),
      ],
    },
    skipPaths: ["/health", "/metrics", "/favicon.ico", "/static"],
  },

  production: {
    format: "combined",
    options: {
      levels: logLevels,
      level: LOG_LEVEL,
      exitOnError: false,
      transports: [
        // Limited console output in production
        new winston.transports.Console({
          level: process.env.CONSOLE_LOG_LEVEL || "info",
          format: productionFormat,
          handleExceptions: true,
        }),
        // Error log file
        createFileTransport("error.log", "error"),
        // Main application log
        createFileTransport("application.log", "info"),
        // HTTP access log
        createFileTransport("access.log", "http"),
        // Complete debug log if enabled
        ...(LOG_LEVEL === "debug"
          ? [createFileTransport("debug.log", "debug")]
          : []),
      ],
    },
    skipPaths: [
      "/health",
      "/metrics",
      "/favicon.ico",
      "/_next",
      "/static",
      "/api-docs",
    ],
  },

  test: {
    format: "test",
    options: {
      levels: logLevels,
      level: "error", // Minimal logging in test
      transports: [
        new winston.transports.Console({
          level: "error",
          format: developmentFormat,
        }),
      ],
    },
    skipPaths: ["*"], // Skip all paths in test
  },
};

// Get current environment or default to development
const currentEnv = process.env.NODE_ENV || "development";

// Create logger instance with custom levels and settings
const logger = winston.createLogger({
  ...(loggerConfig[currentEnv]?.options || loggerConfig.development.options),
  levels: logLevels,
  // Add uncaught exception handler
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "exceptions.log"),
      format: productionFormat,
      maxsize: MAX_LOG_SIZE,
      maxFiles: 5,
    }),
  ],
  // Add unhandled rejection handler (for promises)
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "rejections.log"),
      format: productionFormat,
      maxsize: MAX_LOG_SIZE,
      maxFiles: 5,
    }),
  ],
});

/**
 * Add request ID to log context
 * @param {string} requestId - The request ID to add
 * @returns {Object} A child logger with request ID context
 */
logger.forRequest = (requestId) => {
  return logger.child({ requestId });
};

/**
 * Enhanced request logger middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
logger.requestLogger = (req, res, next) => {
  // Skip logging for excluded paths
  const skipPaths = loggerConfig[currentEnv]?.skipPaths || [];
  if (skipPaths.some((path) => req.originalUrl.includes(path))) {
    return next();
  }

  const requestId =
    req.id ||
    req.headers["x-request-id"] ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add request ID to response headers
  res.setHeader("X-Request-ID", requestId);

  // Create a request-specific logger
  const requestLogger = logger.forRequest(requestId);

  // Log request start
  const startTime = Date.now();
  requestLogger.http(`${req.method} ${req.originalUrl} started`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "http";

    requestLogger[logLevel](
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      {
        statusCode: res.statusCode,
        responseTime: duration,
        contentLength: res.get("Content-Length"),
        contentType: res.get("Content-Type"),
      }
    );
  });

  // Add logger to request for route handlers
  req.logger = requestLogger;

  next();
};

// Legacy dev middleware for backward compatibility
logger.dev = (req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
};

// Export the logger
export { loggerConfig, logger };
