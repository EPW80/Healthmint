// src/services/secureStorageService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import errorHandlingService from "./errorHandlingService.js";
import { STORAGE_CONFIG } from "../config/environmentConfig.js";

// Import encryptionService conditionally to avoid breaking the app if it doesn't exist
let encryptionService = null;
try {
  encryptionService = require("./encryptionService.js").default;
} catch (e) {
  console.warn(
    "Encryption service not available. Using fallback security measures."
  );
}

/**
 * SecureStorageService
 *
 * A HIPAA-compliant secure storage service for handling file operations
 * with proper encryption, audit logging, and security measures.
 *
 * Features:
 * - Client-side validation and sanitization
 * - Encryption for sensitive data (if available)
 * - Comprehensive HIPAA compliance logging
 * - PHI (Protected Health Information) detection
 * - Secure file management
 */
class SecureStorageService {
  constructor() {
    // Default configuration with fallbacks
    this.config = {
      maxFileSize: STORAGE_CONFIG?.MAX_FILE_SIZE || 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes: STORAGE_CONFIG?.ALLOWED_MIME_TYPES || [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/json",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      endpoints: {
        upload: STORAGE_CONFIG?.ENDPOINTS?.UPLOAD || "api/storage/upload",
        delete: STORAGE_CONFIG?.ENDPOINTS?.DELETE || "api/storage/delete",
        download: STORAGE_CONFIG?.ENDPOINTS?.DOWNLOAD || "api/storage/download",
      },
      encryptFiles:
        STORAGE_CONFIG?.ENCRYPT_FILES !== false && !!encryptionService, // Only enable if service exists
      retentionPeriod: STORAGE_CONFIG?.RETENTION_PERIOD || 7 * 365, // 7 years default for HIPAA
    };

    // Initialize service
    this.initService();
  }

  /**
   * Initialize the service
   * @private
   */
  initService() {
    // Log service initialization for compliance
    hipaaComplianceService
      .createAuditLog("STORAGE_SERVICE_INIT", {
        timestamp: new Date().toISOString(),
        configuration: {
          maxFileSize: this.config.maxFileSize,
          allowedMimeTypes: this.config.allowedMimeTypes,
          encryptionEnabled: this.config.encryptFiles,
        },
      })
      .catch((err) =>
        console.error("Failed to log service initialization:", err)
      );
  }

  /**
   * Comprehensively validates file before upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {boolean} Validation result
   * @throws {Error} Validation error with specific reason
   */
  validateFile(file, options = {}) {
    // Required file
    if (!file) {
      throw new Error("No file provided");
    }

    // File size validation
    const maxSize = options.maxFileSize || this.config.maxFileSize;
    if (file.size > maxSize) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    // File type validation
    const allowedTypes =
      options.allowedMimeTypes || this.config.allowedMimeTypes;
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `File type "${file.type}" is not allowed. Supported types: ${allowedTypes.join(", ")}`
      );
    }

    // Filename validation - prevent path traversal
    if (
      file.name &&
      (file.name.includes("../") || file.name.includes("..\\"))
    ) {
      throw new Error("Invalid filename: contains potential path traversal");
    }

    // Optional extension validation
    if (options.allowedExtensions) {
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!options.allowedExtensions.includes(`.${fileExt}`)) {
        throw new Error(
          `File extension ".${fileExt}" is not allowed. Supported extensions: ${options.allowedExtensions.join(", ")}`
        );
      }
    }

    // Optional content scan (if file is readable as text)
    if (
      options.scanForPHI &&
      (file.type.includes("text") || file.type.includes("json"))
    ) {
      // Set up file reader to check content
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const phiResult = this.checkForPHI(content);
            if (phiResult.containsPHI) {
              reject(
                new Error(
                  "File contains unmasked PHI and cannot be uploaded without proper authorization"
                )
              );
            } else {
              resolve(true);
            }
          } catch (err) {
            reject(new Error(`Error analyzing file content: ${err.message}`));
          }
        };
        reader.onerror = () =>
          reject(new Error("Failed to read file for validation"));
        reader.readAsText(file);
      });
    }

    return true;
  }

  /**
   * Upload a profile image with proper security and HIPAA compliance
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure reference
   */
  async uploadProfileImage(file, options = {}) {
    try {
      // Validate file with strict image-specific options
      const imageOptions = {
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"],
        maxFileSize: 5 * 1024 * 1024, // 5MB for profile images
      };

      await this.validateFile(file, imageOptions);

      // Generate file hash when encryption service is available
      let fileHash = "hash-unavailable";
      if (encryptionService) {
        try {
          fileHash = await encryptionService.hashFile(file);
        } catch (e) {
          console.warn("Failed to generate file hash:", e);
        }
      }

      // Enhanced audit metadata for HIPAA compliance
      const auditMetadata = {
        uploadType: "PROFILE_IMAGE",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "UPLOAD",
        ipAddress: "client", // Will be replaced by server
        clientInfo: navigator.userAgent,
        fileHash,
        ...options.auditMetadata,
      };

      // Log the upload attempt with comprehensive details
      await hipaaComplianceService.createAuditLog("PROFILE_IMAGE_UPLOAD", {
        fileType: file.type,
        fileSize: file.size,
        fileName: this.sanitizeFileName(file.name),
        timestamp: new Date().toISOString(),
        uploadPurpose: options.purpose || "Profile image update",
        userId: options.userIdentifier,
      });

      // Encrypt file if encryption service is available and encryption is enabled
      let processedFile = file;
      if (
        this.config.encryptFiles &&
        options.encrypt !== false &&
        encryptionService
      ) {
        try {
          processedFile = await encryptionService.encryptFile(file);
          auditMetadata.encrypted = true;
        } catch (e) {
          console.warn(
            "File encryption failed, proceeding with unencrypted file:",
            e
          );
        }
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("metadata", JSON.stringify(auditMetadata));

      // Track upload progress if callback provided
      const onProgress = options.onProgress || (() => {});

      // Perform actual upload via API service
      const response = await apiService.uploadFile(
        this.config.endpoints.upload,
        processedFile,
        onProgress,
        auditMetadata
      );

      // Log successful upload
      await hipaaComplianceService.createAuditLog(
        "PROFILE_IMAGE_UPLOAD_SUCCESS",
        {
          reference: response.reference,
          timestamp: new Date().toISOString(),
          userId: options.userIdentifier,
        }
      );

      return {
        success: true,
        reference: response.reference,
        url: response.url,
        metadata: response.metadata,
      };
    } catch (error) {
      // Log upload failure for compliance
      hipaaComplianceService
        .createAuditLog("PROFILE_IMAGE_UPLOAD_FAILED", {
          error: error.message,
          timestamp: new Date().toISOString(),
          userId: options.userIdentifier,
        })
        .catch((err) => console.error("Failed to log upload error:", err));

      return errorHandlingService.handleError(error, {
        code: "UPLOAD_ERROR",
        context: "Profile Image",
        userVisible: true,
        defaultValue: { success: false, error: error.message },
      });
    }
  }

  /**
   * Upload any file securely with HIPAA compliance
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure reference
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file with provided options
      await this.validateFile(file, options);

      // Generate file hash if encryption service is available
      let fileHash = "hash-unavailable";
      if (encryptionService) {
        try {
          fileHash = await encryptionService.hashFile(file);
        } catch (e) {
          console.warn("Failed to generate file hash:", e);
        }
      }

      // Enhanced audit metadata for HIPAA compliance
      const auditMetadata = {
        uploadType: options.auditMetadata?.uploadType || "FILE_UPLOAD",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "UPLOAD",
        ipAddress: "client", // Will be replaced by server
        fileHash,
        fileName: this.sanitizeFileName(file.name),
        fileType: file.type,
        fileSize: file.size,
        ...options.auditMetadata,
      };

      // Log the upload attempt with comprehensive details
      await hipaaComplianceService.createAuditLog("FILE_UPLOAD", {
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // Check if this file contains PHI for health-related uploads
      if (
        options.hipaaRelevant &&
        (file.type.includes("text") || file.type.includes("json"))
      ) {
        try {
          const fileContent = await this.readFileAsText(file);
          const phiResult = this.checkForPHI(fileContent);

          if (phiResult.containsPHI) {
            // Add PHI information to metadata for server-side handling
            auditMetadata.containsPHI = true;
            auditMetadata.phiTypes = phiResult.phiTypes;

            // If PHI found but uploading is permitted, ensure proper logging
            await hipaaComplianceService.createAuditLog("PHI_UPLOAD_ATTEMPT", {
              timestamp: new Date().toISOString(),
              userId: options.userIdentifier,
              phiTypes: phiResult.phiTypes,
              uploadReason: options.uploadReason || "Not specified",
            });
          }
        } catch (readError) {
          console.warn("Could not scan file for PHI:", readError);
        }
      }

      // Encrypt file if encryption service is available and encryption is enabled
      let processedFile = file;
      if (
        this.config.encryptFiles &&
        options.encrypt !== false &&
        encryptionService
      ) {
        try {
          processedFile = await encryptionService.encryptFile(file);
          auditMetadata.encrypted = true;
        } catch (e) {
          console.warn(
            "File encryption failed, proceeding with unencrypted file:",
            e
          );
        }
      }

      // Track upload progress if callback provided
      const onProgress = options.onProgress || (() => {});

      // Perform actual upload via API service
      const response = await apiService.uploadFile(
        options.endpoint || this.config.endpoints.upload,
        processedFile,
        onProgress,
        auditMetadata
      );

      // Log successful upload
      await hipaaComplianceService.createAuditLog("FILE_UPLOAD_SUCCESS", {
        reference: response.reference,
        timestamp: new Date().toISOString(),
        userId: options.userIdentifier,
      });

      return {
        success: true,
        reference: response.reference,
        url: response.url,
        metadata: response.metadata,
      };
    } catch (error) {
      // Log upload failure for compliance
      hipaaComplianceService
        .createAuditLog("FILE_UPLOAD_FAILED", {
          error: error.message,
          timestamp: new Date().toISOString(),
          userId: options.userIdentifier,
        })
        .catch((err) => console.error("Failed to log upload error:", err));

      return errorHandlingService.handleError(error, {
        code: "FILE_UPLOAD_ERROR",
        context: options.context || "File Upload",
        userVisible: true,
        defaultValue: { success: false, error: error.message },
      });
    }
  }

  /**
   * Delete a file from secure storage with HIPAA compliance logging
   * @param {string} reference - Storage reference
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(reference, options = {}) {
    try {
      if (!reference) {
        throw new Error("Storage reference is required");
      }

      // Create enhanced audit metadata for HIPAA compliance
      const auditMetadata = {
        deleteType: options.auditMetadata?.uploadType || "FILE_DELETE",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "DELETE",
        ipAddress: "client", // Will be replaced by server
        clientInfo: navigator.userAgent,
        deleteReason: options.reason || "User requested deletion",
        ...options.auditMetadata,
      };

      // Log the deletion attempt with comprehensive details
      await hipaaComplianceService.createAuditLog("FILE_DELETE", {
        reference,
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // Perform actual deletion via API service
      const response = await apiService.delete(
        `${this.config.endpoints.delete}/${reference}`,
        {
          data: auditMetadata,
        }
      );

      // Log successful deletion
      await hipaaComplianceService.createAuditLog("FILE_DELETE_SUCCESS", {
        reference,
        timestamp: new Date().toISOString(),
        userId: options.userIdentifier,
      });

      return {
        success: true,
        message: response.message || `Successfully deleted ${reference}`,
      };
    } catch (error) {
      // Log deletion failure for compliance
      hipaaComplianceService
        .createAuditLog("FILE_DELETE_FAILED", {
          reference,
          error: error.message,
          timestamp: new Date().toISOString(),
          userId: options.userIdentifier,
        })
        .catch((err) => console.error("Failed to log deletion error:", err));

      return errorHandlingService.handleError(error, {
        code: "DELETE_ERROR",
        context: options.context || "File Delete",
        userVisible: true,
        defaultValue: { success: false, error: error.message },
      });
    }
  }

  /**
   * Download a file with proper access logging
   * @param {string} reference - Storage reference
   * @param {Object} options - Download options
   * @returns {Promise<Blob>} File blob
   */
  async downloadFile(reference, options = {}) {
    try {
      if (!reference) {
        throw new Error("Storage reference is required");
      }

      // Create audit metadata for HIPAA compliance
      const auditMetadata = {
        downloadType: options.downloadType || "FILE_DOWNLOAD",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "DOWNLOAD",
        ipAddress: "client", // Will be replaced by server
        downloadReason: options.reason || "User requested download",
        ...options.auditMetadata,
      };

      // Log the download attempt
      await hipaaComplianceService.createAuditLog("FILE_DOWNLOAD", {
        reference,
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // Check if consent is required for download
      if (options.requireConsent) {
        const consentVerified = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          {
            actionType: "DOWNLOAD",
            dataId: reference,
            ...auditMetadata,
          }
        );

        if (!consentVerified) {
          throw new Error("User consent required for download");
        }
      }

      // Track download progress if callback provided
      const onProgress = options.onProgress || (() => {});

      // Perform actual download via API service
      const response = await apiService.downloadFile(
        `${this.config.endpoints.download}/${reference}`,
        onProgress,
        auditMetadata
      );

      // Decrypt file if needed, encryption service exists, and metadata indicates encryption
      let fileData = response.data;
      if (
        response.metadata?.encrypted &&
        this.config.encryptFiles &&
        encryptionService
      ) {
        try {
          fileData = await encryptionService.decryptFile(fileData);
        } catch (e) {
          console.warn("File decryption failed, returning encrypted file:", e);
        }
      }

      // Log successful download
      await hipaaComplianceService.createAuditLog("FILE_DOWNLOAD_SUCCESS", {
        reference,
        timestamp: new Date().toISOString(),
        userId: options.userIdentifier,
      });

      return fileData;
    } catch (error) {
      // Log download failure for compliance
      hipaaComplianceService
        .createAuditLog("FILE_DOWNLOAD_FAILED", {
          reference,
          error: error.message,
          timestamp: new Date().toISOString(),
          userId: options.userIdentifier,
        })
        .catch((err) => console.error("Failed to log download error:", err));

      return errorHandlingService.handleError(error, {
        code: "DOWNLOAD_ERROR",
        context: options.context || "File Download",
        userVisible: true,
        throw: true,
      });
    }
  }

  /**
   * Check file content for PHI (Protected Health Information)
   * Delegates to HIPAA compliance service
   * @param {string} text - Text to check for PHI
   * @returns {Object} PHI detection result with types found
   */
  checkForPHI(text) {
    return hipaaComplianceService.containsPHI(text);
  }

  /**
   * Generate a simple hash for the file when encryption service isn't available
   * @param {File} file - File to hash
   * @returns {string} Simple hash of the file
   * @private
   */
  generateSimpleFileHash(file) {
    const str = `${file.name}:${file.size}:${file.lastModified}`;
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  /**
   * Sanitize a filename to prevent security issues
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   * @private
   */
  sanitizeFileName(filename) {
    if (!filename) return "unnamed-file";

    // Remove path traversal and control characters
    return filename
      .replace(/\.\.\//g, "")
      .replace(/\.\.\\/g, "")
      .replace(/[^\w\s.-]/g, "_")
      .trim();
  }

  /**
   * Read file as text asynchronously
   * @param {File} file - File to read
   * @returns {Promise<string>} File contents as text
   * @private
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
const secureStorageService = new SecureStorageService();
export default secureStorageService;
