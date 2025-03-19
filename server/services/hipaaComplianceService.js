// server/services/hipaaComplianceService.js

import apiService from "./apiService.js";
import CryptoJS from "crypto-js";

class ServerHipaaComplianceError extends Error {
  constructor(message, code = "HIPAA_COMPLIANCE_ERROR", details = {}) {
    super(message);
    this.name = "ServerHipaaComplianceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ServerHipaaComplianceService {
  constructor() {
    // We'll set up the connection to errorHandlingService after initialization
    this.errorHandlingService = null;
    console.log("✅ HipaaComplianceService initialized");
  }

  // Method to be called after all services are initialized
  setErrorHandlingService(service) {
    if (!service) {
      console.warn(
        "⚠️ Null error handling service provided to HipaaComplianceService"
      );
      return;
    }

    this.errorHandlingService = service;
    console.log("✅ Error handling service set in HipaaComplianceService");
  }

  async createAuditLog(action, details = {}) {
    try {
      const logEntry = {
        action,
        timestamp: new Date().toISOString(),
        user: details.user || "server_process",
        details: details || {},
      };
      const response = await apiService.post("/api/audit/log", logEntry);
      return response;
    } catch (error) {
      // Create a new error instead of using errorHandlingService directly
      const complianceError = new ServerHipaaComplianceError(
        `Failed to create audit log: ${error.message}`,
        "AUDIT_LOG_ERROR",
        { action, details }
      );
      console.error(complianceError);
      throw complianceError;
    }
  }

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
        console.warn("Failed to create consent audit log:", auditError.message);
      }

      return response;
    } catch (error) {
      // Create a new error instead of using errorHandlingService
      const consentError = new ServerHipaaComplianceError(
        `Failed to record consent: ${error.message}`,
        "CONSENT_RECORDING_ERROR",
        { consentType, granted, details }
      );
      console.error(consentError);
      throw consentError;
    }
  }
}

// Create singleton instance
const hipaaComplianceService = new ServerHipaaComplianceService();
export default hipaaComplianceService;
