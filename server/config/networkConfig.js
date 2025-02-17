// config/networkConfig.js

// Environment variables
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.API_URL || "http://localhost:5000",
  IPFS_HOST: process.env.IPFS_HOST || "ipfs.infura.io",
  IPFS_PORT: process.env.IPFS_PORT || 5001,
  IPFS_PROTOCOL: process.env.IPFS_PROTOCOL || "https",
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || "30000", 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || "3", 10),
};

// Export configuration
export const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_SUFFIX: "mainnet",
    GAS: {
      PRICE: 50000000000, // 50 gwei
      LIMIT: {
        DEPLOYMENT: 5000000,
        METHOD: 200000,
      },
    },
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_SUFFIX: "sepolia",
    GAS: {
      PRICE: 20000000000, // 20 gwei
      LIMIT: {
        DEPLOYMENT: 5500000,
        METHOD: 300000,
      },
    },
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_SUFFIX: "localhost",
    GAS: {
      PRICE: 0,
      LIMIT: {
        DEPLOYMENT: 6000000,
        METHOD: 500000,
      },
    },
  },
};

// API endpoints
export const ENDPOINTS = {
  AUTH: {
    CONNECT: "/auth/wallet/connect",
    REGISTER: "/auth/register",
    VERIFY: "/auth/verify",
    CONSENT: "/auth/consent",
    REFRESH: "/auth/session-refresh",
  },
  DATA: {
    UPLOAD: "/data/upload",
    GET: "/data/user",
    PURCHASE: "/data/purchase",
    AUDIT: "/data/audit",
    EMERGENCY: "/data/emergency-access",
  },
  PROFILE: {
    STATS: "/profile/stats",
    UPDATE: "/profile/update",
    IMAGE: "/profile/image",
    AUDIT: "/profile/audit",
    DELETE: "/profile/delete",
  },
  USERS: {
    PROFILE: "/users/profile",
    ACCESS_LOG: "/users/access-log",
    CONSENT: "/users/consent",
    SETTINGS: "/users/settings",
  },
};

// Export configurations
export const ENV_CONFIG = {
  development: {
    requestSizeLimit: "50mb",
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    defaultPort: 5000,
    shutdownTimeout: 10000,
    enableLogging: true,
    enableCSP: false,
    cors: {
      origins: ["http://localhost:3000", "http://localhost:5000"],
      credentials: true,
    },
    rpcProvider: {
      timeout: 30000,
      retries: 3,
    },
  },
  production: {
    requestSizeLimit: "10mb",
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: 50,
    sessionDuration: 12 * 60 * 60 * 1000, // 12 hours
    defaultPort: process.env.PORT || 5000,
    shutdownTimeout: 30000,
    enableLogging: true,
    enableCSP: true,
    cors: {
      origins: ["https://healthmint.io", "https://api.healthmint.io"],
      credentials: true,
    },
    rpcProvider: {
      timeout: 30000,
      retries: 3,
    },
  },
};

// Error codes and messages
export const ERROR_CODES = {
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
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    status: 503,
    message: "Network connection error",
  },
  SERVER_ERROR: {
    code: "SERVER_ERROR",
    status: 500,
    message: "Internal server error",
  },
};

// Network utility functions
export const networkUtils = {
  getNetworkByChainId: (chainId) => {
    return Object.values(NETWORKS).find(
      (network) => network.CHAIN_ID === chainId
    );
  },

  isNetworkSupported: (chainId) => {
    return !!networkUtils.getNetworkByChainId(chainId);
  },

  getRpcUrl: (network) => {
    const projectId = process.env.REACT_APP_INFURA_PROJECT_ID;
    if (projectId && network.RPC_SUFFIX) {
      return `https://${network.RPC_SUFFIX}.infura.io/v3/${projectId}`;
    }
    return network.NAME === "development"
      ? "http://localhost:8545"
      : `https://rpc.${network.RPC_SUFFIX}.org`;
  },

  getExplorerUrl: (network, hash, type = "tx") => {
    return `${network.EXPLORER_URL}/${type}/${hash}`;
  },
};

// Request configuration
export const REQUEST_CONFIG = {
  timeout: ENV.REQUEST_TIMEOUT,
  retryAttempts: ENV.RETRY_ATTEMPTS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
