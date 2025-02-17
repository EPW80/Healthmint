// src/services/secureStorageService.js
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import crypto from "crypto"; // ✅ Fixed missing import
import hipaaCompliance from "../middleware/hipaaCompliance.js"; // ✅ Corrected import
import { ENV } from "../config/networkConfig.js";

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

    // ✅ Fixed Backend IPFS Authentication
    this.ipfs = create({
      host: ENV.IPFS_HOST,
      port: ENV.IPFS_PORT,
      protocol: ENV.IPFS_PROTOCOL,
      headers: {
        authorization: `Basic ${Buffer.from(
          process.env.IPFS_PROJECT_ID + ":" + process.env.IPFS_PROJECT_SECRET
        ).toString("base64")}`,
      },
    });
  }

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

      await this.scanFile(file);
      await this.verifyFileContent(file);

      return true;
    } catch (error) {
      console.error("File validation error:", error);
      throw error;
    }
  }

  async uploadFile(file, options = {}) {
    try {
      await this.validateFile(file);
      const encryptionKey = await hipaaCompliance.generateEncryptionKey();
      const fileContent = await this.readFileAsBuffer(file);
      const encryptedContent = await hipaaCompliance.encrypt(
        fileContent,
        encryptionKey
      );

      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        encryptionVersion: hipaaCompliance.ENCRYPTION_VERSION,
        checksums: await this.generateChecksums(fileContent),
        uploadDate: new Date().toISOString(),
      };

      const encryptedMetadata = await hipaaCompliance.encrypt(
        JSON.stringify(metadata),
        encryptionKey
      );

      const securePackage = {
        content: encryptedContent,
        metadata: encryptedMetadata,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      const result = await this.retryOperation(
        () => this.ipfs.add(Buffer.from(JSON.stringify(securePackage))),
        3
      );

      const reference = await this.generateSecureReference(result.path);

      await hipaaCompliance.createAuditLog("FILE_UPLOAD", {
        reference,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        ipfsHash: result.path,
        ...options.auditMetadata,
      });

      return { reference, hash: result.path };
    } catch (error) {
      console.error("Secure upload error:", error);
      throw new SecureStorageError(
        "Failed to upload file securely",
        "UPLOAD_FAILED",
        { originalError: error.message }
      );
    }
  }

  async downloadFile(reference, options = {}) {
    try {
      await this.verifyAccess(reference, options.accessToken);
      const ipfsHash = await this.resolveReference(reference);
      const encryptedPackage = await this.fetchFromIPFS(ipfsHash);

      const content = await hipaaCompliance.decrypt(encryptedPackage.content);
      const metadata = JSON.parse(
        await hipaaCompliance.decrypt(encryptedPackage.metadata)
      );

      await this.verifyIntegrity(content, metadata.checksums);

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

  async deleteFile(reference, options = {}) {
    try {
      await this.verifyAccess(reference, options.accessToken);
      const ipfsHash = await this.resolveReference(reference);
      await this.ipfs.pin.rm(ipfsHash);

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

  async fetchFromIPFS(hash) {
    const chunks = [];
    for await (const chunk of this.ipfs.cat(hash)) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  }
}

// ✅ Export Class & Instance
const secureStorageService = new SecureStorageService();
export { SecureStorageService, secureStorageService };
