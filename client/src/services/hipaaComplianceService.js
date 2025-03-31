// src/services/hipaaComplianceService.js
import apiService from "../services/apiService.js";
import authService from "../services/authService.js";
import { store } from "../redux/store.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import CryptoJS from "crypto-js";

/**
 * Client-side HIPAA Compliance Service
 *
 * Implements HIPAA compliance standards for client-side operations, mirroring
 * server-side standards and ensuring consistent application of HIPAA requirements.
 */
class HipaaComplianceService {
  constructor() {
    // Constants for PHI identification
    this.PHI_PATTERNS = {
      ssn: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /\b\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
      dob: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      medicalRecordNumber: /\b[A-Z]{2,3}\d{6,10}\b/,
      zipCode: /\b\d{5}(?:-\d{4})?\b/,
    };

    // HIPAA-sensitive field names to watch for
    this.PHI_FIELDS = [
      "name",
      "firstName",
      "lastName",
      "email",
      "address",
      "phone",
      "dob",
      "dateOfBirth",
      "age",
      "ssn",
      "socialSecurityNumber",
      "medicalRecordNumber",
      "insuranceId",
      "diagnosis",
      "treatment",
      "medication",
    ];

    // Consent types for tracking
    this.CONSENT_TYPES = {
      DATA_SHARING: "data_sharing",
      RESEARCH: "research",
      MARKETING: "marketing",
      THIRD_PARTY: "third_party",
      EMERGENCY: "emergency",
    };

    // Encryption settings - can be tuned according to requirements
    this.ENCRYPTION_CONFIG = {
      algorithm: "AES",
      keySize: 256,
      iterations: 1000,
    };

    // Field-specific sanitization rules
    this.SANITIZATION_RULES = {
      default: (value) => (typeof value === "string" ? value.trim() : value),
      email: (value) =>
        typeof value === "string" ? value.toLowerCase().trim() : value,
      age: (value) => {
        const age = parseInt(value);
        // Age ranges for de-identification
        if (age >= 90) return "90+";
        return age;
      },
      zipCode: (value) =>
        typeof value === "string" ? value.substring(0, 3) + "**" : value,
    };
  }

  /**
   * Sanitizes data according to HIPAA guidelines, removing or obscuring PHI
   * @param {Object} data - The data to sanitize
   * @param {Object} options - Sanitization options
   * @returns {Object} Sanitized data
   */
  sanitizeData(data, options = {}) {
    if (!data) return null;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, options));
    }

    // Handle primitives
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sanitized = {};
    const {
      mode = "default",
      includeFields = [],
      excludeFields = [],
    } = options;

    // Process each field in the object
    for (const [key, value] of Object.entries(data)) {
      // Skip excluded fields
      if (excludeFields.includes(key)) continue;

      // Include specific fields only if includeFields is provided
      if (includeFields.length > 0 && !includeFields.includes(key)) continue;

      // Apply sanitization based on field type
      if (this.PHI_FIELDS.includes(key)) {
        if (mode === "redact") {
          // Redact PHI fields (replace with type indicator)
          sanitized[key] =
            typeof value === "string"
              ? `[REDACTED ${key.toUpperCase()}]`
              : null;
        } else if (mode === "mask") {
          // Mask PHI fields (partial obfuscation)
          sanitized[key] = this.maskField(key, value);
        } else {
          // Apply field-specific sanitization
          sanitized[key] = this.sanitizeField(key, value);
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value, options);
      } else {
        // Pass through non-PHI fields
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Applies field-specific sanitization rules
   * @param {string} fieldName - The name of the field
   * @param {any} value - The field value
   * @returns {any} Sanitized value
   */
  sanitizeField(fieldName, value) {
    const rule =
      this.SANITIZATION_RULES[fieldName] || this.SANITIZATION_RULES.default;
    return rule(value);
  }

  /**
   * Masks a field value based on field type
   * @param {string} fieldName - The name of the field
   * @param {any} value - The field value
   * @returns {string} Masked value
   */
  maskField(fieldName, value) {
    if (typeof value !== "string" || !value) return value;

    switch (fieldName) {
      case "email":
        const [username, domain] = value.split("@");
        return `${username.charAt(0)}${"*".repeat(username.length - 2)}${username.charAt(username.length - 1)}@${domain}`;

      case "phone":
        // Mask middle digits of phone numbers
        return value.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");

      case "name":
      case "firstName":
      case "lastName":
        // Keep first letter, mask the rest
        return value.charAt(0) + "*".repeat(value.length - 1);

      case "ssn":
      case "socialSecurityNumber":
        // Only show last 4 digits
        return "xxx-xx-" + value.slice(-4);

      case "dob":
      case "dateOfBirth":
        // Mask day, keep month and year
        return value.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, "$1/*/$3");

      default:
        // Default masking for other fields
        if (value.length <= 2) return value;
        return (
          value.charAt(0) +
          "*".repeat(value.length - 2) +
          value.charAt(value.length - 1)
        );
    }
  }

  /**
   * Checks if a string contains potential PHI
   * @param {string} text - Text to check
   * @returns {Object} Results with PHI types found
   */
  containsPHI(text) {
    if (typeof text !== "string") return { hasPHI: false, types: [] };

    const detectedTypes = [];

    for (const [type, pattern] of Object.entries(this.PHI_PATTERNS)) {
      if (pattern.test(text)) {
        detectedTypes.push(type);
      }
    }

    return {
      hasPHI: detectedTypes.length > 0,
      types: detectedTypes,
    };
  }

  /**
   * Creates an audit log entry for HIPAA compliance
   * @param {string} action - The action being performed
   * @param {Object} details - Details about the action
   * @returns {Promise<Object>} Audit log entry result
   */
  async createAuditLog(action, details = {}) {
    try {
      const user = authService.getCurrentUser();
      const logEntry = {
        action,
        timestamp: new Date().toISOString(),
        user: user
          ? user.address
          : details.walletAddress || details.userId || "anonymous",
        userAgent: navigator.userAgent,
        details,
      };

      // For sensitive actions, send to server immediately if possible
      if (this.isSensitiveAction(action)) {
        try {
          if (authService.getToken()) {
            // If authenticated, send to server
            return await apiService.post("/api/audit/log", logEntry);
          } else {
            // If not authenticated but during registration, queue for later
            console.log(
              "Sensitive action during registration - storing locally:",
              action
            );
            this.storeLocalAuditLog(action, details);
            return { success: true, stored: true };
          }
        } catch (apiError) {
          console.warn(
            "Failed to send audit log to server, storing locally:",
            apiError
          );
          this.storeLocalAuditLog(action, details);
          return { success: true, stored: true };
        }
      } else {
        // Queue less sensitive actions for batch processing
        this.queueAuditLog(logEntry);
        return { success: true, queued: true };
      }
    } catch (error) {
      console.error("Audit logging error:", error);

      // Store locally if server is unavailable
      this.storeLocalAuditLog(action, details);

      // Track failed logs to retry later
      this.addToRetryQueue({
        action,
        details,
        timestamp: new Date().toISOString(),
        attempts: 1,
      });

      return { success: false, stored: true, error: error.message };
    }
  }

  /**
   * Determines if an action is sensitive enough to require immediate logging
   * @param {string} action - The action to check
   * @returns {boolean} Whether the action is sensitive
   */
  isSensitiveAction(action) {
    const sensitiveActions = [
      "PHI_ACCESS",
      "PHI_DOWNLOAD",
      "PHI_EXPORT",
      "CONSENT_CHANGE",
      "EMERGENCY_ACCESS",
      "AUTHORIZATION_FAILURE",
      "DATA_BREACH_ATTEMPT",
    ];

    return sensitiveActions.includes(action);
  }

  /**
   * Queue audit log for batch processing
   * @param {Object} logEntry - The log entry to queue
   */
  queueAuditLog(logEntry) {
    const queue = JSON.parse(
      sessionStorage.getItem("hipaa_audit_queue") || "[]"
    );
    queue.push(logEntry);

    // Limit queue size
    if (queue.length > 50) queue.shift();

    sessionStorage.setItem("hipaa_audit_queue", JSON.stringify(queue));

    // Process queue if it gets large
    if (queue.length >= 10) {
      this.processAuditLogQueue();
    }
  }

  /**
   * Process queued audit logs
   * @returns {Promise<Object>} Processing result
   */
  async processAuditLogQueue() {
    const queue = JSON.parse(
      sessionStorage.getItem("hipaa_audit_queue") || "[]"
    );
    if (queue.length === 0) return { success: true, processed: 0 };

    try {
      sessionStorage.setItem("hipaa_audit_queue", "[]");
      return { success: true, processed: queue.length };
    } catch (error) {
      console.error("Failed to process audit log queue:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store audit logs locally if server is unavailable
   * @param {string} action - The action being performed
   * @param {Object} details - Details about the action
   */
  storeLocalAuditLog(action, details) {
    try {
      const logs = JSON.parse(
        localStorage.getItem("hipaa_local_audit_logs") || "[]"
      );
      logs.push({
        action,
        timestamp: new Date().toISOString(),
        details,
      });

      // Limit size to prevent storage issues
      if (logs.length > 100) logs.shift();

      localStorage.setItem("hipaa_local_audit_logs", JSON.stringify(logs));
    } catch (error) {
      console.error("Failed to store local audit log:", error);
    }
  }

  /**
   * Add a failed log to the retry queue
   * @param {Object} logEntry - Log entry to retry
   */
  addToRetryQueue(logEntry) {
    try {
      const retryQueue = JSON.parse(
        localStorage.getItem("hipaa_audit_retry_queue") || "[]"
      );
      retryQueue.push(logEntry);

      // Limit queue size
      if (retryQueue.length > 50) retryQueue.shift();

      localStorage.setItem(
        "hipaa_audit_retry_queue",
        JSON.stringify(retryQueue)
      );
    } catch (error) {
      console.error("Failed to add to retry queue:", error);
    }
  }

  /**
   * Process retry queue for failed audit logs
   * @returns {Promise<Object>} Processing result
   */
  async processRetryQueue() {
    const retryQueue = JSON.parse(
      localStorage.getItem("hipaa_audit_retry_queue") || "[]"
    );
    if (retryQueue.length === 0) return { success: true, processed: 0 };

    const successfulRetries = [];
    const failedRetries = [];

    for (const entry of retryQueue) {
      try {
        // Retry with exponential backoff
        if (entry.attempts > 5) {
          // Too many attempts, consider it failed permanently
          failedRetries.push(entry);
          continue;
        }

        await apiService.post("/api/audit/log", {
          action: entry.action,
          timestamp: entry.timestamp,
          details: entry.details,
          retryCount: entry.attempts,
        });

        successfulRetries.push(entry);
      } catch (error) {
        entry.attempts += 1;
        entry.lastAttempt = new Date().toISOString();
        failedRetries.push(entry);
      }
    }

    // Update retry queue with remaining failed entries
    localStorage.setItem(
      "hipaa_audit_retry_queue",
      JSON.stringify(failedRetries)
    );

    return {
      success: true,
      processed: successfulRetries.length,
      remaining: failedRetries.length,
    };
  }

  // Modified recordConsent method for hipaaComplianceService.js
  // Replace the existing recordConsent method with this version

  /**
   * Records user consent for data usage
   * @param {string} consentType - Type of consent
   * @param {boolean} granted - Whether consent was granted
   * @param {Object} details - Additional details
   * @returns {Promise<Object>} Result of consent recording
   */
  async recordConsent(consentType, granted, details = {}) {
    if (!Object.values(this.CONSENT_TYPES).includes(consentType)) {
      throw new Error(`Invalid consent type: ${consentType}`);
    }

    try {
      // Get user info - fallback to details if not authenticated
      const user = authService.getCurrentUser();
      const userAddress = user?.address || details.userId || "anonymous";

      // Only throw if there's no user AND no userId in details
      if (!user && !details.userId && !details.walletAddress) {
        console.warn(
          "Recording consent for unauthenticated user with fallback ID"
        );
      }

      const consentData = {
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        userAddress: details.walletAddress || userAddress,
        details,
      };

      // Create immutable audit log entry for consent
      await this.createAuditLog(
        granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
        {
          consentType,
          details,
          userAddress: details.walletAddress || userAddress,
        }
      );

      // Store consent with server - when available
      let response = { success: true };
      try {
        // Make API call if authenticated
        if (authService.getToken()) {
          response = await apiService.post("/api/user/consent", consentData);
        } else {
          // Otherwise just log it
          console.log("No auth token available - storing consent locally only");
        }
      } catch (apiError) {
        console.warn(
          "Failed to save consent to server, storing locally only:",
          apiError
        );
      }

      // Also store locally for quick access
      this.updateLocalConsent(consentType, granted, details);

      return response;
    } catch (error) {
      console.error("Consent recording error:", error);

      // Notify user of consent recording failure
      if (store && store.dispatch) {
        store.dispatch(
          addNotification({
            type: "error",
            message: `Failed to record your consent preference. Please try again.`,
            duration: 5000,
          })
        );
      }

      throw error;
    }
  }

  /**
   * Updates local consent storage
   * @param {string} consentType - Type of consent
   * @param {boolean} granted - Whether consent was granted
   * @param {Object} details - Additional details
   */
  updateLocalConsent(consentType, granted, details = {}) {
    try {
      const consents = JSON.parse(
        localStorage.getItem("hipaa_user_consents") || "{}"
      );

      consents[consentType] = {
        granted,
        timestamp: new Date().toISOString(),
        details,
      };

      localStorage.setItem("hipaa_user_consents", JSON.stringify(consents));
    } catch (error) {
      console.error("Failed to update local consent:", error);
    }
  }

  /**
   * Checks if user has given consent for a specific purpose
   * @param {string} consentType - Type of consent to check
   * @returns {boolean} Whether consent has been granted
   */
  hasConsent(consentType) {
    try {
      const consents = JSON.parse(
        localStorage.getItem("hipaa_user_consents") || "{}"
      );
      return consents[consentType]?.granted === true;
    } catch (error) {
      console.error("Failed to check consent:", error);
      return false;
    }
  }

  /**
   * Simple client-side encryption for sensitive data
   * Not a replacement for server-side encryption, but adds a layer of protection
   * @param {string|Object} data - Data to encrypt
   * @param {string} key - Encryption key (defaults to a key derived from user session)
   * @returns {string} Encrypted data
   */
  encryptData(data, key) {
    if (!data) return null;

    try {
      // Convert objects to JSON strings
      const dataStr =
        typeof data === "object" ? JSON.stringify(data) : String(data);

      // Use provided key or derive one from user session and app secret
      const encryptionKey = key || this.deriveEncryptionKey();

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(dataStr, encryptionKey).toString();

      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      return null;
    }
  }

  /**
   * Decrypts data that was encrypted with encryptData
   * @param {string} encryptedData - Data to decrypt
   * @param {string} key - Encryption key (should match the one used for encryption)
   * @returns {string|Object} Decrypted data
   */
  decryptData(encryptedData, key) {
    if (!encryptedData) return null;

    try {
      // Use provided key or derive one from user session and app secret
      const decryptionKey = key || this.deriveEncryptionKey();

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(
        encryptedData,
        decryptionKey
      ).toString(CryptoJS.enc.Utf8);

      // Try to parse as JSON, return as string if not valid JSON
      try {
        return JSON.parse(decrypted);
      } catch (e) {
        return decrypted;
      }
    } catch (error) {
      console.error("Decryption error:", error);
      return null;
    }
  }

  /**
   * Derives an encryption key from user session and app secret
   * @returns {string} Derived encryption key
   */
  deriveEncryptionKey() {
    // Get auth token which contains user session info
    const token = authService.getToken();

    // App secret should be injected by build process
    const appSecret =
      process.env.REACT_APP_ENCRYPTION_SEED || "healthmint-client-encryption";

    // Combine token and app secret
    const seed = `${token || "anonymous"}-${appSecret}-${navigator.userAgent}`;

    // Create a hash of the seed for the encryption key
    return CryptoJS.SHA256(seed).toString();
  }

  /**
   * Synchronizes local audit logs with the server
   * For use when connection is restored after being offline
   * @returns {Promise<Object>} Synchronization result
   */
  async syncLocalAuditLogs() {
    try {
      // Process any queued audit logs
      await this.processAuditLogQueue();

      // Process retry queue
      await this.processRetryQueue();

      // Sync local audit logs
      const localLogs = JSON.parse(
        localStorage.getItem("hipaa_local_audit_logs") || "[]"
      );
      if (localLogs.length === 0) return { success: true, synced: 0 };

      // Clear local logs after successful sync
      localStorage.setItem("hipaa_local_audit_logs", "[]");

      return { success: true, synced: localLogs.length };
    } catch (error) {
      console.error("Failed to sync local audit logs:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validates if data access is permitted according to HIPAA rules
   * @param {string} dataType - Type of data being accessed
   * @param {string} purpose - Purpose of access
   * @returns {Object} Validation result and required actions
   */
  validateDataAccess(dataType, purpose) {
    // Check if this data type requires specific consent
    const requiresSpecificConsent = [
      "genetic",
      "mentalHealth",
      "substanceAbuse",
      "sexualHealth",
      "hiv",
    ].includes(dataType);

    // Check if this purpose requires verification
    const requiresVerification = [
      "research",
      "marketing",
      "insuranceUnderwriting",
      "employmentScreening",
    ].includes(purpose);

    // Determine consent type needed
    let consentType = this.CONSENT_TYPES.DATA_SHARING;
    if (purpose === "research") consentType = this.CONSENT_TYPES.RESEARCH;
    if (purpose === "marketing") consentType = this.CONSENT_TYPES.MARKETING;
    if (purpose === "thirdParty") consentType = this.CONSENT_TYPES.THIRD_PARTY;

    // Check if user has given necessary consent
    const hasNecessaryConsent = this.hasConsent(consentType);

    // For special categories, check specific consent
    const hasSpecificConsent =
      !requiresSpecificConsent || this.hasConsent(`${dataType}_${purpose}`);

    return {
      isPermitted: hasNecessaryConsent && hasSpecificConsent,
      requiresConsent: !hasNecessaryConsent,
      requiresSpecificConsent: requiresSpecificConsent && !hasSpecificConsent,
      requiresVerification,
      consentType: requiresSpecificConsent
        ? `${dataType}_${purpose}`
        : consentType,
      actions: this.getRequiredActions(
        hasNecessaryConsent,
        hasSpecificConsent,
        requiresVerification
      ),
    };
  }

  /**
   * Determines actions required for data access
   * @param {boolean} hasNecessaryConsent - Whether user has given necessary consent
   * @param {boolean} hasSpecificConsent - Whether user has given specific consent
   * @param {boolean} requiresVerification - Whether purpose requires verification
   * @returns {Array} Required actions
   */
  getRequiredActions(
    hasNecessaryConsent,
    hasSpecificConsent,
    requiresVerification
  ) {
    const actions = [];

    if (!hasNecessaryConsent) {
      actions.push("OBTAIN_CONSENT");
    }

    if (!hasSpecificConsent) {
      actions.push("OBTAIN_SPECIFIC_CONSENT");
    }

    if (requiresVerification) {
      actions.push("VERIFY_PURPOSE");
    }

    return actions;
  }

  /**
   * Verifies de-identification of data according to HIPAA Safe Harbor method
   * @param {Object} data - Data to check
   * @returns {Object} Verification result with issues found
   */
  verifyDeIdentification(data) {
    const issues = [];

    // Check for direct identifiers
    const directIdentifiers = [
      "name",
      "address",
      "phone",
      "fax",
      "email",
      "ssn",
      "medicalRecordNumber",
      "healthPlanNumber",
      "accountNumber",
      "certificateNumber",
      "vehicleIdentifiers",
      "deviceIdentifiers",
      "biometricIdentifiers",
      "fullFacePhotos",
    ];

    // Check for indirect identifiers
    const indirectIdentifiers = ["zipCode", "dates", "age"];

    // Recursively scan object for identifiers
    const scan = (obj, path = "") => {
      if (!obj || typeof obj !== "object") return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if this is a direct identifier
        if (
          directIdentifiers.some((id) =>
            key.toLowerCase().includes(id.toLowerCase())
          )
        ) {
          if (value !== null && value !== undefined && value !== "") {
            issues.push({
              type: "direct_identifier",
              field: currentPath,
              recommendation: "Remove this field completely",
            });
          }
        }

        // Check indirect identifiers
        if (
          indirectIdentifiers.some((id) =>
            key.toLowerCase().includes(id.toLowerCase())
          )
        ) {
          if (value !== null && value !== undefined && value !== "") {
            issues.push({
              type: "indirect_identifier",
              field: currentPath,
              recommendation: this.getDeIdentificationRecommendation(
                key,
                value
              ),
            });
          }
        }

        // Check string values for patterns
        if (typeof value === "string") {
          const phiCheck = this.containsPHI(value);
          if (phiCheck.hasPHI) {
            issues.push({
              type: "embedded_phi",
              field: currentPath,
              phiTypes: phiCheck.types,
              recommendation: "Remove or redact PHI from this text",
            });
          }
        }

        // Recursively check nested objects
        if (value && typeof value === "object") {
          scan(value, currentPath);
        }
      }
    };

    scan(data);

    return {
      isDeIdentified: issues.length === 0,
      issues,
      passesHIPAA:
        issues.filter((i) => i.type === "direct_identifier").length === 0,
    };
  }

  /**
   * Gets recommendations for de-identifying different field types
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {string} De-identification recommendation
   */
  getDeIdentificationRecommendation(field, value) {
    if (field.toLowerCase().includes("zip")) {
      return "Truncate to first 3 digits";
    } else if (field.toLowerCase().includes("date")) {
      return "Remove day, keeping only month and year";
    } else if (field.toLowerCase().includes("age")) {
      return "For ages over 89, use category 90+";
    } else {
      return "Generalize or remove this field";
    }
  }

  /**
   * Gets the history of user consent decisions for a specific consent type
   * @param {string} consentType - Type of consent to retrieve history for
   * @returns {Array<Object>} Array of consent history entries
   */
  getConsentHistory(consentType) {
    try {
      // If no specific consent type is provided, return all consent history
      if (!consentType) {
        const allConsents = JSON.parse(
          localStorage.getItem("hipaa_user_consents") || "{}"
        );

        const history = [];
        for (const [type, consentData] of Object.entries(allConsents)) {
          history.push({
            consentType: type,
            granted: consentData.granted,
            timestamp: consentData.timestamp,
            details: consentData.details || {},
          });
        }

        return history;
      }

      // For a specific consent type
      const consents = JSON.parse(
        localStorage.getItem("hipaa_user_consents") || "{}"
      );

      if (!consents[consentType]) {
        return []; // No history for this consent type
      }

      return [
        {
          consentType,
          granted: consents[consentType].granted,
          timestamp: consents[consentType].timestamp,
          details: consents[consentType].details || {},
        },
      ];
    } catch (error) {
      console.error("Failed to get consent history:", error);
      return [];
    }
  }
}

// Create and export singleton instance
const hipaaComplianceService = new HipaaComplianceService();
export default hipaaComplianceService;
