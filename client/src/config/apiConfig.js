// client/src/config/apiConfig.js

// Environment configuration with better defaults and fallbacks
const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  // Handle both standalone API and integrated API paths
  API_URL: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000"),
  // Enhanced mock data control
  USE_MOCK_DATA: process.env.REACT_APP_USE_MOCK_DATA === "true" || 
    process.env.NODE_ENV !== "production" || 
    !process.env.REACT_APP_API_URL,
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || "30000", 10),
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || "3", 10),
};

// API endpoints - all relative without base URL
const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    CHALLENGE: "/auth/challenge",
    VERIFY: "/auth/wallet/verify",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    WALLET_CONNECT: "/auth/wallet/connect",
  },

  // User management
  USER: {
    PROFILE: "/users/profile",
    REGISTER: "/users/register",
    UPDATE_PROFILE: "/users/profile",
    UPDATE_ROLE: "/users/role",
    STATS: "/users/stats",
    AUDIT: "/users/audit",
  },

  // Health data management
  DATA: {
    BROWSE: "/data/browse",
    RECORD: "/data/record",
    UPLOAD: "/data/upload",
    PURCHASE: "/data/purchase",
    PATIENT_RECORDS: "/data/patient/records",
    RESEARCH_DATA: "/data/research",
    DOWNLOAD: "/data/download",
  },

  // Blockchain integration
  BLOCKCHAIN: {
    CONTRACT: "/blockchain/contract",
    TRANSACTION: "/blockchain/transaction",
    VERIFY: "/blockchain/verify",
  },

  // Storage
  STORAGE: {
    UPLOAD: "/storage/upload",
    DELETE: "/storage/delete",
  },

  // HIPAA compliance
  HIPAA: {
    CONSENT: "/hipaa/consent",
    AUDIT: "/hipaa/audit",
  },
};

// Enhanced logic for mock data decisions
const shouldUseMockData = (forceMock = false) => {
  // Always use mock if explicitly forced
  if (forceMock) return true;
  
  // Always use real data in production unless no API URL is set
  if (ENV.NODE_ENV === "production") {
    return !ENV.API_URL;
  }

  // Use environment variable or default to true in development
  return ENV.USE_MOCK_DATA;
};

// Improved URL construction for consistent paths
const getApiUrl = (endpoint) => {
  // Don't process if mock data should be used
  if (shouldUseMockData()) {
    console.log(`Using mock data for: ${endpoint}`);
    return null;
  }
  
  // Clean up endpoint format
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  
  // If API_URL is empty, use relative paths with /api prefix
  if (!ENV.API_URL) {
    return `/api/${cleanEndpoint}`;
  }
  
  // Remove trailing slash from API URL if it exists
  const baseUrl = ENV.API_URL.endsWith("/")
    ? ENV.API_URL.slice(0, -1)
    : ENV.API_URL;

  return `${baseUrl}/${cleanEndpoint}`;
};

// Handle API requests with proper error handling and fallbacks
const fetchWithFallback = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  // If URL is null, we're in mock mode
  if (!url) {
    throw new Error("MOCK_MODE_ENABLED");
  }
  
  try {
    console.log(`Making API request to: ${url}`);
    const response = await fetch(url, options);
    
    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`API returned non-JSON response: ${text.substring(0, 100)}...`);
      throw new Error("NON_JSON_RESPONSE");
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    
    // Determine if we should fall back to mock data
    if (ENV.NODE_ENV !== "production" || ENV.USE_MOCK_DATA) {
      console.warn(`Falling back to mock data for: ${endpoint}`);
      return null; // Signal to service to use mock data
    }
    
    throw error;
  }
};

const apiConfig = {
  ENV,
  ENDPOINTS,
  shouldUseMockData,
  getApiUrl,
  fetchWithFallback,

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
