// client/src/services/hipaaComplianceService.js

const CONSENT_TYPES = {
  DATA_SHARING: "data_sharing",
  DATA_BROWSING: "data_browsing",
  RESEARCH_PARTICIPATION: "research_participation",
  MARKETING: "marketing",
};

class HipaaComplianceService {
  constructor() {
    this.CONSENT_TYPES = CONSENT_TYPES;
    this.consentHistory = {};
    this.auditTrail = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const storedConsent = localStorage.getItem("healthmint_consent_history");
      if (storedConsent) {
        this.consentHistory = JSON.parse(storedConsent);
      }
    } catch (err) {
      console.error("Failed to load consent history:", err);
      this.consentHistory = {};
    }

    this.initialized = true;
  }

  async createAuditLog(eventType, metadata = {}) {
    try {
      this.init();

      const auditEntry = {
        eventType,
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      this.auditTrail.push(auditEntry);

      if (process.env.NODE_ENV === "production") {
        // Would send to server in production
        // await apiClient.post('/api/hipaa/audit', auditEntry);
      }

      return auditEntry;
    } catch (err) {
      console.error("Error creating audit log:", err);
      return null;
    }
  }

  async logDataAccess(dataId, purpose, action, metadata = {}) {
    return this.createAuditLog("DATA_ACCESS", {
      dataId,
      purpose,
      action,
      ...metadata,
    });
  }

  async logFieldAccess(dataId, fieldPath, purpose) {
    return this.createAuditLog("FIELD_ACCESS", {
      dataId,
      fieldPath,
      purpose,
    });
  }

  async recordConsent(consentType, consentGiven, metadata = {}) {
    try {
      this.init();

      const consentRecord = {
        consentType,
        consentGiven,
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      if (!this.consentHistory[consentType]) {
        this.consentHistory[consentType] = [];
      }

      this.consentHistory[consentType].push(consentRecord);

      try {
        localStorage.setItem(
          "healthmint_consent_history",
          JSON.stringify(this.consentHistory)
        );
      } catch (err) {
        console.error("Error saving consent to localStorage:", err);
      }

      await this.createAuditLog("CONSENT_RECORDED", {
        consentType,
        consentGiven,
        ...metadata,
      });

      return consentRecord;
    } catch (err) {
      console.error("Error recording consent:", err);
      return null;
    }
  }

  getConsentHistory(consentType) {
    this.init();
    return this.consentHistory[consentType] || [];
  }

  async verifyConsent(consentType, metadata = {}) {
    try {
      this.init();

      await this.createAuditLog("CONSENT_VERIFICATION", {
        consentType,
        ...metadata,
      });

      const consentHistory = this.getConsentHistory(consentType);
      if (!consentHistory?.length) return false;

      const sortedConsent = [...consentHistory].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const latestConsent = sortedConsent[0];
      if (!latestConsent.consentGiven) return false;

      const consentDate = new Date(latestConsent.timestamp);
      const daysSinceConsent =
        (new Date() - consentDate) / (1000 * 60 * 60 * 24);

      return daysSinceConsent <= 30;
    } catch (err) {
      console.error("Error verifying consent:", err);
      return false;
    }
  }

  validateDataAccess() {
    return {
      isPermitted: true,
      requiresConsent: false,
      consentType: null,
      actions: [],
    };
  }

  sanitizeData(data, options = {}) {
    if (!data) return data;

    const { mode = "default", excludeFields = [] } = options;
    const sanitized = JSON.parse(JSON.stringify(data));

    if (mode === "mask") {
      // Would implement field masking based on HIPAA requirements
    }

    for (const field of excludeFields) {
      if (field.includes(".")) {
        const parts = field.split(".");
        let current = sanitized;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current?.[parts[i]]) {
            current = null;
            break;
          }
          current = current[parts[i]];
        }
        if (current) {
          delete current[parts[parts.length - 1]];
        }
      } else {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  sanitizeInputValue(value) {
    if (typeof value === "string") {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+="[^"]*"/g, "")
        .replace(/on\w+='[^']*'/g, "");
    }
    return value;
  }

  verifyDeIdentification() {
    return {
      isDeIdentified: true,
      issues: [],
    };
  }

  getUserInfo() {
    return {
      userId: localStorage.getItem("healthmint_wallet_address") || "unknown",
      role: localStorage.getItem("healthmint_user_role") || "unknown",
    };
  }

  clearError() {
    // Would clear service error state
  }

  hasConsent(consentType) {
    const history = this.getConsentHistory(consentType);
    if (!history?.length) return false;

    const latest = [...history].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )[0];

    return latest?.consentGiven === true;
  }

  containsPHI(text) {
    // Simple check for common PHI patterns
    const phiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
    ];

    return phiPatterns.some((pattern) => pattern.test(text));
  }

  encryptData(data) {
    // Mock implementation
    return { encrypted: true, data };
  }

  decryptData(encryptedData) {
    // Mock implementation
    return encryptedData.data;
  }
}

const hipaaComplianceService = new HipaaComplianceService();

export default hipaaComplianceService;
