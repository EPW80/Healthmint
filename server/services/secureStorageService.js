// src/services/secureStorageService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import errorHandlingService from "./errorHandlingService.js";
import { STORAGE_CONFIG } from "../config/storageConfig.js";
import localStorageService from "./localStorageService.js";
import { createAuthenticatedClient } from "./web3StorageHelper.js";

// Import encryptionService conditionally to avoid breaking the app if it doesn't exist
let encryptionService = null;
try {
  encryptionService = require("./encryptionService.js").default;
} catch (e) {
  console.warn(
    "Encryption service not available. Using fallback security measures."
  );
}

// Custom error class for storage-related errors
class SecureStorageError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "SecureStorageError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecureStorageError);
    }
  }
}

// SecureStorageService class
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
        "text/csv",
        "application/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

    // Reference cache for resolved references
    this.referenceCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.storageType = STORAGE_CONFIG?.IPFS_PROVIDER || "web3storage";
    this.initialized = false;
    this.client = null;
    this.useApiFallback = false;
    this.storageService = null;

    // Initialize service
    this.initService();

    // AUTO-INITIALIZE: Add this code to auto-initialize when service is created
    (async () => {
      try {
        console.log("🚀 Auto-initializing storage service...");
        await this.initialize();
        console.log("✅ Storage service auto-initialization complete");
      } catch (error) {
        console.error("❌ Failed to auto-initialize storage service:", error);
      }
    })();
  }

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

  async initialize() {
    try {
      console.log("Storage initialization:");
      console.log("- IPFS_PROVIDER:", process.env.IPFS_PROVIDER);
      console.log(
        "- WEB3_STORAGE_TOKEN:",
        process.env.WEB3_STORAGE_TOKEN ? "Present" : "Missing"
      );

      // Always initialize local storage as a fallback
      await localStorageService.initialize();

      if (process.env.IPFS_PROVIDER === "web3storage") {
        try {
          // Try Web3Storage
          this.client = await createAuthenticatedClient();
          this.initialized = true;
          console.log("✅ Using Web3Storage for file storage");
          return this;
        } catch (error) {
          console.error("Web3Storage initialization failed:", error.message);
          console.warn("Falling back to local storage mode");
          this.storageService = localStorageService;
          this.initialized = true;
          return this;
        }
      } else {
        // Use local storage explicitly
        console.log("✅ Using local storage for file storage");
        this.storageService = localStorageService;
        this.initialized = true;
        return this;
      }
    } catch (error) {
      console.error("❌ Failed to initialize storage service:", error);
      throw error;
    }
  }

  validateFile(file, options = {}) {
    // Required file
    if (!file) {
      throw new Error("No file provided");
    }

    // File size validation
    const maxSize = options.maxFileSize || this.config.maxFileSize;
    if (file.size > maxSize) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB) exceeds maximum allowed size of ${(
          maxSize /
          (1024 * 1024)
        ).toFixed(2)}MB`
      );
    }

    // File type validation
    const allowedTypes =
      options.allowedMimeTypes || this.config.allowedMimeTypes;
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `File type "${file.type}" is not allowed. Supported types: ${allowedTypes.join(
          ", "
        )}`
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
          `File extension ".${fileExt}" is not allowed. Supported extensions: ${options.allowedExtensions.join(
            ", "
          )}`
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

  async uploadToIPFS(file) {
    try {
      // Convert to File object if needed
      const fileObject = new File([file.buffer], file.originalname, { type: file.mimetype });
      
      // Use put() method with the file array
      const cid = await this.client.put([fileObject], { wrapWithDirectory: false });
      
      return {
        success: true,
        cid: cid,
        fileName: file.originalname,
        url: `https://dweb.link/ipfs/${cid}`
      };
    } catch (error) {
      console.error("Failed to upload to IPFS:", error);
      throw error;
    }
  }

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
        clientInfo:
          typeof navigator !== "undefined" ? navigator.userAgent : "node",
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

  async uploadFile(file, options = {}) {
    console.log(
      `Uploading file: ${file.originalname}, size: ${file.size} bytes`
    );

    if (!this.initialized) {
      throw new Error("Storage service not initialized");
    }

    if (this.storageService) {
      console.log("Using local storage service for upload");
      return await this.storageService.storeFile(file);
    } else if (this.client) {
      console.log("Using Web3Storage for upload");
      return await this.uploadToIPFS(file);
    } else {
      // Should never reach here if initialization is done properly
      console.warn("Storage service not initialized, using mock response");
      return {
        success: true,
        cid: `mock-${Date.now().toString(16).slice(-10)}`,
        fileName: file.originalname,
        url: `https://dweb.link/ipfs/mock-${Date.now().toString(16).slice(-10)}`,
      };
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
        url: response.url,
        metadata: response.metadata,
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
        clientInfo:
          typeof navigator !== "undefined" ? navigator.userAgent : "node",
        deleteReason: options.reason || "User requested deletion",
        ...options.auditMetadata,
      };

      // Log the deletion attempt with comprehensive details
      await hipaaComplianceService.createAuditLog("FILE_DELETE", {
        reference,
        timestamp: new Date().toISOString(),
        ...auditMetadata,
      });

      // For Web3Storage, we can't delete directly, so just use the API
      // API will handle marking the file as deleted in the database
      const response = await apiService.delete(
        `${this.config.endpoints.delete}/${reference}`,
        {
          data: auditMetadata,
        }
      );

      // Clear from cache if it exists
      if (this.referenceCache.has(reference)) {
        this.referenceCache.delete(reference);
      }

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

  async downloadFile(reference, options = {}) {
    try {
      if (!reference) {
        throw new Error("Storage reference is required");
      }

      // Always use API for downloads since it handles permissions/access control
      return this.downloadViaApi(reference, options);
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

  async downloadViaApi(reference, options = {}) {
    try {
      // Create audit metadata for HIPAA compliance
      const auditMetadata = {
        downloadType: options.downloadType || "FILE_DOWNLOAD",
        userId: options.userIdentifier || "anonymous",
        timestamp: new Date().toISOString(),
        action: "DOWNLOAD",
        ipAddress: "client", // Will be replaced by server
        downloadReason: options.reason || "User requested download",
        ...auditMetadata,
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

      options.onProgress?.(10);

      const response = await apiService.downloadFile(
        `${this.config.endpoints.download}/${reference}`,
        options.onProgress,
        auditMetadata
      );

      options.onProgress?.(90);

      // Log successful download
      await hipaaComplianceService.createAuditLog("FILE_DOWNLOAD_SUCCESS", {
        reference,
        timestamp: new Date().toISOString(),
        userId: options.userIdentifier,
      });

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

  async fetchFromIPFS(hash, progressCallback) {
    try {
      // Make sure client is initialized
      if (!this.client || !this.initialized) {
        throw new Error("Storage client not initialized");
      }

      // Use Web3Storage to retrieve the content
      progressCallback?.(40);

      // Get the data from Web3Storage - use the HTTP gateway pattern
      const gateway = process.env.IPFS_GATEWAY || "https://dweb.link/ipfs/";
      const url = `${gateway}${hash}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
      }

      progressCallback?.(50);

      // Try to parse as JSON, but handle binary data too
      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // For binary data, return as ArrayBuffer
        data = await response.arrayBuffer();
      }

      progressCallback?.(60);

      return data;
    } catch (error) {
      console.error("Error fetching from IPFS:", error);
      throw new SecureStorageError(
        "Failed to retrieve data from storage",
        "IPFS_RETRIEVAL_FAILED",
        { originalError: error.message }
      );
    }
  }

  async validateIPFSConnection() {
    try {
      if (!this.initialized || !this.client) {
        return false;
      }

      // Create a test file
      const testFile = new File(["test"], "test.txt", { type: "text/plain" });
      
      // Use put() instead of uploadFile() - put() expects an array of files
      await this.client.put([testFile]);
      
      console.log("✅ Web3Storage connection validated");
      return true;
    } catch (error) {
      console.error("❌ IPFS validation failed:", error);
      return false;
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

  // Generate a secure reference
  async generateReference(cid) {
    const isBrowser = typeof window !== "undefined";

    if (isBrowser) {
      // Browser implementation using crypto.subtle
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(cid.toString() + Date.now());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return hashHex;
      } catch (error) {
        console.warn(
          "Failed to use crypto.subtle, using fallback method:",
          error
        );
        return this.generateSimpleReference(cid);
      }
    } else {
      // Node.js implementation
      try {
        const crypto = require("crypto");
        const hash = crypto.createHash("sha256");
        hash.update(cid.toString() + Date.now());
        return hash.digest("hex");
      } catch (error) {
        console.warn(
          "Failed to generate reference with crypto, using fallback:",
          error
        );
        return this.generateSimpleReference(cid);
      }
    }
  }

  // Fallback reference generator
  generateSimpleReference(cid) {
    const str = `${cid}:${Date.now()}:${Math.random()}`;
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  // HIPAA compliance check for PHI
  checkForPHI(text) {
    return hipaaComplianceService.containsPHI(text);
  }

  // Sanitize filename to prevent path traversal and control characters
  sanitizeFileName(filename) {
    if (!filename) return "unnamed-file";

    // Remove path traversal and control characters
    return filename
      .replace(/\.\.\//g, "")
      .replace(/\.\.\\/g, "")
      .replace(/[^\w\s.-]/g, "_")
      .trim();
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  // Dataset handling methods
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

  async getDataset(id, requestedBy, metadata = {}) {
    try {
      const response = await apiService.get(`api/datasets/${id}`, {
        requestedBy,
        timestamp: new Date().toISOString(),
        dataType: "dataset",
        ...metadata,
      });

      await hipaaComplianceService.createAuditLog("DATASET_ACCESS", {
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
}

const secureStorageService = new SecureStorageService();
export default secureStorageService;
export { SecureStorageError };
