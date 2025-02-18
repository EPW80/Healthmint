import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.API_URL || "http://localhost:5000",
  IPFS_HOST: process.env.IPFS_HOST || "ipfs.infura.io",
  IPFS_PORT: process.env.IPFS_PORT || 5001,
  IPFS_PROTOCOL: process.env.IPFS_PROTOCOL || "https",
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || "30000", 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || "3", 10),
};

export const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_URL: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_URL: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_URL: process.env.LOCAL_RPC_URL || "http://localhost:8545",
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

export const requiredNetwork = NETWORKS.SEPOLIA;
