// server/constants/index.js
// This file contains various constants and configurations used throughout the application.
import dotenv from "dotenv";
const loadEnv = () => {
  try {
    dotenv.config();
    // Basic validation for critical environment variables
    const REQUIRED_ENV_VARS = ["NODE_ENV", "JWT_SECRET"];
    const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (missingVars.length > 0) {
      console.warn(
        `⚠️ Missing required environment variables: ${missingVars.join(", ")}`
      );
    }
  } catch (error) {
    console.error("Error loading environment configuration:", error);
  }
};

loadEnv();

// Time constants for better readability (in milliseconds)
const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

export const AUDIT_TYPES = Object.freeze({
  // Data operations
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  SHARE: "share",

  // Access management
  ACCESS_GRANTED: "access_granted",
  ACCESS_REVOKED: "access_revoked",
  PURCHASE: "purchase",

  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_RESET: "password_reset",
  MFA_ENABLED: "mfa_enabled",
  MFA_DISABLED: "mfa_disabled",

  // System events
  VERIFY_INTEGRITY: "verify_integrity",
  EMERGENCY_ACCESS: "emergency_access",
  SYSTEM_ERROR: "system_error",
  CONFIGURATION_CHANGE: "configuration_change",
  DATA_EXPORT: "data_export",

  // Consent management
  CONSENT_GRANTED: "consent_granted",
  CONSENT_REVOKED: "consent_revoked",
});

export const ACCESS_LEVELS = Object.freeze({
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
  EMERGENCY: "emergency",
});

export const DATA_RETENTION = Object.freeze({
  HEALTH_RECORDS: 6 * TIME.YEAR, // 6 years (HIPAA standard)
  AUDIT_LOGS: 6 * TIME.YEAR, // 6 years
  PURCHASE_ACCESS: TIME.YEAR, // 1 year
  EMERGENCY_ACCESS: TIME.DAY, // 24 hours
  SESSION: 30 * TIME.MINUTE, // 30 minutes
  JWT_TOKEN: TIME.DAY, // 24 hours
  REFRESH_TOKEN: 30 * TIME.DAY, // 30 days
  BACKUP_RETENTION: 7 * TIME.YEAR, // 7 years (extended retention)
});

export const DATA_LIMITS = Object.freeze({
  MAX_RECORDS_PER_USER: 5000,
  MAX_STORAGE_SIZE_MB: 1000, // 1GB
  MAX_FILE_SIZE_MB: 50, // 50MB (per file)
  MAX_API_REQUESTS_PER_MINUTE: 100,
  MAX_CONCURRENT_UPLOADS: 5,
  MAX_DOWNLOAD_SIZE_MB: 200, // 200MB (per download)
  MAX_QUERY_RESULTS: 1000, // Maximum database results to return
});

export const USER_ROLES = Object.freeze({
  PATIENT: "patient", // Standard patient role
  PROVIDER: "provider", // Healthcare provider
  RESEARCHER: "researcher", // Medical researcher
  ADMIN: "admin", // System administrator
  AUDITOR: "auditor", // Security auditor
  SUPPORT: "support", // Customer support agent
});

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
  DATASET: "dataset",
};

export const API_ERRORS = Object.freeze({
  // Client errors (400 range)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Server errors (500 range)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATA_ERROR: "DATA_ERROR",
  INTEGRITY_ERROR: "INTEGRITY_ERROR",

  // HIPAA/compliance errors
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  PHI_ACCESS_DENIED: "PHI_ACCESS_DENIED",
  ENCRYPTION_ERROR: "ENCRYPTION_ERROR",

  // Blockchain/transaction errors
  BLOCKCHAIN_ERROR: "BLOCKCHAIN_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  CONTRACT_ERROR: "CONTRACT_ERROR",
  WALLET_ERROR: "WALLET_ERROR",
});

export const FILE_CONSTRAINTS = Object.freeze({
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    // Documents
    "application/pdf",
    "text/plain",
    "application/json",
    "application/xml",
    "text/csv",

    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",

    // Medical formats
    "application/dicom",
    "application/x-dicom",

    // Office formats
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  IMAGE_MAX_DIMENSIONS: {
    width: 4000,
    height: 4000,
  },

  SCAN_OPTIONS: {
    scanForViruses: true,
    verifyMimeType: true,
    validateContent: true,
  },
});

// Security settings
export const SECURITY_SETTINGS = Object.freeze({
  // Password requirements
  PASSWORD_MIN_LENGTH: process.env.NODE_ENV === "production" ? 14 : 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_COMPLEXITY:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  PASSWORD_HISTORY: 5, // Cannot reuse last 5 passwords

  // Account lockout
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
  LOCKOUT_DURATION: 15 * TIME.MINUTE, // 15 minutes
  PROGRESSIVE_DELAY: true, // Increase delay with each failed attempt

  // Session/token management
  TOKEN_EXPIRY: TIME.DAY, // 24 hours
  REFRESH_TOKEN_EXPIRY: 30 * TIME.DAY, // 30 days
  SESSION_INACTIVITY_TIMEOUT: 30 * TIME.MINUTE, // 30 minutes

  // Two-factor authentication
  REQUIRE_MFA:
    process.env.REQUIRE_MFA === "true" || process.env.NODE_ENV === "production",
  MFA_ISSUER: process.env.MFA_ISSUER || "HealthMint",
  MFA_DIGITS: 6,
  MFA_WINDOW: 1, // Default validation window (±1 token)

  // Encryption
  ENCRYPTION_ALGORITHM: "aes-256-gcm",
  PBKDF2_ITERATIONS: 100000,

  // Content Security
  ENABLE_CSP: true,
  XSS_PROTECTION: true,
  SECURE_COOKIES: process.env.NODE_ENV === "production",
  SAME_SITE_COOKIES: "strict",

  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * TIME.MINUTE, // 15 minutes
    max: 100, // 100 requests per windowMs
  },
});

export const NETWORK_CONFIG = Object.freeze({
  // Mainnet configuration
  MAINNET: {
    CHAIN_ID: 1,
    NETWORK_NAME: "Ethereum Mainnet",
    RPC_URL: getRpcUrl("mainnet"),
    BLOCK_EXPLORER: "https://etherscan.io",
    IS_TESTNET: false,
  },

  // Sepolia testnet configuration
  SEPOLIA: {
    CHAIN_ID: 11155111,
    NETWORK_NAME: "Sepolia Testnet",
    RPC_URL: getRpcUrl("sepolia"),
    BLOCK_EXPLORER: "https://sepolia.etherscan.io",
    IS_TESTNET: true,
  },

  // General transaction settings
  TRANSACTION_CONFIRMATIONS: parseInt(
    process.env.TRANSACTION_CONFIRMATIONS || "3",
    10
  ),
  GAS_LIMIT: parseInt(process.env.GAS_LIMIT || "3000000", 10),
  GAS_PRICE_STRATEGY: process.env.GAS_PRICE_STRATEGY || "medium", // "low", "medium", "high", "fastest"
  MAX_GAS_PRICE: process.env.MAX_GAS_PRICE || "100", // 100 gwei

  // Contract addresses
  CONTRACT_ADDRESSES: {
    MAIN: process.env.CONTRACT_ADDRESS,
    TOKEN: process.env.TOKEN_ADDRESS,
    REGISTRY: process.env.REGISTRY_ADDRESS,
  },
});

export const PHI_FIELDS = Object.freeze({
  DIRECT_IDENTIFIERS: [
    "name",
    "address",
    "phone",
    "email",
    "birthDate",
    "ssn",
    "mrn", // Medical Record Number
    "patientId",
    "insuranceId",
  ],

  QUASI_IDENTIFIERS: [
    "zipCode",
    "age",
    "gender",
    "race",
    "ethnicity",
    "admissionDate",
    "dischargeDate",
  ],

  SENSITIVE_FIELDS: [
    "diagnosis",
    "medications",
    "geneticData",
    "mentalHealthNotes",
    "substanceUseHistory",
    "hivStatus",
    "sexualHistory",
  ],
});

function getRpcUrl(network) {
  // Primary source - direct RPC URL from env var
  const directUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
  if (directUrl) return directUrl;

  // Secondary source - Infura with API key
  const infuraKey = process.env.INFURA_KEY || process.env.INFURA_API_KEY;
  if (infuraKey) {
    return `https://${network}.infura.io/v3/${infuraKey}`;
  }

  // Fallback to default (should be configured in production)
  return (
    process.env.DEFAULT_RPC_URL ||
    `https://${network}.infura.io/v3/YOUR-PROJECT-ID`
  );
}

export const EXPORT_FORMATS = Object.freeze({
  JSON: "json",
  CSV: "csv",
  PDF: "pdf",
  XML: "xml",
  FHIR: "fhir", // Healthcare interoperability standard
  HL7: "hl7", // Health Level 7 standard
});

export const APP_DEFAULTS = Object.freeze({
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },

  FEATURES: {
    EMERGENCY_ACCESS: process.env.FEATURE_EMERGENCY_ACCESS !== "false",
    DATA_EXPORT: process.env.FEATURE_DATA_EXPORT !== "false",
    CONSENT_MANAGEMENT: process.env.FEATURE_CONSENT_MANAGEMENT !== "false",
    BLOCKCHAIN_VERIFICATION:
      process.env.FEATURE_BLOCKCHAIN_VERIFICATION !== "false",
    HIPAA_COMPLIANCE: true, // Always enabled
  },

  NOTIFICATIONS: {
    EMAIL: process.env.NOTIFICATIONS_EMAIL !== "false",
    IN_APP: process.env.NOTIFICATIONS_IN_APP !== "false",
    SMS: process.env.NOTIFICATIONS_SMS === "true",
  },
});

// Default export for easier imports
export default {
  AUDIT_TYPES,
  ACCESS_LEVELS,
  DATA_RETENTION,
  DATA_LIMITS,
  USER_ROLES,
  DATA_CATEGORIES,
  API_ERRORS,
  FILE_CONSTRAINTS,
  SECURITY_SETTINGS,
  NETWORK_CONFIG,
  PHI_FIELDS,
  EXPORT_FORMATS,
  APP_DEFAULTS,
  TIME,
};
