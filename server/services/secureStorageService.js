// ../services/secureStorageService.js
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import crypto from "crypto";
import apiService from "./apiService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { ENV } from "../config/networkConfig.js";
import validation from '../validation/index.js';

// Error handling
class SecureStorageError extends Error {
  constructor(message, code = "STORAGE_ERROR", details = {}) {
    super(message);
    this.name = "SecureStorageError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/// SecureStorage class for handling file uploads, downloads, and management
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
      "application/csv",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    // Add cache for resolved references
    this.referenceCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes

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

      // Validate connection to IPFS
      this.validateIPFSConnection().catch((error) => {
        console.warn("⚠️ IPFS connection validation failed:", error.message);
        this.useApiFallback = true;
      });
    } catch (error) {
      console.error("IPFS initialization error:", error);
      // Create fallback to API-based storage if IPFS fails
      this.useApiFallback = true;
    }
  }

  /// Fallback to API if IPFS is not available
  async validateIPFSConnection() {
    if (!this.ipfs) {
      throw new Error("IPFS client not initialized");
    }

    try {
      // Simple validation by getting IPFS node ID
      const nodeInfo = await this.ipfs.id();
      console.log(`✅ Connected to IPFS node: ${nodeInfo.id}`);
      return true;
    } catch (error) {
      console.error("IPFS connection validation failed:", error);
      throw error;
    }
  }

  /// Generate authentication header for IPFS
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

  /// Upload a file to IPFS and return the IPFS hash
  async validateFile(file) {
    try {
      const fileValidationResult = validation.validateFile(file, this.MAX_FILE_SIZE, this.ALLOWED_MIME_TYPES);
      if (!fileValidationResult.isValid) {
        throw new SecureStorageError(
          fileValidationResult.message,
          fileValidationResult.code,
          fileValidationResult.details
        );
      }

      // Check filename for suspicious patterns
      const filename = file.name || "";
      const suspiciousPatterns = [
        /\.\.|\/|\\|~|%00|%0A/, // Path traversal attempts
        /\.exe$|\.dll$|\.bat$|\.cmd$|\.sh$/i, // Executable files
        /\.php$|\.jsp$|\.asp$/i, // Server scripts
      ];

      if (suspiciousPatterns.some((pattern) => pattern.test(filename))) {
        throw new SecureStorageError(
          "Suspicious filename detected",
          "SECURITY_FILENAME",
          { filename }
        );
      }

      // Additional security scanning could be implemented here
      await this.scanFile(file);

      return true;
    } catch (error) {
      console.error("File validation error:", error);
      throw error;
    }
  }

  /// Upload a file to IPFS and return the IPFS hash
  async scanFile(file) {
    // This would be implemented based on your security requirements
    // For example, virus scanning, content verification, etc.
    return true;
  }

  /// Read file as buffer
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

  /// Upload a file to IPFS and return the IPFS hash
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

  /// Upload a file to IPFS and return the IPFS hash
  async retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /// Generate a secure reference for the file
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

  /// Upload a file to IPFS and return the IPFS hash
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

      // Add dataset-specific metadata if provided
      if (options.datasetMetadata) {
        metadata.datasetMetadata = options.datasetMetadata;
      }

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

      // Store in cache
      this.cacheReference(reference, result.path);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_UPLOAD", {
        reference,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        ipfsHash: result.path,
        isDataset: !!options.datasetMetadata,
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

  // Cache the reference with IPFS hash
  cacheReference(reference, ipfsHash) {
    this.referenceCache.set(reference, {
      ipfsHash,
      timestamp: Date.now(),
    });

    // Clean old cache entries periodically
    if (this.referenceCache.size > 100) {
      this.cleanReferenceCache();
    }
  }

  // Clean old cache entries
  cleanReferenceCache() {
    const now = Date.now();
    for (const [reference, data] of this.referenceCache.entries()) {
      if (now - data.timestamp > this.cacheTimeout) {
        this.referenceCache.delete(reference);
      }
    }
  }

  // Upload a file to IPFS using an API service
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

      // Add dataset metadata if available
      if (options.datasetMetadata) {
        formData.append(
          "datasetMetadata",
          JSON.stringify(options.datasetMetadata)
        );
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

  /// Download a file from secure storage
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
        fileType: metadata.type,
        fileSize: metadata.size,
        isDataset: !!metadata.datasetMetadata,
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

  /// Download a file using API as fallback method
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

  /// Delete a file securely
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

      // Remove from cache
      this.referenceCache.delete(reference);

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

  // Delete a file using API as fallback method
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

  // Verify access to a file
  async resolveReference(reference) {
    try {
      // Check cache first
      if (this.referenceCache.has(reference)) {
        const cachedData = this.referenceCache.get(reference);
        // Check if cache entry is still valid
        if (Date.now() - cachedData.timestamp < this.cacheTimeout) {
          return cachedData.ipfsHash;
        } else {
          // Remove expired cache entry
          this.referenceCache.delete(reference);
        }
      }

      // If not in cache, query API
      const response = await apiService.get(`api/storage/resolve/${reference}`);

      // Add to cache
      if (response.ipfsHash) {
        this.cacheReference(reference, response.ipfsHash);
      }

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

  // Generate checksums for a content
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

  // Generate checksums for a content
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

  // Generate checksums for a content
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

  // Get health data details
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

  // Create a new health record
  async getDataset(id, requestedBy, metadata = {}) {
    try {
      const response = await apiService.get(`api/datasets/${id}`, {
        requestedBy,
        timestamp: new Date().toISOString(),
        dataType: "dataset",
        ...metadata,
      });

      // Create audit log for dataset access
      await hipaaCompliance.createAuditLog("DATASET_ACCESS", {
        datasetId: id,
        requestedBy,
        timestamp: new Date(),
        purpose: metadata.purpose || "view",
      });

      return response.data;
    } catch (error) {
      console.error("Dataset retrieval error:", error);
      throw new SecureStorageError(
        "Failed to retrieve dataset",
        "DATASET_RETRIEVAL_FAILED",
        { originalError: error.message, datasetId: id }
      );
    }
  }

  async downloadDataset(id, options = {}) {
    try {
      // Verify this is a dataset
      const verifyResult = await apiService.get(`api/datasets/${id}/verify`, {
        requestedBy: options.requestedBy,
        timestamp: new Date().toISOString(),
      });

      if (!verifyResult.isDataset) {
        throw new SecureStorageError(
          "Resource is not a dataset or access denied",
          "INVALID_DATASET",
          { id }
        );
      }

      // Create a pre-download audit log
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_INITIATED", {
        datasetId: id,
        requestedBy: options.requestedBy,
        purpose: options.purpose || "unknown",
        timestamp: new Date(),
      });

      // Use the standard download file function
      const result = await this.downloadFile(id, {
        ...options,
        auditMetadata: {
          ...options.auditMetadata,
          dataType: "dataset",
          purpose: options.purpose || "download",
        },
      });

      // Post-download audit
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_COMPLETED", {
        datasetId: id,
        requestedBy: options.requestedBy,
        fileSize: result.content.length,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      // Log download failure
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_FAILED", {
        datasetId: id,
        requestedBy: options.requestedBy || "anonymous",
        error: error.message,
        timestamp: new Date(),
      });

      console.error("Dataset download error:", error);
      throw new SecureStorageError(
        "Failed to download dataset",
        "DATASET_DOWNLOAD_FAILED",
        { originalError: error.message, datasetId: id }
      );
    }
  }

  async listDatasets(options = {}, metadata = {}) {
    try {
      const response = await apiService.get(`api/datasets`, {
        ...options,
        dataType: "dataset",
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return {
        data: response.data || [],
        pagination: response.pagination || {
          page: 1,
          totalPages: 1,
          totalItems: response.data?.length || 0,
        },
      };
    } catch (error) {
      console.error("Dataset listing error:", error);
      throw new SecureStorageError(
        "Failed to list datasets",
        "DATASET_LIST_FAILED",
        { originalError: error.message }
      );
    }
  }

  async uploadDataset(file, datasetMetadata = {}, options = {}) {
    // Validate required dataset metadata
    if (!datasetMetadata.description) {
      throw new SecureStorageError(
        "Dataset description is required",
        "INVALID_DATASET_METADATA"
      );
    }

    // Validate file type is appropriate for datasets
    const datasetFileTypes = [
      "text/csv",
      "application/csv",
      "application/json",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!datasetFileTypes.includes(file.type)) {
      throw new SecureStorageError(
        "Invalid file format for dataset",
        "INVALID_DATASET_FORMAT",
        {
          providedType: file.type,
          allowedTypes: datasetFileTypes,
        }
      );
    }

    // Add dataset type to metadata
    const enhancedMetadata = {
      ...datasetMetadata,
      dataType: "dataset",
      uploadedAt: new Date().toISOString(),
      version: datasetMetadata.version || "1.0",
    };

    // Use standard upload with dataset metadata
    return this.uploadFile(file, {
      ...options,
      datasetMetadata: enhancedMetadata,
      auditMetadata: {
        ...options.auditMetadata,
        dataType: "dataset",
      },
    });
  }

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

  async getDatasetAuditLog(datasetId, requestedBy) {
    try {
      const response = await apiService.get(`api/datasets/${datasetId}/audit`, {
        requestedBy,
        timestamp: new Date().toISOString(),
      });

      return response.auditLog || [];
    } catch (error) {
      console.error("Dataset audit log error:", error);
      throw new SecureStorageError(
        "Failed to retrieve dataset audit log",
        "DATASET_AUDIT_LOG_FAILED",
        { originalError: error.message, datasetId }
      );
    }
  }

  // Store health data
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

const secureStorageService = new SecureStorageService();

export { SecureStorageService, secureStorageService };
export default secureStorageService;
