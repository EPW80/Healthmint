// src/services/secureStorageService.js
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import { hipaaCompliance } from "../utils/hipaaCompliance";
import { ENV } from "../config/networkConfig";

class SecureStorageError extends Error {
  constructor(message, code = "STORAGE_ERROR", details = {}) {
    super(message);
    this.name = "SecureStorageError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

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

    this.ipfs = create({
      host: ENV.IPFS_HOST,
      port: ENV.IPFS_PORT,
      protocol: ENV.IPFS_PROTOCOL,
      headers: {
        authorization: `Basic ${Buffer.from(
          process.env.REACT_APP_IPFS_PROJECT_ID +
            ":" +
            process.env.REACT_APP_IPFS_PROJECT_SECRET
        ).toString("base64")}`,
      },
    });
  }

  /**
   * Validates file metadata and content
   * @param {File} file - File to validate
   * @throws {SecureStorageError}
   */
  async validateFile(file) {
    try {
      if (!file) {
        throw new SecureStorageError("No file provided", "INVALID_INPUT");
      }

      // Size validation
      if (file.size > this.MAX_FILE_SIZE) {
        throw new SecureStorageError(
          `File size exceeds maximum limit of ${
            this.MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
          "SIZE_EXCEEDED"
        );
      }

      // Type validation
      if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new SecureStorageError("File type not allowed", "INVALID_TYPE", {
          allowedTypes: this.ALLOWED_MIME_TYPES,
        });
      }

      // Malware scan
      await this.scanFile(file);

      // Content verification
      await this.verifyFileContent(file);

      return true;
    } catch (error) {
      console.error("File validation error:", error);
      throw error;
    }
  }

  /**
   * Uploads file to secure storage with encryption
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @returns {Promise<{reference: string, hash: string}>}
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file
      await this.validateFile(file);

      // Generate encryption key
      const encryptionKey = await hipaaCompliance.generateEncryptionKey();

      // Read file content
      const fileContent = await this.readFileAsBuffer(file);

      // Encrypt file content
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

      // Create secure package
      const securePackage = {
        content: encryptedContent,
        metadata: encryptedMetadata,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      // Upload to IPFS with retries
      const result = await this.retryOperation(
        () => this.ipfs.add(Buffer.from(JSON.stringify(securePackage))),
        3
      );

      // Generate secure reference
      const reference = await this.generateSecureReference(result.path);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_UPLOAD", {
        reference,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        ipfsHash: result.path,
        ...options.auditMetadata,
      });

      return {
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
   * Downloads and decrypts file from secure storage
   * @param {string} reference - Secure file reference
   * @param {Object} options - Download options
   * @returns {Promise<{content: Buffer, metadata: Object}>}
   */
  async downloadFile(reference, options = {}) {
    try {
      // Verify access permissions
      await this.verifyAccess(reference, options.accessToken);

      // Retrieve from IPFS
      const ipfsHash = await this.resolveReference(reference);
      const encryptedPackage = await this.fetchFromIPFS(ipfsHash);

      // Decrypt content and metadata
      const content = await hipaaCompliance.decrypt(encryptedPackage.content);
      const metadata = JSON.parse(
        await hipaaCompliance.decrypt(encryptedPackage.metadata)
      );

      // Verify integrity
      await this.verifyIntegrity(content, metadata.checksums);

      // Create audit log
      await hipaaCompliance.createAuditLog("FILE_DOWNLOAD", {
        reference,
        timestamp: new Date(),
        ipfsHash,
        ...options.auditMetadata,
      });

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
   * Deletes file from secure storage
   * @param {string} reference - Secure file reference
   * @param {Object} options - Delete options
   */
  async deleteFile(reference, options = {}) {
    try {
      // Verify deletion permissions
      await this.verifyAccess(reference, options.accessToken);

      // Resolve IPFS hash
      const ipfsHash = await this.resolveReference(reference);

      // Remove from IPFS
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

  // Private utility methods

  /**
   * Generates secure file reference
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
   * Resolves secure reference to IPFS hash
   * @private
   */
  async resolveReference(reference) {
    // Implementation would involve looking up reference in secure mapping
    // This is a placeholder
    return reference;
  }

  /**
   * Generates file checksums using multiple algorithms
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
   * Verifies file integrity using stored checksums
   * @private
   */
  async verifyIntegrity(content, storedChecksums) {
    const currentChecksums = await this.generateChecksums(content);

    for (const [algorithm, hash] of Object.entries(currentChecksums)) {
      if (hash !== storedChecksums[algorithm]) {
        throw new SecureStorageError(
          "File integrity check failed",
          "INTEGRITY_ERROR"
        );
      }
    }

    return true;
  }

  /**
   * Performs malware scan on file
   * @private
   */
  async scanFile(file) {
    // Integration with malware scanning service would go here
    // This is a placeholder
    return true;
  }

  /**
   * Verifies file content is valid
   * @private
   */
  async verifyFileContent(file) {
    // Content verification logic would go here
    // This is a placeholder
    return true;
  }

  /**
   * Reads file content as buffer
   * @private
   */
  async readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Retries failed operations
   * @private
   */
  async retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    throw lastError;
  }

  /**
   * Verifies access permissions
   * @private
   */
  async verifyAccess(reference, accessToken) {
    if (!accessToken) {
      throw new SecureStorageError("Access token required", "UNAUTHORIZED");
    }

    const isValid = await hipaaCompliance.verifyAccessToken(accessToken);
    if (!isValid) {
      throw new SecureStorageError("Invalid access token", "UNAUTHORIZED");
    }

    return true;
  }

  /**
   * Fetches content from IPFS
   * @private
   */
  async fetchFromIPFS(hash) {
    const chunks = [];
    for await (const chunk of this.ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  }
}

export const secureStorageService = new SecureStorageService();
