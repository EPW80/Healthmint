// config/loggerConfig.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to Winston
winston.addColors(colors);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json()
);

const loggerConfig = {
  development: {
    format: "dev",
    options: {
      levels: logLevels,
      level: "debug",
      transports: [
        new winston.transports.Console({
          level: "debug",
          format: developmentFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, "../logs/error.log"),
          level: "error",
          format: productionFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, "../logs/combined.log"),
          format: productionFormat,
        }),
      ],
    },
    skipPaths: ["/health", "/metrics"],
  },
  production: {
    format: "combined",
    options: {
      levels: logLevels,
      level: "info",
      transports: [
        new winston.transports.Console({
          level: "info",
          format: productionFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, "../logs/error.log"),
          level: "error",
          format: productionFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, "../logs/combined.log"),
          format: productionFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
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
};

// Create logger instance with custom levels
const logger = winston.createLogger({
  ...loggerConfig[process.env.NODE_ENV || "development"].options,
  levels: logLevels,
});

// Add request logger middleware for development
logger.dev = (req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
};

export { loggerConfig, logger };
