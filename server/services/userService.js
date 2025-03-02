import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { User } from "../models/User.js";
import {
  validateUserData,
  sanitizeUserData,
} from "../services/validationService.js";

class UserServiceError extends Error {
  constructor(message, code = "USER_SERVICE_ERROR", details = {}) {
    super(message);
    this.name = "UserServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

class UserService {
  constructor() {}

  /**
   * Creates a new user with HIPAA compliance and security validation.
   */
  async createUser(userData, requestDetails = {}) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      if (!userData.address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      // Validate & sanitize user data
      const validationResult = await validateUserData(userData);
      if (!validationResult.isValid) {
        throw new UserServiceError(
          "Invalid user data",
          "VALIDATION_ERROR",
          validationResult.errors
        );
      }

      const sanitizedData = sanitizeUserData({
        ...userData,
        address: userData.address.toLowerCase(),
        name: userData.name?.trim(),
        age: userData.age ? parseInt(userData.age) : undefined,
        email: userData.email?.toLowerCase().trim(),
        role: userData.role?.toLowerCase(),
      });

      // Check if user already exists
      const existingUser = await this.getUserByAddress(sanitizedData.address);
      if (existingUser) {
        throw new UserServiceError("User already exists", "DUPLICATE_ERROR");
      }

      // Encrypt sensitive data
      const encryptedData = {
        name: await hipaaCompliance.encrypt(sanitizedData.name),
        email: sanitizedData.email
          ? await hipaaCompliance.encrypt(sanitizedData.email)
          : undefined,
        age: await hipaaCompliance.encrypt(sanitizedData.age.toString()),
      };

      // Create user
      const user = new User({
        ...sanitizedData,
        protectedInfo: encryptedData,
        createdAt: new Date(),
        lastLogin: new Date(),
        statistics: {
          totalUploads: 0,
          totalPurchases: 0,
          dataQualityScore: 0,
          lastActive: new Date(),
        },
        security: {
          twoFactorEnabled: false,
          failedLoginAttempts: 0,
          lastPasswordChange: new Date(),
        },
        metadata: {
          createdBy: requestDetails.requestedBy || "system",
          createdAt: new Date(),
          lastModified: new Date(),
        },
      });

      await user.save({ session });
      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error creating user:", error);
      throw new UserServiceError(
        error.message || "Failed to create user",
        error.code || "CREATE_FAILED"
      );
    } finally {
      await session.endSession();
    }
  }

  /**
   * Retrieves a user by their wallet address.
   */
  async getUserByAddress(address) {
    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      const normalizedAddress = address.toLowerCase();
      const user = await User.findOne({ address: normalizedAddress }).select(
        "+protectedInfo +accessControl"
      );

      return user ? await hipaaCompliance.sanitizeResponse(user) : null;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new UserServiceError(
        error.message || "Failed to get user",
        error.code || "RETRIEVAL_FAILED"
      );
    }
  }

  /**
   * Updates user details securely.
   */
  async updateUser(address, updateData) {
    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      const validationResult = await validateUserData(updateData, "update");
      if (!validationResult.isValid) {
        throw new UserServiceError(
          "Invalid update data",
          "VALIDATION_ERROR",
          validationResult.errors
        );
      }

      const sanitizedUpdate = sanitizeUserData(updateData);
      const encryptedUpdate = {};

      if (sanitizedUpdate.name) {
        encryptedUpdate["protectedInfo.name"] = await hipaaCompliance.encrypt(
          sanitizedUpdate.name.trim()
        );
      }
      if (sanitizedUpdate.email) {
        encryptedUpdate["protectedInfo.email"] = await hipaaCompliance.encrypt(
          sanitizedUpdate.email.toLowerCase().trim()
        );
      }

      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        {
          $set: {
            ...sanitizedUpdate,
            ...encryptedUpdate,
            "metadata.lastModified": new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new UserServiceError("User not found", "NOT_FOUND");
      }

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new UserServiceError(
        error.message || "Failed to update user",
        error.code || "UPDATE_FAILED"
      );
    }
  }

  /**
   * Retrieves user statistics.
   */
  async getUserStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            totalUploads: { $sum: "$statistics.totalUploads" },
            totalPurchases: { $sum: "$statistics.totalPurchases" },
          },
        },
        {
          $project: {
            role: "$_id",
            count: 1,
            totalUploads: 1,
            totalPurchases: 1,
          },
        },
      ]);

      return await hipaaCompliance.sanitizeResponse(stats);
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      throw new UserServiceError(
        error.message || "Failed to get user statistics",
        error.code || "RETRIEVAL_FAILED"
      );
    }
  }
}

export const userService = new UserService();
