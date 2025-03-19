// src/services/secureStorageService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import errorHandlingService from "./errorHandlingService.js";
import { STORAGE_CONFIG } from "../config/environmentConfig.js";

/**
 * Client-side secure storage service for handling file operations
 * with proper HIPAA compliance and security measures
 */
class SecureStorageService {
  constructor() {
    this.MAX_FILE_SIZE = STORAGE_CONFIG?.MAX_FILE_SIZE || 50 * 1024 * 1024; // 50MB default
    this.ALLOWED_MIME_TYPES = STORAGE_CONFIG?.ALLOWED_MIME_TYPES || [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/json",
      "text/plain",
    ];
  }

  /**
   * Validates file before upload
   * @param {File} file - File to validate
   * @returns {boolean} Validation result
   * @throws {Error} Validation error
   */
  validateFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(
        `File type ${file.type} not allowed. Supported types: ${this.ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    return true;
  }

  /**
   * Upload a profile image with proper security and HIPAA compliance
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadProfileImage(file, options = {}) {
    try {
      // Validate file
      this.validateFile(file);

      // Create audit metadata for HIPAA compliance
      const auditMetadata = {
        uploadType: "PROFILE_IMAGE",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "UPLOAD",
      };

      // Log the upload attempt
      await hipaaComplianceService.createAuditLog("PROFILE_IMAGE_UPLOAD", {
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(auditMetadata));

      // Perform actual upload via API service
      const response = await apiService.uploadFile(
        "api/storage/upload",
        file,
        options.onProgress,
        auditMetadata
      );

      return {
        success: true,
        reference: response.reference,
        url: response.url || URL.createObjectURL(file), // Fallback to local URL if server doesn't provide one
      };
    } catch (error) {
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
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file
      this.validateFile(file);

      // Create audit metadata for HIPAA compliance
      const auditMetadata = {
        uploadType: options.auditMetadata?.uploadType || "FILE_UPLOAD",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "UPLOAD",
        ...options.auditMetadata,
      };

      // Log the upload attempt
      await hipaaComplianceService.createAuditLog("FILE_UPLOAD", {
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(auditMetadata));

      // Perform actual upload via API service
      const response = await apiService.uploadFile(
        options.endpoint || "api/storage/upload",
        file,
        options.onProgress,
        auditMetadata
      );

      return {
        success: true,
        reference: response.reference,
        url: response.url || URL.createObjectURL(file), // Fallback to local URL if server doesn't provide one
        metadata: response.metadata,
      };
    } catch (error) {
      return errorHandlingService.handleError(error, {
        code: "FILE_UPLOAD_ERROR",
        context: options.context || "File Upload",
        userVisible: true,
        defaultValue: { success: false, error: error.message },
      });
    }
  }

  /**
   * Delete a file from secure storage
   * @param {string} reference - Storage reference
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(reference, options = {}) {
    try {
      if (!reference) {
        throw new Error("Storage reference is required");
      }

      // Create audit metadata for HIPAA compliance
      const auditMetadata = {
        uploadType: options.auditMetadata?.uploadType || "FILE_DELETE",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "DELETE",
        ...options.auditMetadata,
      };

      // Log the deletion attempt
      await hipaaComplianceService.createAuditLog("FILE_DELETE", {
        reference,
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // Perform actual deletion via API service
      const response = await apiService.delete(
        `api/storage/delete/${reference}`,
        {
          data: auditMetadata,
        }
      );

      return {
        success: true,
        message: response.message || `Successfully deleted ${reference}`,
      };
    } catch (error) {
      return errorHandlingService.handleError(error, {
        code: "DELETE_ERROR",
        context: options.context || "File Delete",
        userVisible: true,
        defaultValue: { success: false, error: error.message },
      });
    }
  }

  /**
   * Check file for PHI (Personal Health Information)
   * Delegates to HIPAA compliance service
   * @param {string} text - Text to check
   * @returns {Object} PHI detection result
   */
  checkForPHI(text) {
    return hipaaComplianceService.containsPHI(text);
  }
}

// Create singleton instance
const secureStorageService = new SecureStorageService();
export default secureStorageService;
