import FileDocument from "../models/FileDocument.js";
import secureStorageService from "./secureStorageService.js";
import mongoose from "mongoose";
import hipaaCompliance from "../services/hipaaComplianceService.js";
import crypto from "crypto";

/**
 * Hybrid Storage Service
 * Integrates Web3Storage (IPFS) with MongoDB metadata storage
 */
class StorageIntegrationService {
  async uploadFile(file, userId, metadata = {}) {
    try {
      console.log(
        `Processing upload for user ${userId}: ${file.originalname} (${file.size} bytes)`
      );

      // Calculate file extension
      const extension = file.originalname.split(".").pop().toLowerCase();

      // Generate checksum of file for integrity verification
      const checksum = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      // 1. First create a processing placeholder in MongoDB
      const fileDoc = new FileDocument({
        fileName: file.originalname,
        description: metadata.description || "",
        mimeType: file.mimetype,
        fileSize: file.size,
        extension,
        owner: new mongoose.Types.ObjectId(userId),
        category: metadata.category || "General Health",
        tags: metadata.tags || [],
        containsPHI: metadata.containsPHI !== false, // Default to true for HIPAA compliance
        status: "processing",
        sensitivity: metadata.sensitivity || "medium",
        isPublic: metadata.isPublic === true,
        checksum: {
          algorithm: "sha256",
          value: checksum,
        },
        dataTypes: metadata.dataTypes || ["other"],
      });

      // Add optional fields from metadata
      if (metadata.price) fileDoc.price = parseFloat(metadata.price);
      if (metadata.dataset) fileDoc.dataset = metadata.dataset;
      if (metadata.accessPassphrase)
        fileDoc.accessPassphrase = metadata.accessPassphrase;

      // Save initial record before upload (helps with tracking)
      await fileDoc.save();

      // 2. Log the upload attempt for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_UPLOAD_ATTEMPT", {
        userId,
        fileId: fileDoc._id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        category: metadata.category,
      });

      // 3. Upload to Web3Storage
      const uploadResult = await secureStorageService.uploadToIPFS(file);

      if (!uploadResult || !uploadResult.cid) {
        throw new Error("Failed to upload to IPFS: No CID returned");
      }

      // 4. Update MongoDB record with IPFS details
      fileDoc.cid = uploadResult.cid;
      fileDoc.ipfsUrl =
        uploadResult.url || `https://dweb.link/ipfs/${uploadResult.cid}`;
      fileDoc.status = "available";

      await fileDoc.save();

      // 5. Log successful upload for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_UPLOAD_SUCCESS", {
        userId,
        fileId: fileDoc._id,
        fileName: file.originalname,
        cid: uploadResult.cid,
        category: metadata.category,
      });

      return {
        success: true,
        fileId: fileDoc._id,
        cid: uploadResult.cid,
        fileName: file.originalname,
        url: fileDoc.ipfsUrl,
        metadata: {
          fileSize: file.size,
          mimeType: file.mimetype,
          category: fileDoc.category,
          containsPHI: fileDoc.containsPHI,
        },
      };
    } catch (error) {
      console.error("Storage integration error:", error);

      // Log upload failure
      await hipaaCompliance.createAuditLog("FILE_UPLOAD_FAILED", {
        userId,
        fileName: file?.originalname,
        error: error.message,
      });

      throw error;
    }
  }

  async getFile(fileId, userId, options = {}) {
    try {
      // Find file in MongoDB
      const fileDoc = await FileDocument.findById(fileId);

      if (!fileDoc) {
        throw new Error("File not found");
      }

      // Check access permissions
      const hasAccess =
        fileDoc.isPublic ||
        fileDoc.owner.equals(userId) ||
        fileDoc.authorizedUsers.some((id) => id.equals(userId));

      if (!hasAccess && !options.adminOverride) {
        throw new Error(
          "Access denied: You do not have permission to access this file"
        );
      }

      // Validate passphrase if provided and required
      if (fileDoc.accessPassphrase && options.passphrase) {
        const isValidPassphrase = await fileDoc.validatePassphrase(
          options.passphrase
        );
        if (!isValidPassphrase) {
          throw new Error("Invalid access passphrase");
        }
      }

      // Log metadata access for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_METADATA_ACCESSED", {
        userId,
        fileId: fileDoc._id,
        cid: fileDoc.cid,
      });

      // If content not requested, just return metadata
      if (!options.includeContent) {
        return {
          fileId: fileDoc._id,
          fileName: fileDoc.fileName,
          description: fileDoc.description,
          cid: fileDoc.cid,
          url: fileDoc.ipfsUrl,
          mimeType: fileDoc.mimeType,
          fileSize: fileDoc.fileSize,
          category: fileDoc.category,
          tags: fileDoc.tags,
          createdAt: fileDoc.createdAt,
          updatedAt: fileDoc.updatedAt,
          isPublic: fileDoc.isPublic,
          price: fileDoc.price,
          registeredOnChain: fileDoc.registeredOnChain,
          transactionHash: fileDoc.transactionHash,
          status: fileDoc.status,
          containsPHI: fileDoc.containsPHI,
        };
      }

      // If content requested, fetch from Web3Storage
      const content = await secureStorageService.fetchFromIPFS(fileDoc.cid);

      // Log content access for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_CONTENT_ACCESSED", {
        userId,
        fileId: fileDoc._id,
        cid: fileDoc.cid,
      });

      return {
        metadata: {
          fileId: fileDoc._id,
          fileName: fileDoc.fileName,
          description: fileDoc.description,
          cid: fileDoc.cid,
          url: fileDoc.ipfsUrl,
          mimeType: fileDoc.mimeType,
          fileSize: fileDoc.fileSize,
          category: fileDoc.category,
          containsPHI: fileDoc.containsPHI,
          status: fileDoc.status,
        },
        content,
      };
    } catch (error) {
      console.error("Error retrieving file:", error);

      // Log access failure for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_ACCESS_FAILED", {
        userId,
        fileId,
        error: error.message,
      });

      throw error;
    }
  }

  // List files with optional filters
  async listFiles(userId, options = {}) {
    try {
      const query = options.includePublic
        ? { $or: [{ owner: userId }, { isPublic: true }] }
        : { owner: userId };

      // Only show non-deleted files by default
      if (options.includeDeleted !== true) {
        query.isDeleted = false;
      }

      // Add category filter if specified
      if (options.category) {
        query.category = options.category;
      }

      // Add search query if specified
      if (options.search) {
        query.$text = { $search: options.search };
      }

      // Add blockchain filter if specified
      if (options.onChain === true) {
        query.registeredOnChain = true;
      }

      // Pagination
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 20;
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = options.sortField || "createdAt";
      const sortDirection = options.sortDirection === "asc" ? 1 : -1;
      const sort = { [sortField]: sortDirection };

      // Execute query
      const files = await FileDocument.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-__v");

      // Get total count for pagination
      const total = await FileDocument.countDocuments(query);

      // Log list request for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILES_LISTED", {
        userId,
        count: files.length,
        filters: JSON.stringify(query),
      });

      return {
        files,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  }

  // Update blockchain status
  async updateBlockchainStatus(fileId, transactionHash, blockchainData = {}) {
    try {
      const updateData = {
        registeredOnChain: true,
        transactionHash,
      };

      if (blockchainData.blockNumber) {
        updateData.blockNumber = blockchainData.blockNumber;
      }

      if (blockchainData.smartContractAddress) {
        updateData.smartContractAddress = blockchainData.smartContractAddress;
      }

      const updated = await FileDocument.findByIdAndUpdate(fileId, updateData, {
        new: true,
      });

      if (!updated) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Log blockchain registration for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_BLOCKCHAIN_REGISTERED", {
        fileId,
        transactionHash,
        userId: updated.owner,
      });

      return updated;
    } catch (error) {
      console.error("Error updating blockchain status:", error);
      throw error;
    }
  }

  // Delete a file (soft delete)
  async deleteFile(fileId, userId) {
    try {
      // Find the file first to check ownership
      const fileDoc = await FileDocument.findById(fileId);

      if (!fileDoc) {
        throw new Error("File not found");
      }

      // Check if user is allowed to delete
      if (!fileDoc.owner.equals(userId)) {
        throw new Error("Access denied: You do not own this file");
      }

      // Use the soft delete method from our model
      const result = await FileDocument.softDelete(fileId, userId);

      return {
        success: true,
        message: "File deleted successfully",
        fileId,
      };
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  // Update file metadata
  async updateFile(fileId, userId, updates) {
    try {
      // Find the file first to check ownership
      const fileDoc = await FileDocument.findById(fileId);

      if (!fileDoc) {
        throw new Error("File not found");
      }

      // Check if user is allowed to update
      if (!fileDoc.owner.equals(userId)) {
        throw new Error("Access denied: You do not own this file");
      }

      // Fields that can be updated
      const allowedUpdates = [
        "fileName",
        "description",
        "category",
        "tags",
        "isPublic",
        "price",
        "authorizedUsers",
        "authorizedRoles",
        "sensitivity",
        "dataTypes",
      ];

      // Filter out any fields that aren't allowed
      const filteredUpdates = Object.keys(updates)
        .filter((key) => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      // Apply updates
      const updated = await FileDocument.findByIdAndUpdate(
        fileId,
        filteredUpdates,
        { new: true, runValidators: true }
      );

      // Log update for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_UPDATED", {
        userId,
        fileId,
        updatedFields: Object.keys(filteredUpdates),
      });

      return updated;
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  }

  // Share file with other users
  async shareFile(fileId, ownerId, userIds) {
    try {
      // Find the file first to check ownership
      const fileDoc = await FileDocument.findById(fileId);

      if (!fileDoc) {
        throw new Error("File not found");
      }

      // Check if user is allowed to share
      if (!fileDoc.owner.equals(ownerId)) {
        throw new Error("Access denied: You do not own this file");
      }

      // Convert single ID to array if needed
      const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

      // Add users to authorizedUsers array (avoid duplicates)
      const updated = await FileDocument.findByIdAndUpdate(
        fileId,
        { $addToSet: { authorizedUsers: { $each: userIdArray } } },
        { new: true }
      );

      // Log share action for HIPAA compliance
      await hipaaCompliance.createAuditLog("FILE_SHARED", {
        ownerId,
        fileId,
        sharedWith: userIdArray,
      });

      return updated;
    } catch (error) {
      console.error("Error sharing file:", error);
      throw error;
    }
  }
}

const storageIntegrationService = new StorageIntegrationService();
export default storageIntegrationService;
