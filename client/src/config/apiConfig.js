// client/src/config/apiConfig.js

// Environment configuration
const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  USE_MOCK_DATA: process.env.REACT_APP_USE_MOCK_DATA === "true" || false,
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || "30000", 10),
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || "3", 10),
};

// API endpoints
const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    CHALLENGE: "/api/auth/challenge",
    VERIFY: "/api/auth/wallet/verify",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
  },

  // User management
  USER: {
    PROFILE: "/api/users/profile",
    REGISTER: "/api/users/register",
    UPDATE_PROFILE: "/api/users/profile",
    UPDATE_ROLE: "/api/users/role",
    STATS: "/api/users/stats",
    AUDIT: "/api/users/audit",
  },

  // Health data management
  DATA: {
    BROWSE: "/api/data/browse",
    RECORD: "/api/data/record",
    UPLOAD: "/api/data/upload",
    PURCHASE: "/api/data/purchase",
    PATIENT_RECORDS: "/api/data/patient/records",
    RESEARCH_DATA: "/api/data/research",
    DOWNLOAD: "/api/data/download",
  },

  // Blockchain integration
  BLOCKCHAIN: {
    CONTRACT: "/api/blockchain/contract",
    TRANSACTION: "/api/blockchain/transaction",
    VERIFY: "/api/blockchain/verify",
  },

  // Storage
  STORAGE: {
    UPLOAD: "/api/storage/upload",
    DELETE: "/api/storage/delete",
  },

  // HIPAA compliance
  HIPAA: {
    CONSENT: "/api/hipaa/consent",
    AUDIT: "/api/hipaa/audit",
  },
};

const shouldUseMockData = () => {
  // Always use real data in production
  if (ENV.NODE_ENV === "production") {
    return false;
  }

  // Use environment variable in development
  return ENV.USE_MOCK_DATA;
};

const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  // Remove trailing slash from API URL if it exists
  const baseUrl = ENV.API_URL.endsWith("/")
    ? ENV.API_URL.slice(0, -1)
    : ENV.API_URL;

  return `${baseUrl}/${cleanEndpoint}`;
};

const apiConfig = {
  ENV,
  ENDPOINTS,
  shouldUseMockData,
  getApiUrl,

  // Default request configuration
  defaultConfig: {
    timeout: ENV.API_TIMEOUT,
    retryAttempts: ENV.RETRY_ATTEMPTS,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
};

export default apiConfig;
