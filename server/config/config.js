// /server/config/config.js

/**
 * Server Configuration Module
 *
 * Centralizes all server-side configuration settings
 */
const config = {
  // Server settings
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // API Configuration
  API_URL: process.env.API_URL || "http://localhost:5000",
  TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || "30000", 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || "3", 10),

  // Database Configuration
  DB_URI:
    process.env.MONGODB_URI ||
    process.env.DB_URI ||
    "mongodb://localhost:27017/healthmint",

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || "healthmint-dev-secret-key",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "24h",
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || "7d",

  // CORS Configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
    CREDENTIALS: process.env.CORS_CREDENTIALS === "true",
  },

  // Blockchain Configuration
  NETWORK_ID: process.env.NETWORK_ID || "11155111", // Sepolia testnet

  // Storage Configuration
  STORAGE_TYPE: process.env.STORAGE_TYPE || "local", // 'local', 's3', 'ipfs'

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Utilities
  isDev() {
    return this.NODE_ENV === "development";
  },

  isProd() {
    return this.NODE_ENV === "production";
  },

  isTest() {
    return this.NODE_ENV === "test";
  },
};

export default config;
