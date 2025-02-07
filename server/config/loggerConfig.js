// config/loggerConfig.js
const winston = require('winston');
const path = require('path');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

const loggerConfig = {
  development: {
    format: 'dev',
    options: {
      transports: [
        new winston.transports.Console({
          level: 'debug',
          format: developmentFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error',
          format: productionFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log'),
          format: productionFormat,
        }),
      ],
    },
    skipPaths: ['/health', '/metrics'],
  },
  production: {
    format: 'combined',
    options: {
      transports: [
        new winston.transports.Console({
          level: 'info',
          format: productionFormat,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error',
          format: productionFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log'),
          format: productionFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    },
    skipPaths: [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/_next',
      '/static',
      '/api-docs',
    ],
  },
};

// Create logger instance
const logger = winston.createLogger(
  loggerConfig[process.env.NODE_ENV || 'development'].options
);

// Add request logger middleware for development
logger.dev = (req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
};

module.exports = {
  loggerConfig,
  logger,
};