// src/config/networkConfig.js
export const ENV = {
  NODE_ENV: process.env.REACT_APP_ENV || "development",
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  IPFS_HOST: process.env.REACT_APP_IPFS_HOST || "ipfs.infura.io",
  IPFS_PORT: process.env.REACT_APP_IPFS_PORT || 5001,
  IPFS_PROTOCOL: process.env.REACT_APP_IPFS_PROTOCOL || "https",
  REQUEST_TIMEOUT: parseInt(
    process.env.REACT_APP_REQUEST_TIMEOUT || "30000",
    10
  ),
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || "3", 10),
};

export const ENV_CONFIG = {
  development: {
    requestSizeLimit: "50mb",
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: 100,
    sessionDuration: 24 * 60 * 60 * 1000,
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
};

export const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_URL:
      process.env.REACT_APP_MAINNET_RPC_URL ||
      "https://mainnet.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_URL:
      process.env.REACT_APP_SEPOLIA_RPC_URL ||
      "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_URL: process.env.REACT_APP_LOCAL_RPC_URL || "http://localhost:8545",
  },
};

export const REQUEST_CONFIG = {
  timeout: ENV.REQUEST_TIMEOUT,
  retryAttempts: ENV.RETRY_ATTEMPTS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// Assign to a variable before exporting as default (to satisfy the linter)
const networkConfig = {
  ENV,
  ENV_CONFIG,
  NETWORKS,
  REQUEST_CONFIG
};

// Default export for backward compatibility
export default networkConfig;