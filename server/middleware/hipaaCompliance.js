const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Constants and configurations
const CONSTANTS = {
  ENCRYPTION: {
    ALGORITHM: "aes-256-gcm",
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    AUTH_TAG_LENGTH: 16,
    KEY_DERIVATION: {
      ITERATIONS: 100000,
      DIGEST: "sha512",
      SALT_LENGTH: 64,
    },
    VERSION: "1.0",
  },
  ACCESS: {
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    EMERGENCY_ACCESS_DURATION: 30 * 60 * 1000, // 30 minutes
    MAX_FAILED_ATTEMPTS: 3,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },
  AUDIT: {
    RETENTION_PERIOD: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
    LOG_LEVELS: ["INFO", "WARNING", "ERROR", "EMERGENCY"],
  },
};

class HIPAAComplianceError extends Error {
  constructor(message, code = "HIPAA_COMPLIANCE_ERROR", details = {}) {
    super(message);
    this.name = "HIPAAComplianceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Validation utils
const validateEncryptionKey = (key) => {
  if (!key) throw new HIPAAComplianceError("Encryption key not configured");
  if (Buffer.from(key, "hex").length !== CONSTANTS.ENCRYPTION.KEY_LENGTH) {
    throw new HIPAAComplianceError("Invalid encryption key length");
  }
  return true;
};

const validateInput = (input) => {
  if (input === undefined || input === null) {
    throw new HIPAAComplianceError("Invalid input for encryption");
  }
  return true;
};

const hipaaCompliance = {
  // Enhanced encryption with key derivation
  async encrypt(text, purpose = "general") {
    try {
      validateEncryptionKey(process.env.ENCRYPTION_KEY);
      validateInput(text);

      // Generate a unique salt for key derivation
      const salt = crypto.randomBytes(
        CONSTANTS.ENCRYPTION.KEY_DERIVATION.SALT_LENGTH
      );

      // Derive a unique key for this encryption
      const derivedKey = await this.deriveKey(
        process.env.ENCRYPTION_KEY,
        salt,
        purpose
      );

      // Generate IV and setup cipher
      const iv = crypto.randomBytes(CONSTANTS.ENCRYPTION.IV_LENGTH);
      const cipher = crypto.createCipheriv(
        CONSTANTS.ENCRYPTION.ALGORITHM,
        derivedKey,
        iv
      );

      // Encrypt the data
      const stringData = typeof text === "string" ? text : JSON.stringify(text);
      let encrypted = cipher.update(stringData, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();

      // Return encrypted data with metadata
      return {
        version: CONSTANTS.ENCRYPTION.VERSION,
        iv: iv.toString("hex"),
        salt: salt.toString("hex"),
        encryptedData: encrypted,
        authTag: authTag.toString("hex"),
        purpose,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HIPAAComplianceError("Encryption failed", "ENCRYPTION_ERROR", {
        originalError: error.message,
      });
    }
  },

  // Enhanced decryption with key derivation
  async decrypt(encryptedPackage) {
    try {
      validateEncryptionKey(process.env.ENCRYPTION_KEY);
      validateInput(encryptedPackage);

      const { version, iv, salt, encryptedData, authTag, purpose } =
        encryptedPackage;

      // Version check for backwards compatibility
      if (version !== CONSTANTS.ENCRYPTION.VERSION) {
        return this.legacyDecrypt(encryptedPackage);
      }

      // Derive the same key used for encryption
      const derivedKey = await this.deriveKey(
        process.env.ENCRYPTION_KEY,
        Buffer.from(salt, "hex"),
        purpose
      );

      // Setup decipher
      const decipher = crypto.createDecipheriv(
        CONSTANTS.ENCRYPTION.ALGORITHM,
        derivedKey,
        Buffer.from(iv, "hex")
      );

      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new HIPAAComplianceError("Decryption failed", "DECRYPTION_ERROR", {
        originalError: error.message,
      });
    }
  },

  // Key derivation function
  async deriveKey(masterKey, salt, purpose) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        masterKey,
        Buffer.concat([salt, Buffer.from(purpose)]),
        CONSTANTS.ENCRYPTION.KEY_DERIVATION.ITERATIONS,
        CONSTANTS.ENCRYPTION.KEY_LENGTH,
        CONSTANTS.ENCRYPTION.KEY_DERIVATION.DIGEST,
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  },

  // Enhanced audit logging middleware
  auditLog: async (req, res, next) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Create comprehensive audit log entry
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      user: {
        id: req.user?.id || "anonymous",
        role: req.user?.role || "anonymous",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        headers: hipaaCompliance.sanitizeHeaders(req.headers),
        actionType: req.actionType || "access",
      },
      session: {
        id: req.sessionID,
        created: req.session?.created,
        lastAccessed: req.session?.lastAccessed,
      },
    };

    // Response interceptor
    const responseHandler = async (responseBody) => {
      logEntry.response = {
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        size: responseBody ? JSON.stringify(responseBody).length : 0,
      };

      // Log based on response status
      const logLevel = res.statusCode >= 400 ? "ERROR" : "INFO";
      await hipaaCompliance.logAudit(logLevel, logEntry);

      // Log emergency access separately if applicable
      if (req.headers["x-emergency-access"]) {
        await hipaaCompliance.logEmergencyAccess({
          ...logEntry,
          emergency: {
            reason: req.headers["x-emergency-reason"],
            approvedBy: req.headers["x-emergency-approver"],
            expiresAt: new Date(
              Date.now() + CONSTANTS.ACCESS.EMERGENCY_ACCESS_DURATION
            ),
          },
        });
      }
    };

    // Override response methods
    const originalMethods = {
      json: res.json,
      send: res.send,
      end: res.end,
    };

    res.json = function (body) {
      responseHandler(body);
      return originalMethods.json.call(this, body);
    };

    res.send = function (body) {
      responseHandler(body);
      return originalMethods.send.call(this, body);
    };

    res.end = function (chunk) {
      responseHandler(chunk);
      return originalMethods.end.call(this, chunk);
    };

    next();
  },

  // Enhanced access control middleware
  accessControl: (options = {}) => {
    return async (req, res, next) => {
      try {
        const {
          requiredRole,
          requiredPermissions = [],
          requireMFA = false,
        } = options;

        if (!req.user) {
          throw new HIPAAComplianceError(
            "Authentication required",
            "AUTH_REQUIRED"
          );
        }

        // Session timeout check
        const tokenTimestamp = req.user.iat * 1000;
        if (Date.now() - tokenTimestamp > CONSTANTS.ACCESS.SESSION_TIMEOUT) {
          throw new HIPAAComplianceError("Session expired", "SESSION_EXPIRED");
        }

        // Role check
        if (requiredRole && req.user.role !== requiredRole) {
          throw new HIPAAComplianceError(
            "Insufficient permissions",
            "INSUFFICIENT_ROLE"
          );
        }

        // Permissions check
        if (requiredPermissions.length > 0) {
          const hasPermissions = requiredPermissions.every((permission) =>
            req.user.permissions?.includes(permission)
          );
          if (!hasPermissions) {
            throw new HIPAAComplianceError(
              "Missing required permissions",
              "INSUFFICIENT_PERMISSIONS"
            );
          }
        }

        // MFA check
        if (requireMFA && !req.user.mfaVerified) {
          throw new HIPAAComplianceError(
            "MFA verification required",
            "MFA_REQUIRED"
          );
        }

        // Rate limiting check
        await hipaaCompliance.checkRateLimit(req.user.id);

        next();
      } catch (error) {
        await hipaaCompliance.logAudit("ERROR", {
          type: "ACCESS_CONTROL",
          error: error.message,
          user: req.user?.id,
          timestamp: new Date(),
        });
        next(error);
      }
    };
  },

  // Enhanced PHI validation middleware
  validatePHI: (req, res, next) => {
    try {
      const phi = req.body.phi || req.query.phi;
      if (!phi) return next();

      // Comprehensive PHI patterns
      const PHI_PATTERNS = {
        ssn: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
        mrn: /\b[A-Z0-9]{4,10}\b/,
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        phone: /\b\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
        dob: /\b\d{4}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/,
        name: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/,
        address:
          /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\.?/i,
      };

      let detectedPHI = [];
      const phiString = typeof phi === "string" ? phi : JSON.stringify(phi);

      // Check for PHI patterns
      for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
        if (pattern.test(phiString)) {
          detectedPHI.push(type);
        }
      }

      if (detectedPHI.length > 0) {
        // Encrypt detected PHI
        const encryptedPHI = hipaaCompliance.encrypt(phi);
        req.body.phi = encryptedPHI;

        // Log PHI detection
        hipaaCompliance.logAudit("WARNING", {
          type: "PHI_DETECTED",
          fields: detectedPHI,
          action: "encrypted",
          timestamp: new Date(),
        });
      }

      next();
    } catch (error) {
      next(
        new HIPAAComplianceError(
          "PHI validation failed",
          "PHI_VALIDATION_ERROR",
          { originalError: error.message }
        )
      );
    }
  },

  // Utility methods
  sanitizeHeaders: (headers) => {
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    return Object.entries(headers).reduce((acc, [key, value]) => {
      acc[key] = sensitiveHeaders.includes(key.toLowerCase())
        ? "[REDACTED]"
        : value;
      return acc;
    }, {});
  },

  // Audit logging
  async logAudit(level, data) {
    // Implementation would connect to secure audit logging service
    console.log(`[${level}] HIPAA Audit:`, JSON.stringify(data));
  },

  // Rate limiting
  async checkRateLimit(userId) {
    // Implementation would connect to rate limiting service
    return true;
  },

  // Legacy decryption support
  async legacyDecrypt(encryptedPackage) {
    // Implementation for backwards compatibility
    throw new HIPAAComplianceError("Legacy decryption not implemented");
  },
};

module.exports = hipaaCompliance;
