// server/config/networkConfig.js
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
try {
  // Try to load environment from .env.local first (for local overrides)
  const localEnvPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    dotenv.config();
  }
} catch (error) {
  console.warn("Warning: Error loading .env file:", error.message);
}

// safe-parse function to handle environment variables
const env = (key, defaultValue, parser = (x) => x) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  try {
    return parser(value);
  } catch (error) {
    console.warn(
      `Warning: Failed to parse ${key}, using default:`,
      error.message
    );
    return defaultValue;
  }
};

// application-wide constants
export const ENV = {
  // Core environment settings
  NODE_ENV: env("NODE_ENV", "development"),
  IS_PRODUCTION: env("NODE_ENV", "development") === "production",
  IS_DEVELOPMENT: env("NODE_ENV", "development") === "development",
  IS_TEST: env("NODE_ENV", "development") === "test",

  // API Settings
  API_URL: env("API_URL", "http://localhost:5000"),
  API_VERSION: env("API_VERSION", "v1"),

  // IPFS Configuration
  IPFS_HOST: env("IPFS_HOST", "ipfs.infura.io"),
  IPFS_PORT: env("IPFS_PORT", 5001, parseInt),
  IPFS_PROTOCOL: env("IPFS_PROTOCOL", "https"),
  IPFS_PROJECT_ID: env("IPFS_PROJECT_ID", ""),
  IPFS_PROJECT_SECRET: env("IPFS_PROJECT_SECRET", ""),

  // Request handling
  REQUEST_TIMEOUT: env("REQUEST_TIMEOUT", 30000, parseInt),
  RETRY_ATTEMPTS: env("RETRY_ATTEMPTS", 3, parseInt),
  RETRY_DELAY: env("RETRY_DELAY", 1000, parseInt),

  // Default gas settings
  DEFAULT_GAS_LIMIT: env("DEFAULT_GAS_LIMIT", 3000000, parseInt),
  DEFAULT_GAS_PRICE: env("DEFAULT_GAS_PRICE", "auto"), // "auto" or number in gwei
  DEFAULT_MAX_FEE_PER_GAS: env("DEFAULT_MAX_FEE_PER_GAS", "auto"),
  DEFAULT_MAX_PRIORITY_FEE_PER_GAS: env(
    "DEFAULT_MAX_PRIORITY_FEE_PER_GAS",
    "auto"
  ),
};

// Network configuration
export const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_URL: env(
      "MAINNET_RPC_URL",
      "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
    ),
    BLOCK_CONFIRMATIONS: env("MAINNET_CONFIRMATIONS", 3, parseInt),
    IS_TESTNET: false,
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_URL: env(
      "SEPOLIA_RPC_URL",
      "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
    ),
    BLOCK_CONFIRMATIONS: env("SEPOLIA_CONFIRMATIONS", 1, parseInt),
    IS_TESTNET: true,
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_URL: env("LOCAL_RPC_URL", "http://localhost:8545"),
    BLOCK_CONFIRMATIONS: env("LOCAL_CONFIRMATIONS", 1, parseInt),
    IS_TESTNET: true,
  },
};

// Add more networks as needed
export const getCurrentNetwork = () => {
  const networkName = env("NETWORK", "SEPOLIA").toUpperCase();
  if (!NETWORKS[networkName]) {
    console.warn(
      `Warning: Network ${networkName} not found, defaulting to SEPOLIA`
    );
    return NETWORKS.SEPOLIA;
  }
  return NETWORKS[networkName];
};

// Set the default network
export const TRANSACTION_CONFIG = {
  // Default gas settings
  gasLimit: ENV.DEFAULT_GAS_LIMIT,
  maxFeePerGas: ENV.DEFAULT_MAX_FEE_PER_GAS,
  maxPriorityFeePerGas: ENV.DEFAULT_MAX_PRIORITY_FEE_PER_GAS,

  // Transaction confirmations
  confirmations: ENV.IS_PRODUCTION ? 3 : 1,

  // Transaction timing
  pollingInterval: ENV.IS_PRODUCTION ? 10000 : 1000, // ms
  timeoutBlocks: ENV.IS_PRODUCTION ? 50 : 10,
  replacementRetryWaitTime: 30000, // 30 seconds
};

// Request configuration
export const REQUEST_CONFIG = {
  timeout: ENV.REQUEST_TIMEOUT,
  retryAttempts: ENV.RETRY_ATTEMPTS,
  retryDelay: ENV.RETRY_DELAY,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Version": ENV.API_VERSION,
  },
  // Function to build authentication headers
  getAuthHeaders: (token) => ({
    Authorization: `Bearer ${token}`,
  }),
};

// standard error codes
export const ERROR_CODES = {
  // 400 range (client errors)
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    status: 400,
    message: "Invalid input data",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    status: 401,
    message: "Authentication required",
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    status: 403,
    message: "Access denied",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    status: 404,
    message: "Resource not found",
  },
  RATE_LIMIT: {
    code: "RATE_LIMIT_EXCEEDED",
    status: 429,
    message: "Too many requests",
  },

  // 500 range (server errors)
  SERVER_ERROR: {
    code: "SERVER_ERROR",
    status: 500,
    message: "Internal server error",
  },
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    status: 503,
    message: "Network connection error",
  },

  // Blockchain specific errors
  TRANSACTION_ERROR: {
    code: "TRANSACTION_ERROR",
    status: 400,
    message: "Blockchain transaction failed",
  },
  CONTRACT_ERROR: {
    code: "CONTRACT_ERROR",
    status: 400,
    message: "Smart contract operation failed",
  },
  GAS_ESTIMATION_ERROR: {
    code: "GAS_ESTIMATION_ERROR",
    status: 400,
    message: "Failed to estimate gas for transaction",
  },
  WALLET_CONNECTION_ERROR: {
    code: "WALLET_CONNECTION_ERROR",
    status: 500,
    message: "Failed to connect to wallet",
  },
};

// api endpoints
export const ENDPOINTS = {
  USERS: {
    BASE: "/users",
    PROFILE: "/profile",
    SETTINGS: "/settings",
    ACCESS_LOG: "/access-log",
    CONSENT: "/consent",
    // Helper to build full endpoint paths
    getPath: (endpoint) => `${ENDPOINTS.USERS.BASE}${endpoint}`,
  },
  PROFILE: {
    BASE: "/profile",
    STATS: "/stats",
    UPDATE: "/update",
    IMAGE: "/image",
    AUDIT: "/audit",
    DELETE: "/delete",
    // Helper to build full endpoint paths
    getPath: (endpoint) => `${ENDPOINTS.PROFILE.BASE}${endpoint}`,
  },
  DATA: {
    BASE: "/data",
    UPLOAD: "/upload",
    PURCHASE: "/purchase",
    BROWSE: "/browse",
    AUDIT: "/audit",
    EMERGENCY: "/emergency-access",
    // Helper to build full endpoint paths
    getPath: (endpoint) => `${ENDPOINTS.DATA.BASE}${endpoint}`,
  },
  AUTH: {
    BASE: "/auth",
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFY: "/verify",
    CONNECT: "/wallet/connect",
    // Helper to build full endpoint paths
    getPath: (endpoint) => `${ENDPOINTS.AUTH.BASE}${endpoint}`,
  },
  // Helper to get a fully qualified URL
  getFullUrl: (endpoint) => `${ENV.API_URL}${endpoint}`,
};

// network utility functions
export const NetworkUtils = {
  // Get the current network configuration
  isValidNetwork: (network) => {
    return !!(
      network &&
      network.RPC_URL &&
      network.CHAIN_ID &&
      network.NETWORK_ID
    );
  },

  // format a wallet address for display
  formatAddress: (address, prefixLength = 6, suffixLength = 4) => {
    if (!address || address.length < prefixLength + suffixLength) {
      return address;
    }
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
  },

  // format a transaction hash for display
  formatTxHash: (hash, length = 10) => {
    if (!hash || hash.length <= length) return hash;
    return `${hash.slice(0, length)}...`;
  },

  // format a block number for display
  getExplorerUrl: (type, value, network = getCurrentNetwork()) => {
    if (!value || !network || !network.EXPLORER_URL) return "";

    switch (type.toLowerCase()) {
      case "address":
        return `${network.EXPLORER_URL}/address/${value}`;
      case "tx":
      case "transaction":
        return `${network.EXPLORER_URL}/tx/${value}`;
      case "token":
        return `${network.EXPLORER_URL}/token/${value}`;
      case "block":
        return `${network.EXPLORER_URL}/block/${value}`;
      default:
        return `${network.EXPLORER_URL}/${type}/${value}`;
    }
  },
};

// Set the default required network
export const requiredNetwork = getCurrentNetwork();

// Export a default object for easier imports
export default {
  ENV,
  NETWORKS,
  REQUEST_CONFIG,
  ERROR_CODES,
  ENDPOINTS,
  NetworkUtils,
  requiredNetwork,
  getCurrentNetwork,
};
