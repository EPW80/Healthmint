// src/services/profileService.js
import User from "../models/User.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { AUDIT_TYPES } from "../constants/index.js";
import validation from "../validation/index.js";

export class ProfileServiceError extends Error {
  constructor(message, code = "PROFILE_SERVICE_ERROR", details = {}) {
    super(message);
    this.name = "ProfileServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const profileService = {
  // Update profile image with enhanced security
  async updateProfileImage(address, imageHash, requestDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Validate image hash
      if (!this.isValidImageHash(imageHash)) {
        throw new ProfileServiceError(
          "Invalid image hash format",
          "INVALID_HASH"
        );
      }

      // Update with session and metadata
      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        {
          $set: {
            profileImageHash: imageHash,
            "metadata.lastModified": new Date(),
            "metadata.lastModifiedBy": requestDetails?.requestedBy || address,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!user) {
        throw new ProfileServiceError("User not found", "USER_NOT_FOUND");
      }

      // Add audit log
      await user.auditLog(AUDIT_TYPES.UPDATE_PROFILE_IMAGE, address, {
        ipAddress: requestDetails?.ipAddress,
        userAgent: requestDetails?.userAgent,
        timestamp: new Date(),
        previousHash: user.profileImageHash,
        newHash: imageHash,
      });

      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating profile image:", {
        error,
        address,
        timestamp: new Date(),
        requestDetails,
      });
      throw new ProfileServiceError(
        "Failed to update profile image",
        error.code || "UPDATE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Update profile with enhanced validation and security
  async updateProfile(address, updateData, requestDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Validate address
      if (!validation.validateAddress(address).isValid) {
        throw new ProfileServiceError(
          "Invalid wallet address",
          "INVALID_ADDRESS"
        );
      }

      // Remove sensitive or non-updatable fields
      const {
        _id,
        createdAt,
        address: userAddress,
        role,
        statistics,
        security,
        ...safeUpdateData
      } = updateData;

      // Validate update data
      const validatedData = await this.validateUpdateData(safeUpdateData);

      // Encrypt sensitive fields
      const encryptedData = await this.encryptSensitiveFields(validatedData);

      // Update with session and metadata
      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        {
          $set: {
            ...encryptedData,
            "metadata.lastModified": new Date(),
            "metadata.lastModifiedBy": requestDetails?.requestedBy || address,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!user) {
        throw new ProfileServiceError("User not found", "USER_NOT_FOUND");
      }

      // Add audit log
      await user.addAuditLog(AUDIT_TYPES.UPDATE_PROFILE, address, {
        ipAddress: requestDetails?.ipAddress,
        userAgent: requestDetails?.userAgent,
        timestamp: new Date(),
        fields: Object.keys(safeUpdateData),
      });

      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating profile:", {
        error,
        address,
        timestamp: new Date(),
        requestDetails,
      });
      throw new ProfileServiceError(
        "Failed to update profile",
        error.code || "UPDATE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Get profile statistics with enhanced security
  async getProfileStats(address, requestDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Validate address
      if (!validation.validateAddress(address).isValid) {
        throw new ProfileServiceError(
          "Invalid wallet address",
          "INVALID_ADDRESS"
        );
      }

      // Get user with session
      const user = await User.findOne({
        address: address.toLowerCase(),
      }).session(session);

      if (!user) {
        throw new ProfileServiceError("User not found", "USER_NOT_FOUND");
      }

      // Get enhanced statistics
      const enhancedStats = await this.calculateEnhancedStats(user);

      // Add audit log
      await user.addAuditLog(
        AUDIT_TYPES.VIEW_STATS,
        requestDetails?.requestedBy || address,
        {
          ipAddress: requestDetails?.ipAddress,
          userAgent: requestDetails?.userAgent,
          timestamp: new Date(),
        }
      );

      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(enhancedStats);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error getting profile stats:", {
        error,
        address,
        timestamp: new Date(),
        requestDetails,
      });
      throw new ProfileServiceError(
        "Failed to get profile statistics",
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Get audit log with filtering and pagination
  async getAuditLog(address, requestDetails, options = {}) {
    try {
      // Validate address
      if (!validation.validateAddress(address).isValid) {
        throw new ProfileServiceError(
          "Invalid wallet address",
          "INVALID_ADDRESS"
        );
      }

      const user = await User.findOne({ address: address.toLowerCase() });
      if (!user) {
        throw new ProfileServiceError("User not found", "USER_NOT_FOUND");
      }

      // Get filtered audit logs
      const auditLogs = await user.getFilteredAuditLogs(options);

      // Add audit log for this request
      await user.addAuditLog(
        AUDIT_TYPES.VIEW_AUDIT_LOG,
        requestDetails?.requestedBy || address,
        {
          ipAddress: requestDetails?.ipAddress,
          userAgent: requestDetails?.userAgent,
          timestamp: new Date(),
        }
      );

      return await hipaaCompliance.sanitizeAuditLog(auditLogs);
    } catch (error) {
      console.error("Error getting audit log:", {
        error,
        address,
        timestamp: new Date(),
        requestDetails,
      });
      throw new ProfileServiceError(
        "Failed to get audit log",
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    }
  },

  // Delete profile with enhanced security
  async deleteProfile(address, requestDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Validate address
      if (!validation.validateAddress(address).isValid) {
        throw new ProfileServiceError(
          "Invalid wallet address",
          "INVALID_ADDRESS"
        );
      }

      const user = await User.findOne({
        address: address.toLowerCase(),
      }).session(session);

      if (!user) {
        throw new ProfileServiceError("User not found", "USER_NOT_FOUND");
      }

      // Archive user data before deletion
      await this.archiveUserData(user, requestDetails);

      // Add final audit log
      await user.addAuditLog(
        AUDIT_TYPES.DELETE_PROFILE,
        requestDetails?.requestedBy || address,
        {
          ipAddress: requestDetails?.ipAddress,
          userAgent: requestDetails?.userAgent,
          timestamp: new Date(),
          reason: requestDetails?.reason,
        }
      );

      // Delete user
      await user.remove({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: "Profile deleted successfully",
        timestamp: new Date(),
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error deleting profile:", {
        error,
        address,
        timestamp: new Date(),
        requestDetails,
      });
      throw new ProfileServiceError(
        "Failed to delete profile",
        error.code || "DELETE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Utility methods
  async validateUpdateData(data) {
    // Implement validation logic
    return data;
  },

  async encryptSensitiveFields(data) {
    // Implement encryption logic using hipaaCompliance
    return data;
  },

  isValidImageHash(hash) {
    // Implement hash validation
    return true;
  },

  async calculateEnhancedStats(user) {
    // Calculate enhanced statistics
    const baseStats = {
      totalUploads: user.statistics?.totalUploads || 0,
      totalPurchases: user.statistics?.totalPurchases || 0,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    // Add additional statistics as needed
    return {
      ...baseStats,
      // Add more stats here
    };
  },

  async archiveUserData(user, requestDetails) {
    // Implement data archiving logic
    return true;
  },
};

export { profileService };
export default profileService;
