// constants/index.js

// Audit types for logging and tracking
const AUDIT_TYPES = {
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

// Access control levels
const ACCESS_LEVELS = {
  READ: "read",
  WRITE: "write",
  ADMIN: "admin",
  EMERGENCY: "emergency",
};

// Data retention periods (in milliseconds)
const DATA_RETENTION = {
  HEALTH_RECORDS: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
  AUDIT_LOGS: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
  PURCHASE_ACCESS: 365 * 24 * 60 * 60 * 1000, // 1 year
  EMERGENCY_ACCESS: 24 * 60 * 60 * 1000, // 24 hours
  SESSION: 30 * 60 * 1000, // 30 minutes
};

// User roles
const USER_ROLES = {
  PATIENT: "patient",
  PROVIDER: "provider",
  RESEARCHER: "researcher",
  ADMIN: "admin",
};

// Data categories
const DATA_CATEGORIES = {
  GENERAL_HEALTH: "General Health",
  CARDIOLOGY: "Cardiology",
  NEUROLOGY: "Neurology",
  ORTHOPEDICS: "Orthopedics",
  PEDIATRICS: "Pediatrics",
  LABORATORY: "Laboratory",
  RADIOLOGY: "Radiology",
  GENETICS: "Genetics",
  MENTAL_HEALTH: "Mental Health",
  DENTAL: "Dental",
};

// API error codes
const API_ERRORS = {
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

// File constraints
const FILE_CONSTRAINTS = {
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

// Security settings
const SECURITY_SETTINGS = {
  PASSWORD_MIN_LENGTH: 12,
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  REQUIRE_MFA: process.env.NODE_ENV === "production",
};

module.exports = {
  AUDIT_TYPES,
  ACCESS_LEVELS,
  DATA_RETENTION,
  USER_ROLES,
  DATA_CATEGORIES,
  API_ERRORS,
  FILE_CONSTRAINTS,
  SECURITY_SETTINGS,
};
