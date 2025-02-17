import dotenv from 'dotenv';
dotenv.config();

export const AUDIT_TYPES = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  SHARE: "share",
  ACCESS_GRANTED: "access_granted",
  ACCESS_REVOKED: "access_revoked",
  PURCHASE: "purchase",
  LOGIN: "login",
  LOGOUT: "logout",
  VERIFY_INTEGRITY: "verify_integrity",
  EMERGENCY_ACCESS: "emergency_access",
};

export const ACCESS_LEVELS = {
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
  EMERGENCY: "emergency",
};

export const DATA_RETENTION = {
  HEALTH_RECORDS: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
  AUDIT_LOGS: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
  PURCHASE_ACCESS: 365 * 24 * 60 * 60 * 1000, // 1 year
  EMERGENCY_ACCESS: 24 * 60 * 60 * 1000, // 24 hours
  SESSION: 30 * 60 * 1000, // 30 minutes
};

export const DATA_LIMITS = {
  MAX_RECORDS_PER_USER: 5000,
  MAX_STORAGE_SIZE_MB: 1000, // 1GB
};

export const USER_ROLES = {
  PATIENT: "patient",
  PROVIDER: "provider",
  RESEARCHER: "researcher",
  ADMIN: "admin",
};

export const DATA_CATEGORIES = {
  GENERAL_HEALTH: "general_health",
  CARDIOLOGY: "cardiology",
  NEUROLOGY: "neurology",
  ORTHOPEDICS: "orthopedics",
  PEDIATRICS: "pediatrics",
  LABORATORY: "laboratory",
  RADIOLOGY: "radiology",
  GENETICS: "genetics",
  MENTAL_HEALTH: "mental_health",
  DENTAL: "dental",
};

export const API_ERRORS = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATA_ERROR: "DATA_ERROR",
  INTEGRITY_ERROR: "INTEGRITY_ERROR",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
};

export const FILE_CONSTRAINTS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/dicom",
    "application/json",
    "text/plain",
  ],
};

export const SECURITY_SETTINGS = {
  PASSWORD_MIN_LENGTH: process.env.NODE_ENV === "production" ? 14 : 8,
  PASSWORD_COMPLEXITY: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{12,}$/,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  REQUIRE_MFA: process.env.REQUIRE_MFA === "true",
};

export const NETWORK_CONFIG = {
  MAINNET: {
    CHAIN_ID: 1,
    RPC_URL: process.env.INFURA_KEY 
      ? `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
      : process.env.RPC_URL,
    BLOCK_EXPLORER: "https://etherscan.io",
  },
  SEPOLIA: {
    CHAIN_ID: 11155111,
    RPC_URL: process.env.INFURA_KEY
      ? `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
      : process.env.SEPOLIA_RPC_URL,
    BLOCK_EXPLORER: "https://sepolia.etherscan.io",
  },
  TRANSACTION_CONFIRMATIONS: 3,
  GAS_LIMIT: process.env.GAS_LIMIT || 3000000,
};

