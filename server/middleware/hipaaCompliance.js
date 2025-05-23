// middleware/hipaaCompliance.js
import { createError } from "../errors/index.js";
import crypto from "crypto";
import validation from "../validation/index.js";

// Function to create an audit log entry
const createAuditLog = async (action, details = {}) => {
  try {
    // Create the audit log entry
    const auditEntry = {
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };

    // Log the entry
    console.log(`[HIPAA AUDIT] ${action}:`, auditEntry);

    // For production, store in a secure database
    if (process.env.NODE_ENV === "production") {
      try {
        // Here we would call a service to persist the audit log
        // await hipaaComplianceService.createAuditLog(action, auditEntry);
      } catch (error) {
        console.error("Failed to save programmatic audit log:", error);
      }
    }

    return true;
  } catch (error) {
    console.error("Audit logging error:", error);
    // Use the new error creation pattern
    throw createError.hipaa("Audit logging failed", error);
  }
};

// HIPAA Compliance Middleware
const hipaaCompliance = {
  // Explicitly add the createAuditLog function
  createAuditLog,

  // Middleware to validate PHI data in requests
  validatePHI: (req, res, next) => {
    try {
      // Check for potential PHI in request body
      const requestData = req.body;

      if (!requestData) return next();

      // Detect PHI patterns (Protected Health Information)
      const PHI_PATTERNS = {
        ssn: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
        email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        phone: /\b\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
        dob: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
        mrn: /\bMRN[:# ]?[0-9]{5,10}\b/i,
      };

      // Check all request data for PHI patterns
      const requestJson = JSON.stringify(requestData);
      const detectedPHI = {};

      for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
        if (pattern.test(requestJson)) {
          detectedPHI[type] = true;
        }
      }

      if (Object.keys(detectedPHI).length > 0) {
        console.warn("⚠️ PHI patterns detected:", Object.keys(detectedPHI));

        // Add PHI detection to request for audit logging
        req.phiDetected = Object.keys(detectedPHI);
      }

      next();
    } catch (error) {
      console.error("PHI validation error:", error);
      next(
        createError.validation("PHI validation failed", {
          error: "Unable to validate PHI data",
        })
      );
    }
  },

  // Create an audit log entry for HIPAA compliance
  auditLog: async (req, res, next) => {
    const startTime = Date.now();
    const requestId =
      req.id ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Capture original end to intercept response
    const originalEnd = res.end;

    // Add request ID for tracking
    req.id = requestId;
    res.setHeader("X-Request-ID", requestId);

    // Create audit log entry
    const auditEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.address || "anonymous",
      phiAccessed: req.phiDetected || [],
    };

    // Override res.end to capture response status
    res.end = function (chunk, encoding) {
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Complete the audit record with response data
      auditEntry.responseStatus = res.statusCode;
      auditEntry.responseTime = responseTime;

      // Log the complete audit entry
      console.log(
        `[HIPAA AUDIT] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - User: ${auditEntry.userId} - Time: ${responseTime}ms`
      );

      // For production, we would store this in a secure database
      if (process.env.NODE_ENV === "production") {
        try {
          // Here we would call a service to persist the audit log
          // hipaaComplianceService.createAuditLog('API_ACCESS', auditEntry);
        } catch (error) {
          console.error("Failed to save audit log:", error);
        }
      }

      // Call the original end method
      originalEnd.apply(res, arguments);
    };

    next();
  },

  // Verify user access to PHI
  verifyAccess: (requestedBy, targetAddress, accessLevel = "read") => {
    if (requestedBy === targetAddress) {
      return true; // Self-access is always permitted
    }

    return false;
  },

  // Generate middleware to check access levels
  accessControl: (options = {}) => {
    return (req, res, next) => {
      const { requiredLevel = "read" } = options;
      const requestedBy = req.user?.address;
      const targetResource =
        req.params.address || req.query.address || req.body.address;

      if (!requestedBy) {
        return next(createError.unauthorized("Authentication required"));
      }

      if (!targetResource) {
        return next(createError.validation("Resource identifier required"));
      }

      // Check access rights
      const hasAccess = hipaaCompliance.verifyAccess(
        requestedBy,
        targetResource,
        requiredLevel
      );

      if (!hasAccess) {
        return next(createError.forbidden("Insufficient access rights"));
      }

      next();
    };
  },

  // Encrypt sensitive data
  encrypt: (data, key = process.env.ENCRYPTION_KEY) => {
    const algorithm = "aes-256-gcm";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(key, "hex"),
      iv
    );

    let encrypted = cipher.update(
      typeof data === "object" ? JSON.stringify(data) : String(data),
      "utf8",
      "hex"
    );
    encrypted += cipher.final("hex");

    return {
      encryptedData: encrypted,
      iv: iv.toString("hex"),
      authTag: cipher.getAuthTag().toString("hex"),
    };
  },

  // Decrypt sensitive data
  decrypt: (encryptedData, iv, authTag, key = process.env.ENCRYPTION_KEY) => {
    const algorithm = "aes-256-gcm";
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  },

  // Generate cryptographic hash
  generateHash: (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
  },

  // Sanitize response data by removing PHI
  sanitizeResponse: async (data) => {
    if (!data) return null;

    // Clone the data to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = [
      "ssn",
      "socialSecurityNumber",
      "dateOfBirth",
      "dob",
      "fullName",
      "medicalRecordNumber",
      "insuranceNumber",
      "phoneNumber",
    ];

    // Function to sanitize an object recursively
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== "object") return obj;

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key)) {
          result[key] = "[REDACTED]";
        } else if (typeof value === "object") {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  },

  // Sanitize audit logs
  sanitizeAuditLog: async (auditLog) => {
    if (!auditLog) return [];

    // Mask sensitive information in audit logs
    return auditLog.map((entry) => {
      // Create a sanitized copy
      const sanitized = { ...entry };

      // Mask IP addresses and full details
      if (sanitized.ipAddress) {
        const parts = sanitized.ipAddress.split(".");
        if (parts.length === 4) {
          sanitized.ipAddress = `${parts[0]}.${parts[1]}.*.*`;
        }
      }

      // Limit details to prevent sensitive data leakage
      if (sanitized.details && typeof sanitized.details === "object") {
        sanitized.details = {
          action: sanitized.details.action || "access",
          timestamp: sanitized.details.timestamp,
        };
      }

      return sanitized;
    });
  },

  // Token validation
  validateToken: (token) => {
    const tokenValidation = validation.validateToken(token);
    if (!tokenValidation.isValid) {
      throw createError.hipaa(
        tokenValidation.message || "Invalid token format",
        tokenValidation.code || "INVALID_TOKEN"
      );
    }
    return true;
  },
};

hipaaCompliance.createAuditLog = createAuditLog;

export default hipaaCompliance;
export { createAuditLog };
