require("dotenv").config();
const crypto = require("crypto");

// HIPAA Configuration
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
    if (!process.env.ENCRYPTION_KEY) {
      console.error("ENCRYPTION_KEY not found in environment variables");
      process.exit(1);
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not found in environment variables");
      process.exit(1);
    }

    // Verify encryption key length
    if (
      Buffer.from(process.env.ENCRYPTION_KEY, "hex").length !==
      hipaaConfig.security.encryption.keyLength
    ) {
      console.error("ENCRYPTION_KEY must be exactly 32 bytes");
      process.exit(1);
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
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    return true;
  },
};

module.exports = hipaaConfig;
