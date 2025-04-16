// config/hipaaConfig.js
import crypto from "crypto";

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
  CONFIGURATION_ERROR: {
    code: "HIPAA_CONFIGURATION_ERROR",
    status: 500,
    message: "Invalid HIPAA configuration",
  },
};

export class HIPAAError extends Error {
  constructor(code, message, details = {}) {
    super(message || ERROR_CODES[code]?.message || "HIPAA compliance error");
    this.name = "HIPAAError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Time constants for better readability
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

const DEFAULT_CONFIG = {
  // Security Configuration
  security: {
    encryption: {
      algorithm: "aes-256-gcm", // Most secure symmetric encryption algorithm
      keyLength: 32, // 256 bits
      ivLength: 16, // 128 bits
      saltLength: 16, // 128 bits
      iterations: 100000, // PBKDF2 iterations for key derivation
      digest: "sha512", // Hash algorithm for key derivation
    },

    session: {
      timeout: 30 * TIME_CONSTANTS.MINUTE, // 30 minutes
      maxAttempts: 3, // Max login attempts before lockout
      lockoutDuration: 30 * TIME_CONSTANTS.MINUTE, // Lockout duration after failed attempts
    },

    password: {
      minLength: 12, // Minimum password length
      requireUppercase: true, // Must contain uppercase letters
      requireLowercase: true, // Must contain lowercase letters
      requireNumbers: true, // Must contain numbers
      requireSpecialChars: true, // Must contain special characters
      expirationDays: 90, // Password expires after 90 days
    },
  },

  // Audit Configuration
  audit: {
    enabled: true,
    detailedLogging: process.env.NODE_ENV === "production",
    retentionPeriod: 6 * TIME_CONSTANTS.YEAR, // 6 years (HIPAA requirement)
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
      timeout: 30 * TIME_CONSTANTS.MINUTE, // Emergency access timeout
      requireReason: true, // Require reason for emergency access
      notifyPatient: true, // Notify patient of emergency access
    },
  },

  // Data Retention Configuration
  retention: {
    medicalRecords: 6 * TIME_CONSTANTS.YEAR, // 6 years (HIPAA requirement)
    auditLogs: 6 * TIME_CONSTANTS.YEAR, // 6 years
    backupFrequency: TIME_CONSTANTS.DAY, // Daily backups
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
};

class HIPAAConfig {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initialized = false;
  }

  /**
   * Initialize the configuration with environment variables
   * @returns {Object} Initialized configuration
   * @throws {HIPAAError} If required environment variables are missing
   */
  initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      // Validate required environment variables
      this.validateEnvironment();

      // Initialize encryption key and JWT secret
      this.encryptionKey = process.env.ENCRYPTION_KEY;
      this.jwtSecret = process.env.JWT_SECRET;

      // Verify encryption key length
      const keyBuffer = Buffer.from(this.encryptionKey, "hex");
      if (keyBuffer.length !== this.config.security.encryption.keyLength) {
        throw new HIPAAError(
          "ENCRYPTION_ERROR",
          `ENCRYPTION_KEY must be exactly ${this.config.security.encryption.keyLength} bytes`
        );
      }

      // Override config with environment variables if present
      this.applyEnvironmentOverrides();

      this.initialized = true;
      return this;
    } catch (error) {
      if (error instanceof HIPAAError) {
        throw error;
      }
      throw new HIPAAError(
        "CONFIGURATION_ERROR",
        `Failed to initialize HIPAA configuration: ${error.message}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate required environment variables
   * @throws {HIPAAError} If required variables are missing
   */
  validateEnvironment() {
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
  }

  /**
   * Apply environment-specific overrides to default configuration
   */
  applyEnvironmentOverrides() {
    // Example of environment variable overrides (can add more as needed)
    if (process.env.HIPAA_SESSION_TIMEOUT) {
      this.config.security.session.timeout =
        parseInt(process.env.HIPAA_SESSION_TIMEOUT, 10) * 60 * 1000;
    }

    if (process.env.HIPAA_PASSWORD_MIN_LENGTH) {
      this.config.security.password.minLength = parseInt(
        process.env.HIPAA_PASSWORD_MIN_LENGTH,
        10
      );
    }

    if (process.env.HIPAA_AUDIT_ENABLED === "false") {
      this.config.audit.enabled = false;
    }
  }

  /**
   * Encrypt data using HIPAA-compliant encryption
   * @param {string|Object} data - Data to encrypt
   * @returns {Object} Encrypted data object with IV and auth tag
   */
  encrypt(data) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // Convert data to string if it's an object
      const dataString =
        typeof data === "object" ? JSON.stringify(data) : String(data);

      // Generate a random initialization vector (IV)
      const iv = crypto.randomBytes(this.config.security.encryption.ivLength);

      // Create cipher with the encryption key and IV
      const cipher = crypto.createCipheriv(
        this.config.security.encryption.algorithm,
        Buffer.from(this.encryptionKey, "hex"),
        iv
      );

      // Encrypt the data
      let encrypted = cipher.update(dataString, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get the authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag().toString("hex");

      return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag,
      };
    } catch (error) {
      throw new HIPAAError(
        "ENCRYPTION_ERROR",
        `Failed to encrypt data: ${error.message}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Decrypt data using HIPAA-compliant decryption
   * @param {string} encryptedData - Encrypted data hex string
   * @param {string} iv - Initialization vector hex string
   * @param {string} authTag - Authentication tag hex string
   * @returns {string|Object} Decrypted data
   */
  decrypt(encryptedData, iv, authTag) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // Create decipher with the encryption key and IV
      const decipher = crypto.createDecipheriv(
        this.config.security.encryption.algorithm,
        Buffer.from(this.encryptionKey, "hex"),
        Buffer.from(iv, "hex")
      );

      // Set authentication tag (for GCM mode)
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Try to parse as JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch (e) {
        // Return as string if not valid JSON
        return decrypted;
      }
    } catch (error) {
      throw new HIPAAError(
        "ENCRYPTION_ERROR",
        `Failed to decrypt data: ${error.message}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate a secure hash for data integrity checks
   * @param {string} data - Data to hash
   * @returns {string} Hash string
   */
  generateHash(data) {
    return crypto
      .createHash(this.config.security.encryption.digest)
      .update(data)
      .digest("hex");
  }

  /**
   * Create an audit log entry
   * @param {string} action - Action performed
   * @param {Object} details - Audit details
   * @returns {boolean} Success status
   */
  createAuditLog(action, details = {}) {
    if (!this.config.audit.enabled) {
      return false;
    }

    try {
      // This would typically call your audit logging service
      // For now, we'll just log to console in non-production
      if (process.env.NODE_ENV !== "production") {
        console.log("HIPAA Audit Log:", {
          action,
          timestamp: new Date(),
          ...details,
        });
      }

      // Implement your actual audit logging here
      // e.g., save to database, send to monitoring service, etc.

      return true;
    } catch (error) {
      console.error("Audit logging error:", error);
      return false;
    }
  }

  /**
   * Log an error in audit logs
   * @param {Object} errorDetails - Error details
   */
  logError(errorDetails) {
    return this.createAuditLog("error", errorDetails);
  }

  /**
   * Log an event in audit logs
   * @param {Object} eventDetails - Event details
   */
  logEvent(eventDetails) {
    return this.createAuditLog("event", eventDetails);
  }
}

const hipaaConfigInstance = new HIPAAConfig().initialize();

export { hipaaConfigInstance as hipaaConfig };
export default hipaaConfigInstance;
