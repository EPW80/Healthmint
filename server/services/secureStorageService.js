// ../services/secureStorageService.js
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import crypto from "crypto";
import apiService from "./apiService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { ENV } from "../config/networkConfig.js";

/**
 * Error class for SecureStorage errors
 */
class SecureStorageError extends Error {
  constructor(message, code = "STORAGE_ERROR", details = {}) {
    super(message);
    this.name = "SecureStorageError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * SecureStorageService - HIPAA Compliant Storage
 *
 * Provides methods for securely uploading, downloading, and managing files
 * in compliance with HIPAA regulations, including proper encryption,
 * integrity verification, and audit logging.
 */
class SecureStorageService {
  constructor() {
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    this.ALLOWED_MIME_TYPES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/json",
      "text/plain",
      "application/dicom",
    ];

    // Initialize IPFS client with authentication
    try {
      this.ipfs = create({
        host: ENV.IPFS_HOST || "ipfs.infura.io",
        port: ENV.IPFS_PORT || 5001,
        protocol: ENV.IPFS_PROTOCOL || "https",
        headers: {
          authorization: this.getAuthHeader(),
        },
      });
    } catch (error) {
      console.error("IPFS initialization error:", error);
      // Create fallback to API-based storage if IPFS fails
      this.useApiFallback = true;
    }
  }

  /**
   * Get authorization header for IPFS
   * @private
   */
  getAuthHeader() {
    const projectId = process.env.IPFS_PROJECT_ID || ENV.IPFS_PROJECT_ID;
    const projectSecret =
      process.env.IPFS_PROJECT_SECRET || ENV.IPFS_PROJECT_SECRET;

    if (projectId && projectSecret) {
      return `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString(
        "base64"
      )}`;
    }

    return "";
  }

  /**
   * Validates file type and size
   * @param {File} file - File to validate
   * @returns {Promise<boolean>} Validation result
   */
  async validateFile(file) {
    try {
      if (!file) {
        throw new SecureStorageError("No file provided", "INVALID_INPUT");
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new SecureStorageError(
          `File size exceeds maximum limit of ${
            this.MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
          "SIZE_EXCEEDED"
        );
      }

      if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new SecureStorageError("File type not allowed", "INVALID_TYPE", {
          allowedTypes: this.ALLOWED_MIME_TYPES,
        });
      }

      // Additional security scanning could be implemented here
      await this.scanFile(file);

      return true;
    } catch (error) {
      console.error("File validation error:", error);
      throw error;
    }
  }

  /**
   * Perform security scan on file (placeholder for actual implementation)
   * @param {File} file - File to scan
   * @private
   */
  async scanFile(file) {
    // This would be implemented based on your security requirements
    // For example, virus scanning, content verification, etc.
    return true;
  }

  /**
   * Read file as buffer
   * @param {File} file - File to read
   * @returns {Promise<Buffer>} File buffer
   * @private
   */
  async readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const buffer = Buffer.from(arrayBuffer);
        resolve(buffer);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Generate checksums for content verification
   * @param {Buffer} content - Content to hash
   * @returns {Object} Object containing different hash algorithms
   * @private
   */
  async generateChecksums(content) {
    const algorithms = ["sha256", "sha512"];
    const checksums = {};

    for (const algorithm of algorithms) {
      const hash = crypto.createHash(algorithm);
      hash.update(content);
      checksums[algorithm] = hash.digest("hex");
    }

    return checksums;
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} operation - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>} Operation result
   * @private
   */
  async retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Generate a secure reference from IPFS hash
   * @param {string} ipfsHash - IPFS content identifier
   * @returns {Promise<string>} Secure reference
   * @private
   */
  async generateSecureReference(ipfsHash) {
    const randomBytes = ethers.utils.randomBytes(16);
    const timestamp = Date.now().toString(16);
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes16", "uint256"],
        [ipfsHash, randomBytes, timestamp]
      )
    );
  }

  /**
   * Upload file to secure storage
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with reference
   */
  async uploadFile(file, options = {}) {
    try {
      await this.validateFile(file);

      // If IPFS is not available, use API fallback
      if (this.useApiFallback) {
        return this.uploadViaApi(file, options);
      }

      // Generate encryption key
      const encryptionKey = await hipaaCompliance.generateEncryptionKey();

      // Read and encrypt file content
      const fileContent = await this.readFileAsBuffer(file);
      const encryptedContent = await hipaaCompliance.encrypt(
        fileContent,
        encryptionKey
      );

      // Prepare metadata
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        encryptionVersion: hipaaCompliance.ENCRYPTION_VERSION,
        checksums: await this.generateChecksums(fileContent),
        uploadDate: new Date().toISOString(),
      };

      // Encrypt metadata
      const encryptedMetadata = await hipaaCompliance.encrypt(
        JSON.stringify(metadata),
        encryptionKey
      );

      // Package everything
      const securePackage = {
        content: encryptedContent,
        metadata: encryptedMetadata,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      // Report upload progress
      let lastProgress = 0;
      const updateProgress = (progress) => {
        if (progress > lastProgress) {
          lastProgress = progress;
          options.onProgress?.(progress);
        }
      };

      // Start with 10% progress for preparation
      updateProgress(10);

      // Upload to IPFS with retry
      const result = await this.retryOperation(async () => {
        // Convert to buffer and upload
        const buffer = Buffer.from(JSON.stringify(securePackage));
        updateProgress(30);

        const uploadResult = await this.ipfs.add(buffer);
        updateProgress(80);

        return uploadResult;
      });

      // Generate secure reference
      const reference = await this.generateSecureReference(result.path);
      updateProgress(90);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_UPLOAD", {
        reference,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        ipfsHash: result.path,
        ...options.auditMetadata,
      });

      // Complete
      updateProgress(100);

      return {
        success: true,
        reference,
        hash: result.path,
      };
    } catch (error) {
      console.error("Secure upload error:", error);
      throw new SecureStorageError(
        "Failed to upload file securely",
        "UPLOAD_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Upload file via API as fallback method
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   * @private
   */
  async uploadViaApi(file, options = {}) {
    try {
      // Report upload progress
      options.onProgress?.(10);

      // Upload using API service
      const formData = new FormData();
      formData.append("file", file);

      // Add audit metadata
      if (options.auditMetadata) {
        formData.append("metadata", JSON.stringify(options.auditMetadata));
      }

      // Upload via API service with progress tracking
      const response = await apiService.uploadFile(
        "api/storage/upload",
        file,
        options.onProgress,
        options.auditMetadata
      );

      options.onProgress?.(100);

      return {
        success: true,
        reference: response.reference,
        hash: response.hash,
      };
    } catch (error) {
      console.error("API fallback upload error:", error);
      throw new SecureStorageError(
        "Failed to upload via API",
        "API_UPLOAD_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Download file from secure storage
   * @param {string} reference - Secure reference
   * @param {Object} options - Download options
   * @returns {Promise<Object>} File content and metadata
   */
  async downloadFile(reference, options = {}) {
    try {
      // If using API fallback
      if (this.useApiFallback) {
        return this.downloadViaApi(reference, options);
      }

      // Verify access
      await this.verifyAccess(reference, options.accessToken);

      // Resolve reference to IPFS hash
      const ipfsHash = await this.resolveReference(reference);

      // Report download progress
      let lastProgress = 0;
      const updateProgress = (progress) => {
        if (progress > lastProgress) {
          lastProgress = progress;
          options.onProgress?.(progress);
        }
      };

      updateProgress(10);

      // Fetch from IPFS
      const encryptedPackage = await this.fetchFromIPFS(
        ipfsHash,
        updateProgress
      );

      updateProgress(60);

      // Decrypt content
      const content = await hipaaCompliance.decrypt(encryptedPackage.content);

      // Decrypt metadata
      const metadata = JSON.parse(
        await hipaaCompliance.decrypt(encryptedPackage.metadata)
      );

      updateProgress(80);

      // Verify integrity
      await this.verifyIntegrity(content, metadata.checksums);

      updateProgress(90);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_DOWNLOAD", {
        reference,
        timestamp: new Date(),
        ipfsHash,
        ...options.auditMetadata,
      });

      updateProgress(100);

      return { content, metadata };
    } catch (error) {
      console.error("Secure download error:", error);
      throw new SecureStorageError(
        "Failed to download file securely",
        "DOWNLOAD_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Download file via API as fallback method
   * @param {string} reference - Secure reference
   * @param {Object} options - Download options
   * @returns {Promise<Object>} File content and metadata
   * @private
   */
  async downloadViaApi(reference, options = {}) {
    try {
      options.onProgress?.(10);

      // Download via API service with progress tracking
      const response = await apiService.downloadFile(
        `api/storage/download/${reference}`,
        options.onProgress
      );

      options.onProgress?.(100);

      return response;
    } catch (error) {
      console.error("API download error:", error);
      throw new SecureStorageError(
        "Failed to download via API",
        "API_DOWNLOAD_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete file from secure storage
   * @param {string} reference - Secure reference
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(reference, options = {}) {
    try {
      // If using API fallback
      if (this.useApiFallback) {
        return this.deleteViaApi(reference, options);
      }

      // Verify access
      await this.verifyAccess(reference, options.accessToken);

      // Resolve reference to IPFS hash
      const ipfsHash = await this.resolveReference(reference);

      // IPFS doesn't allow true deletion, but we can remove the pin
      await this.ipfs.pin.rm(ipfsHash);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_DELETE", {
        reference,
        timestamp: new Date(),
        ipfsHash,
        ...options.auditMetadata,
      });

      return true;
    } catch (error) {
      console.error("Secure deletion error:", error);
      throw new SecureStorageError(
        "Failed to delete file securely",
        "DELETE_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete file via API as fallback method
   * @param {string} reference - Secure reference
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async deleteViaApi(reference, options = {}) {
    try {
      // Delete via API
      await apiService.delete(`api/storage/delete/${reference}`, {
        data: options.auditMetadata,
      });

      return true;
    } catch (error) {
      console.error("API deletion error:", error);
      throw new SecureStorageError(
        "Failed to delete via API",
        "API_DELETE_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Resolve a secure reference to an IPFS hash
   * @param {string} reference - Secure reference
   * @returns {Promise<string>} IPFS hash
   * @private
   */
  async resolveReference(reference) {
    try {
      // In a real implementation, this would query a database
      // to resolve the reference to an IPFS hash
      // For now, we'll use a simplified approach with API
      const response = await apiService.get(`api/storage/resolve/${reference}`);
      return response.ipfsHash;
    } catch (error) {
      console.error("Reference resolution error:", error);
      throw new SecureStorageError(
        "Failed to resolve reference",
        "RESOLUTION_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Verify access to a file
   * @param {string} reference - Secure reference
   * @param {string} accessToken - Access token
   * @returns {Promise<boolean>} Access verification result
   * @private
   */
  async verifyAccess(reference, accessToken) {
    // If no token provided and not requiring strict access control,
    // allow access (useful for public profile images)
    if (!accessToken && !this.requireStrictAccess) {
      return true;
    }

    try {
      const response = await apiService.post(`api/storage/verify-access`, {
        reference,
        accessToken,
      });

      return response.hasAccess === true;
    } catch (error) {
      console.error("Access verification error:", error);
      throw new SecureStorageError(
        "Access verification failed",
        "ACCESS_DENIED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Fetch data from IPFS
   * @param {string} hash - IPFS hash
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<Object>} IPFS data
   * @private
   */
  async fetchFromIPFS(hash, progressCallback) {
    const chunks = [];
    let totalSize = 0;

    for await (const chunk of this.ipfs.cat(hash)) {
      chunks.push(chunk);
      totalSize += chunk.length;
      progressCallback?.(
        40 + Math.min(20, Math.floor((totalSize / (1024 * 1024)) * 2))
      );
    }

    return JSON.parse(Buffer.concat(chunks).toString());
  }

  /**
   * Verify content integrity using checksums
   * @param {Buffer} content - Content to verify
   * @param {Object} storedChecksums - Checksums stored with the content
   * @returns {Promise<boolean>} Integrity verification result
   * @private
   */
  async verifyIntegrity(content, storedChecksums) {
    const currentChecksums = await this.generateChecksums(content);

    for (const [algorithm, hash] of Object.entries(currentChecksums)) {
      if (hash !== storedChecksums[algorithm]) {
        throw new SecureStorageError(
          "File integrity check failed",
          "INTEGRITY_ERROR",
          {
            algorithm,
            expected: storedChecksums[algorithm],
            actual: hash,
          }
        );
      }
    }

    return true;
  }

  /**
   * Get health records for a user
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Health records
   */
  async getHealthRecords(options = {}) {
    try {
      const response = await apiService.get("api/data/records", options);
      return response.data;
    } catch (error) {
      console.error("Health records retrieval error:", error);
      throw new SecureStorageError(
        "Failed to retrieve health records",
        "RETRIEVAL_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle emergency access to data
   * @param {string} requestedBy - Requester address
   * @param {string} dataId - Data ID
   * @param {string} reason - Emergency reason
   * @returns {Promise<Object>} Access result
   */
  async handleEmergencyAccess(requestedBy, dataId, reason) {
    try {
      const response = await apiService.post("api/data/emergency-access", {
        requestedBy,
        dataId,
        reason,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      console.error("Emergency access error:", error);
      throw new SecureStorageError(
        "Failed to process emergency access",
        "EMERGENCY_ACCESS_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Browse health data based on filters
   * @param {Object} options - Browse options
   * @returns {Promise<Object>} Browse results
   */
  async browseHealthData(options = {}) {
    try {
      const response = await apiService.get(
        "api/data/browse",
        options?.filters,
        {
          params: options?.pagination,
        }
      );

      return {
        data: response.data || [],
        pagination: response.pagination || {
          page: 1,
          totalPages: 1,
          totalItems: response.data?.length || 0,
        },
      };
    } catch (error) {
      console.error("Browse error:", error);
      throw new SecureStorageError(
        "Failed to browse health data",
        "BROWSE_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Get health data details
   * @param {string} id - Data ID
   * @param {string} requestedBy - Requester address
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Health data details
   */
  async getHealthDataDetails(id, requestedBy, metadata = {}) {
    try {
      const response = await apiService.get(`api/data/${id}`, {
        requestedBy,
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return response.data;
    } catch (error) {
      console.error("Data details error:", error);
      throw new SecureStorageError(
        "Failed to get health data details",
        "DETAILS_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Get data categories
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Array>} Data categories
   */
  async getCategories(metadata = {}) {
    try {
      const response = await apiService.get("api/data/categories");
      return response.categories || [];
    } catch (error) {
      console.error("Categories error:", error);
      throw new SecureStorageError(
        "Failed to get data categories",
        "CATEGORIES_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Get audit log for data
   * @param {string} dataId - Data ID
   * @param {string} requestedBy - Requester address
   * @returns {Promise<Array>} Audit log entries
   */
  async getAuditLog(dataId, requestedBy) {
    try {
      const response = await apiService.get("api/data/audit", {
        dataId,
        requestedBy,
      });

      return response.auditLog || [];
    } catch (error) {
      console.error("Audit log error:", error);
      throw new SecureStorageError(
        "Failed to retrieve audit log",
        "AUDIT_LOG_FAILED",
        { originalError: error.message }
      );
    }
  }

  /**
   * Store health data
   * @param {string} address - Owner address
   * @param {Object} data - Health data
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Storage result
   */
  async storeHealthData(address, data, metadata = {}) {
    try {
      const response = await apiService.post("api/data/upload", {
        address,
        data,
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return response;
    } catch (error) {
      console.error("Health data storage error:", error);
      throw new SecureStorageError(
        "Failed to store health data",
        "STORAGE_FAILED",
        { originalError: error.message }
      );
    }
  }
}

// Create singleton instance
const secureStorageService = new SecureStorageService();

// Export class and instance
export { SecureStorageService, secureStorageService };

export default SecureStorageService;
