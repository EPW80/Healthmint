// src/config/environmentConfig.js
/**
 * Centralized Environment Configuration
 *
 * This module provides a single source of truth for all environment-specific
 * configurations, ensuring consistent usage throughout the application.
 */

// Default environments
export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
};

// Current environment
export const ENV = {
  NODE_ENV:
    process.env.REACT_APP_ENV ||
    process.env.NODE_ENV ||
    ENVIRONMENTS.DEVELOPMENT,
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  IPFS_HOST: process.env.REACT_APP_IPFS_HOST || "ipfs.infura.io",
  IPFS_PORT: parseInt(process.env.REACT_APP_IPFS_PORT || "5001", 10),
  IPFS_PROTOCOL: process.env.REACT_APP_IPFS_PROTOCOL || "https",
  REQUEST_TIMEOUT: parseInt(
    process.env.REACT_APP_REQUEST_TIMEOUT || "30000",
    10
  ),
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || "3", 10),
  IS_PRODUCTION:
    (process.env.REACT_APP_ENV || process.env.NODE_ENV) === "production",
  IS_DEVELOPMENT:
    (process.env.REACT_APP_ENV || process.env.NODE_ENV) === "development",
  IS_TEST: (process.env.REACT_APP_ENV || process.env.NODE_ENV) === "test",
  ERROR_MONITORING_ENABLED: process.env.REACT_APP_ERROR_MONITORING === "true",
};

// Export IS_DEV for backward compatibility
export const IS_DEV = ENV.IS_DEVELOPMENT;

// API Configuration
export const API_CONFIG = {
  BASE_URL: ENV.API_URL,
  TIMEOUT: ENV.REQUEST_TIMEOUT,
  RETRY_ATTEMPTS: ENV.RETRY_ATTEMPTS,
  WITH_CREDENTIALS: true,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  NETWORKS: {
    MAINNET: {
      NAME: "Ethereum Mainnet",
      CHAIN_ID: "0x1",
      NETWORK_ID: 1,
      RPC_URL:
        process.env.REACT_APP_MAINNET_RPC_URL ||
        "https://mainnet.infura.io/v3/" +
          process.env.REACT_APP_INFURA_PROJECT_ID,
      EXPLORER_URL: "https://etherscan.io",
    },
    SEPOLIA: {
      NAME: "Sepolia Testnet",
      CHAIN_ID: process.env.REACT_APP_CHAIN_ID || "0xaa36a7",
      NETWORK_ID: parseInt(process.env.REACT_APP_NETWORK_ID || "11155111", 10),
      RPC_URL:
        process.env.REACT_APP_SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/" +
          process.env.REACT_APP_INFURA_PROJECT_ID,
      EXPLORER_URL:
        process.env.REACT_APP_ETHERSCAN_URL || "https://sepolia.etherscan.io",
    },
    LOCAL: {
      NAME: "Local Development",
      CHAIN_ID: "0x539",
      NETWORK_ID: 1337,
      EXPLORER_URL: "http://localhost:8545",
      RPC_URL: process.env.REACT_APP_LOCAL_RPC_URL || "http://localhost:8545",
    },
  },
  // Default to Sepolia for non-production environments, Mainnet for production
  DEFAULT_NETWORK: ENV.IS_PRODUCTION ? "MAINNET" : "SEPOLIA",
  CONTRACT_ADDRESS: process.env.REACT_APP_CONTRACT_ADDRESS,
  INFURA: {
    PROJECT_ID: process.env.REACT_APP_INFURA_PROJECT_ID,
    PROJECT_SECRET: process.env.REACT_APP_INFURA_PROJECT_SECRET,
  },
  ETHERSCAN: {
    API_KEY: process.env.REACT_APP_ETHERSCAN_API_KEY,
    URL: process.env.REACT_APP_ETHERSCAN_URL,
  },
};

// Security Configuration
export const SECURITY_CONFIG = {
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_WINDOW: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_FAILED_ATTEMPTS: ENV.IS_PRODUCTION ? 5 : 100,
  STORAGE_PREFIX: "healthmint_",
  ENCRYPTION_ENABLED: ENV.IS_PRODUCTION,
  LOCAL_STORAGE_ENABLED: process.env.REACT_APP_ENABLE_LOCAL_STORAGE === "true",
};

// Storage Configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/json",
    "text/plain",
  ],
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your internet connection.",
  AUTH: "Authentication error. Please try again.",
  WALLET: "Wallet connection error. Please check your wallet.",
  SERVER: "Server error. Please try again later.",
  PERMISSION: "You do not have permission to perform this action.",
  VALIDATION: "Please check your input and try again.",
  CONTRACT: "Smart contract error. Please try again.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

// Create a config object for default export
const config = {
  ENV,
  IS_DEV,
  API_CONFIG,
  BLOCKCHAIN_CONFIG,
  SECURITY_CONFIG,
  STORAGE_CONFIG,
  ERROR_MESSAGES,
};

// Export default configuration
export default config;
