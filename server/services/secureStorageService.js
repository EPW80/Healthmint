// ../services/secureStorageService.js
import { Buffer } from "buffer";
import { ethers } from "ethers";
import crypto from "crypto";
import apiService from "./apiService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import validation from "../validation/index.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as w3up from "@web3-storage/w3up-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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

// Secure Storage Service
class SecureStorageService {
  constructor() {
    this.storageClient = null;
    this.storageType = process.env.IPFS_PROVIDER || "web3storage"; // Match your env var name
    this.initialized = false;
    this.client = null;

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
  }

  async initialize() {
    try {
      // Don't re-initialize if already initialized
      if (this.initialized && this.client) {
        console.log("Storage service already initialized.");
        return this;
      }

      console.log("Storage initialization:");
      console.log("- IPFS_PROVIDER:", process.env.IPFS_PROVIDER);
      console.log(
        "- WEB3_STORAGE_TOKEN:",
        process.env.WEB3_STORAGE_TOKEN ? "Present" : "Missing"
      );

      if (this.storageType === "web3storage") {
        // Create w3up client
        this.client = await w3up.create();

        // For testing only - use the public w3up gateway
        const space = await this.client.createSpace("healthmint-storage");
        await this.client.setCurrentSpace(space.did());

        // Set storageClient to match client for consistency
        this.storageClient = this.client;

        this.initialized = true;
        console.log("✅ Modern Web3Storage client initialized successfully");
        return this;
      } else {
        throw new Error(`Unsupported storage provider: ${this.storageType}`);
      }
    } catch (error) {
      this.initialized = false;
      this.client = null;
      this.storageClient = null;
      console.error("❌ Failed to initialize storage service:", error);
      throw error; // Re-throw to allow proper handling in server.js
    }
  }

  async validateIPFSConnection() {
    if (!this.initialized || !this.client) {
      console.error("❌ Storage client not initialized");
      return false;
    }

    try {
      console.log("Testing Web3Storage connection...");
      // Just checking if we have access to the space
      const space = this.client.currentSpace();
      console.log("✅ Web3Storage connection validated successfully");
      return !!space;
    } catch (error) {
      console.error("❌ IPFS connection validation failed:", error);
      return false;
    }
  }

  async validateFile(file) {
    try {
      const fileValidationResult = validation.validateFile(
        file,
        this.MAX_FILE_SIZE,
        this.ALLOWED_MIME_TYPES
      );
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

  async scanFile(file) {
    // This would be implemented based on your security requirements
    // For example, virus scanning, content verification, etc.
    return true;
  }

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

        const uploadResult = await this.uploadToIPFS(buffer, {
          fileName: file.name,
          mimeType: file.type,
        });
        updateProgress(80);

        return uploadResult;
      });

      // Generate secure reference
      const reference = await this.generateSecureReference(result.cid);
      updateProgress(90);

      // Store in cache
      this.cacheReference(reference, result.cid);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_UPLOAD", {
        reference,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        ipfsHash: result.cid,
        isDataset: !!options.datasetMetadata,
        ...options.auditMetadata,
      });

      // Complete
      updateProgress(100);

      return {
        success: true,
        reference,
        hash: result.cid,
        url: result.url,
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

  async uploadToIPFS(content, options = {}) {
    try {
      if (this.storageType === "web3storage") {
        // Make sure client is initialized
        if (!this.client || !this.initialized) {
          throw new Error("Storage client not initialized");
        }

        // Convert content to File object for Web3Storage
        const files = [];
        const fileType = options.mimeType || "application/json";
        const fileName = options.fileName || `file-${Date.now()}.json`;

        if (typeof content === "object") {
          content = JSON.stringify(content);
        }

        const file = new File([content], fileName, { type: fileType });
        files.push(file);

        // Use client instead of storageClient for consistency
        const cid = await this.client.put(files, {
          name: options.name || fileName,
          wrapWithDirectory: false,
        });

        return {
          cid,
          url: `${process.env.IPFS_GATEWAY || "https://dweb.link/ipfs/"}${cid}/${fileName}`,
        };
      } else {
        throw new Error("No IPFS provider configured");
      }
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw error;
    }
  }

  async storeFiles(files) {
    if (!this.initialized || !this.client) {
      throw new Error("Storage service not initialized");
    }

    try {
      console.log(`Uploading ${files.length} file(s) to Web3Storage...`);

      // Use put method which accepts File objects directly
      const cid = await this.client.put(files, {
        name: `upload-${Date.now()}`,
        wrapWithDirectory: false,
      });

      console.log(`✅ Files uploaded successfully with CID: ${cid}`);
      return cid.toString();
    } catch (error) {
      console.error("❌ Error storing files:", error);
      throw error;
    }
  }

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

  cleanReferenceCache() {
    const now = Date.now();
    for (const [reference, data] of this.referenceCache.entries()) {
      if (now - data.timestamp > this.cacheTimeout) {
        this.referenceCache.delete(reference);
      }
    }
  }

  async uploadViaApi(file, options = {}) {
    try {
      options.onProgress?.(10);

      const formData = new FormData();
      formData.append("file", file);

      if (options.auditMetadata) {
        formData.append("metadata", JSON.stringify(options.auditMetadata));
      }

      if (options.datasetMetadata) {
        formData.append(
          "datasetMetadata",
          JSON.stringify(options.datasetMetadata)
        );
      }

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

  async downloadFile(reference, options = {}) {
    try {
      if (this.useApiFallback) {
        return this.downloadViaApi(reference, options);
      }

      await this.verifyAccess(reference, options.accessToken);

      const ipfsHash = await this.resolveReference(reference);

      let lastProgress = 0;
      const updateProgress = (progress) => {
        if (progress > lastProgress) {
          lastProgress = progress;
          options.onProgress?.(progress);
        }
      };

      updateProgress(10);

      const encryptedPackage = await this.fetchFromIPFS(
        ipfsHash,
        updateProgress
      );

      updateProgress(60);

      const content = await hipaaCompliance.decrypt(encryptedPackage.content);

      const metadata = JSON.parse(
        await hipaaCompliance.decrypt(encryptedPackage.metadata)
      );

      updateProgress(80);

      await this.verifyIntegrity(content, metadata.checksums);

      updateProgress(90);

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

  async downloadViaApi(reference, options = {}) {
    try {
      options.onProgress?.(10);

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

  async deleteFile(reference, options = {}) {
    try {
      if (this.useApiFallback) {
        return this.deleteViaApi(reference, options);
      }

      await this.verifyAccess(reference, options.accessToken);

      const ipfsHash = await this.resolveReference(reference);

      await this.ipfs.pin.rm(ipfsHash);

      this.referenceCache.delete(reference);

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

  async deleteViaApi(reference, options = {}) {
    try {
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

  async resolveReference(reference) {
    try {
      if (this.referenceCache.has(reference)) {
        const cachedData = this.referenceCache.get(reference);
        if (Date.now() - cachedData.timestamp < this.cacheTimeout) {
          return cachedData.ipfsHash;
        } else {
          this.referenceCache.delete(reference);
        }
      }

      const response = await apiService.get(`api/storage/resolve/${reference}`);

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

  async getDataset(id, requestedBy, metadata = {}) {
    try {
      const response = await apiService.get(`api/datasets/${id}`, {
        requestedBy,
        timestamp: new Date().toISOString(),
        dataType: "dataset",
        ...metadata,
      });

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

      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_INITIATED", {
        datasetId: id,
        requestedBy: options.requestedBy,
        purpose: options.purpose || "unknown",
        timestamp: new Date(),
      });

      const result = await this.downloadFile(id, {
        ...options,
        auditMetadata: {
          ...options.auditMetadata,
          dataType: "dataset",
          purpose: options.purpose || "download",
        },
      });

      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_COMPLETED", {
        datasetId: id,
        requestedBy: options.requestedBy,
        fileSize: result.content.length,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
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
    if (!datasetMetadata.description) {
      throw new SecureStorageError(
        "Dataset description is required",
        "INVALID_DATASET_METADATA"
      );
    }

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

    const enhancedMetadata = {
      ...datasetMetadata,
      dataType: "dataset",
      uploadedAt: new Date().toISOString(),
      version: datasetMetadata.version || "1.0",
    };

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
