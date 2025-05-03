// server/services/hipaaComplianceService.js

import apiService from "./apiService.js";
import CryptoJS from "crypto-js";
import { createError } from "../errors/index.js";
import { logger } from "../config/loggerConfig.js";

class ServerHipaaComplianceService {
  constructor() {
    // Replace error handling service with logger
    this.logger = logger;
    console.log("✅ HipaaComplianceService initialized");
  }

  // Replace error handling service setter with logger setter
  setLogger(loggerService) {
    this.logger = loggerService || logger;
    console.log("✅ Logger set in HipaaComplianceService");
  }

  async createAuditLog(action, details, severity = "info", user = "anonymous") {
    try {
      // Check if server is still initializing
      if (global.SERVER_INITIALIZING) {
        console.log(`Skipping audit log during initialization: ${action}`);
        return true;
      }
      const logEntry = {
        action,
        timestamp: new Date().toISOString(),
        user: details.user || "server_process",
        details: details || {},
      };
      const response = await apiService.post("/api/audit/log", logEntry);
      return response;
    } catch (error) {
      // Use new centralized error handling
      throw createError.hipaa(
        "AUDIT_LOG_ERROR",
        `Failed to create audit log: ${error.message}`,
        {
          action,
          details,
          severity: "high",
        }
      );
    }
  }

  // Update error handling in recordConsent method
  async recordConsent(consentType, granted, details = {}) {
    try {
      const consentData = {
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        details,
      };
      const response = await apiService.post("/api/user/consent", consentData);

      // Create audit log directly
      try {
        await this.createAuditLog(
          granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
          {
            consentType,
            ...details,
          }
        );
      } catch (auditError) {
        this.logger.warn(
          "Failed to create consent audit log:",
          auditError.message
        );
      }

      return response;
    } catch (error) {
      // Use new centralized error handling
      throw createError.hipaa(
        "CONSENT_RECORDING_ERROR",
        `Failed to record consent: ${error.message}`,
        {
          consentType,
          granted,
          details,
          severity: "medium",
        }
      );
    }
  }

  // Keep other methods unchanged
  validateDataAccess(dataType, purpose) {
    const requiresSpecificConsent = ["genetic", "mentalHealth"].includes(
      dataType
    );
    return { isValid: !requiresSpecificConsent }; // Server-side logic
  }

  sanitizeData(data, options = {}) {
    if (!data) return null;
    const sanitized = { ...data };
    const phiFields = ["name", "email", "ssn"];
    phiFields.forEach((field) => {
      if (field in sanitized) sanitized[field] = "[REDACTED]";
    });
    return sanitized;
  }

  verifyDeIdentification(data) {
    const phiFields = ["name", "email", "ssn"];
    const hasPHI = phiFields.some((field) => data[field] !== undefined);
    return { isDeIdentified: !hasPHI };
  }

  containsPHI(text) {
    const patterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      email: /\S+@\S+\.\S+/,
    };
    const detected = Object.keys(patterns).filter((key) =>
      patterns[key].test(text)
    );
    return { hasPHI: detected.length > 0, types: detected };
  }

  encryptData(data, key = process.env.ENCRYPTION_KEY || "server-secret") {
    const dataStr =
      typeof data === "object" ? JSON.stringify(data) : String(data);
    return CryptoJS.AES.encrypt(dataStr, key).toString();
  }

  decryptData(
    encryptedData,
    key = process.env.ENCRYPTION_KEY || "server-secret"
  ) {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key).toString(
      CryptoJS.enc.Utf8
    );
    return decrypted ? JSON.parse(decrypted) : decrypted;
  }

  get CONSENT_TYPES() {
    return {
      DATA_SHARING: "data_sharing",
      RESEARCH: "research",
      MARKETING: "marketing",
      THIRD_PARTY: "third_party",
      EMERGENCY: "emergency",
    };
  }
}

// Create singleton instance
const hipaaComplianceService = new ServerHipaaComplianceService();
export default hipaaComplianceService;
