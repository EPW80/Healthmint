// /server/config/config.js

// Constants
const DEFAULT_PORT = 5000;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_JWT_EXPIRY = "24h";
const DEFAULT_REFRESH_EXPIRY = "7d";
const SEPOLIA_NETWORK_ID = "11155111";

// Extract all environment variables at once
const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10),
  API_URL:
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || DEFAULT_PORT}`,
  MONGODB_URI:
    process.env.MONGODB_URI ||
    process.env.DB_URI ||
    "mongodb://localhost:27017/healthmint",
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || DEFAULT_JWT_EXPIRY,
  REFRESH_TOKEN_EXPIRY:
    process.env.REFRESH_TOKEN_EXPIRY || DEFAULT_REFRESH_EXPIRY,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === "true",
  NETWORK_ID: process.env.NETWORK_ID || SEPOLIA_NETWORK_ID,
  STORAGE_TYPE: process.env.STORAGE_TYPE || "local",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  REQUEST_TIMEOUT: parseInt(
    process.env.REQUEST_TIMEOUT || DEFAULT_TIMEOUT.toString(),
    10
  ),
  RETRY_ATTEMPTS: parseInt(
    process.env.RETRY_ATTEMPTS || DEFAULT_RETRY_ATTEMPTS.toString(),
    10
  ),
};

// Production safety checks
if (env.NODE_ENV === "production") {
  if (!env.JWT_SECRET || env.JWT_SECRET === "healthmint-dev-secret-key") {
    console.error(
      "⚠️ WARNING: Using default JWT_SECRET in production is insecure!"
    );
    // In a real production app, you might want to throw an error here
    throw new Error("JWT_SECRET is not set in production environment");
  }

  if (!process.env.MONGODB_URI) {
    console.warn("⚠️ Using default MongoDB URI in production environment");
  }
}

// Check for required environment variables
const config = {
  // Server settings
  PORT: env.PORT,
  NODE_ENV: env.NODE_ENV,

  // API Configuration
  API_URL: env.API_URL,
  TIMEOUT: env.REQUEST_TIMEOUT,
  RETRY_ATTEMPTS: env.RETRY_ATTEMPTS,

  // Database Configuration
  DB_URI: env.MONGODB_URI,

  // JWT Configuration
  JWT_SECRET: env.JWT_SECRET || "healthmint-dev-secret-key",
  JWT_EXPIRY: env.JWT_EXPIRY,
  REFRESH_TOKEN_EXPIRY: env.REFRESH_TOKEN_EXPIRY,

  // CORS Configuration
  CORS: {
    ORIGIN: env.CORS_ORIGIN,
    CREDENTIALS: env.CORS_CREDENTIALS,
  },

  // Blockchain Configuration
  NETWORK_ID: env.NETWORK_ID,

  // Storage Configuration
  STORAGE_TYPE: env.STORAGE_TYPE, // 'local', 's3', 'ipfs'

  // Logging Configuration
  LOG_LEVEL: env.LOG_LEVEL,

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

  // Helper to get environment-specific values
  getEnvValue(devValue, prodValue, testValue) {
    if (this.isTest() && testValue !== undefined) return testValue;
    return this.isProd() ? prodValue : devValue;
  },
};

export default config;
