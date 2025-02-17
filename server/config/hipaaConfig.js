// config/hipaaConfig.js
import { scrypt } from "crypto";
import { promisify } from "util";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const scryptAsync = promisify(scrypt);

export const ERROR_CODES = {
  VALIDATION_ERROR: {
    code: "HIPAA_VALIDATION_ERROR",
    status: 400,
    message: "Invalid HIPAA-compliant data format",
  },
  UNAUTHORIZED: {
    code: "HIPAA_UNAUTHORIZED",
    status: 401,
    message: "Unauthorized access to protected health information",
  },
  FORBIDDEN: {
    code: "HIPAA_FORBIDDEN",
    status: 403,
    message: "Access to protected health information denied",
  },
  INTEGRITY_ERROR: {
    code: "HIPAA_INTEGRITY_ERROR",
    status: 400,
    message: "Data integrity check failed",
  },
  ENCRYPTION_ERROR: {
    code: "HIPAA_ENCRYPTION_ERROR",
    status: 500,
    message: "Data encryption failed",
  },
  CONSENT_REQUIRED: {
    code: "HIPAA_CONSENT_REQUIRED",
    status: 403,
    message: "Patient consent required for this operation",
  },
};

export class HIPAAError extends Error {
  constructor(code, message, details = {}) {
    super(message || ERROR_CODES[code]?.message);
    this.name = "HIPAAError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const hipaaConfig = {
  // Security Configuration
  security: {
    encryption: {
      algorithm: "aes-256-gcm",
      keyLength: 32,
      ivLength: 16,
      saltLength: 16,
      iterations: 100000,
      digest: "sha512",
    },

    session: {
      timeout: 30 * 60 * 1000, // 30 minutes in milliseconds
      maxAttempts: 3,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
    },

    password: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expirationDays: 90,
    },
  },

  // Audit Configuration
  audit: {
    enabled: true,
    detailedLogging: process.env.NODE_ENV === "production",
    retentionPeriod: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years in milliseconds
    logTypes: ["access", "modification", "deletion", "authentication"],
  },

  // Data Access Configuration
  access: {
    roles: {
      patient: ["read_own", "write_own"],
      provider: ["read_assigned", "write_assigned", "emergency_access"],
      admin: ["read_all", "write_all", "delete", "audit"],
    },
    emergencyAccess: {
      timeout: 30 * 60 * 1000, // 30 minutes
      requireReason: true,
      notifyPatient: true,
    },
  },

  // Data Retention Configuration
  retention: {
    medicalRecords: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
    auditLogs: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
    backupFrequency: 24 * 60 * 60 * 1000, // Daily
  },

  // PHI Fields Configuration
  phi: {
    identifiers: [
      "name",
      "address",
      "email",
      "phone",
      "dob",
      "ssn",
      "mrn",
      "insurance",
    ],
    sensitiveFields: ["diagnosis", "treatment", "medication", "labResults"],
  },

  // Initialize security keys and credentials
  initialize: () => {
    console.log("ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY);
    console.log("All Environment Variables:", process.env);

    if (!process.env.ENCRYPTION_KEY) {
      throw new HIPAAError(
        "ENCRYPTION_ERROR",
        "ENCRYPTION_KEY not found in environment variables"
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new HIPAAError(
        "ENCRYPTION_ERROR",
        "JWT_SECRET not found in environment variables"
      );
    }

    // Verify encryption key length
    if (
      Buffer.from(process.env.ENCRYPTION_KEY, "hex").length !==
      hipaaConfig.security.encryption.keyLength
    ) {
      throw new HIPAAError(
        "ENCRYPTION_ERROR",
        "ENCRYPTION_KEY must be exactly 32 bytes"
      );
    }

    return {
      encryptionKey: process.env.ENCRYPTION_KEY,
      jwtSecret: process.env.JWT_SECRET,
      initialized: true,
    };
  },

  // Validate configuration
  validate: () => {
    const requiredEnvVars = [
      "ENCRYPTION_KEY",
      "JWT_SECRET",
      "MONGODB_URI",
      "NODE_ENV",
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new HIPAAError(
        "VALIDATION_ERROR",
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    return true;
  },
};

// Create singleton instance with initialization
const config = hipaaConfig.initialize();
const instance = { ...hipaaConfig, ...config };

export { instance as hipaaConfig };
export default instance;
