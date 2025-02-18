import crypto from "crypto";

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

// HIPAA Compliance Error Handling
class HIPAAComplianceError extends Error {
  constructor(message, code = "HIPAA_COMPLIANCE_ERROR", details = {}) {
    super(message);
    this.name = "HIPAAComplianceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// HIPAA Compliance Middleware
const hipaaCompliance = {
  validatePHI: (req, res, next) => {
    try {
      if (!req.body.phi) return next();

      // Detect PHI (Protected Health Information)
      const PHI_PATTERNS = {
        ssn: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        phone: /\b\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
      };

      let detectedPHI = [];
      const phiString = JSON.stringify(req.body.phi);

      for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
        if (pattern.test(phiString)) detectedPHI.push(type);
      }

      if (detectedPHI.length > 0) {
        console.warn("⚠️ PHI detected:", detectedPHI);
      }

      next();
    } catch (error) {
      next(
        new HIPAAComplianceError(
          "PHI validation failed",
          "PHI_VALIDATION_ERROR"
        )
      );
    }
  },

  auditLog: async (req, res, next) => {
    console.log(
      `[HIPAA AUDIT] Request to ${req.path} by ${
        req.user?.address || "Anonymous"
      }`
    );
    next();
  },
};

// ✅ Use ES Module Export
export default hipaaCompliance;
