const User = require("../models/User");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const { AUDIT_TYPES, ACCESS_LEVELS } = require("../constants");
const { validateUserData, sanitizeUserData } = require("../utils/validators");

class UserServiceError extends Error {
  constructor(message, code = "USER_SERVICE_ERROR", details = {}) {
    super(message);
    this.name = "UserServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const userService = {
  // Create user with enhanced security and HIPAA compliance
  async createUser(userData, requestDetails = {}) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Validate required fields
      if (!userData.address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      // Validate and sanitize user data
      const validationResult = await validateUserData(userData);
      if (!validationResult.isValid) {
        throw new UserServiceError(
          "Invalid user data",
          "VALIDATION_ERROR",
          validationResult.errors
        );
      }

      const sanitizedData = await sanitizeUserData({
        ...userData,
        address: userData.address.toLowerCase(),
        name: userData.name?.trim(),
        age: userData.age ? parseInt(userData.age) : undefined,
        email: userData.email?.toLowerCase().trim(),
        role: userData.role?.toLowerCase(),
      });

      // Check for existing user
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

      // Create user with metadata
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

      // Set initial access controls
      await user.grantAccess(
        user.address,
        ACCESS_LEVELS.ADMIN,
        null,
        "Owner Access",
        { initialSetup: true }
      );

      // Add creation audit log
      await user.addAuditLog(
        AUDIT_TYPES.CREATE_USER,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
        }
      );

      await user.save({ session });
      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error creating user:", {
        error,
        userData: { ...userData, address: userData.address?.slice(0, 10) },
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to create user",
        error.code || "CREATE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Get user by address with enhanced security
  async getUserByAddress(address, requestDetails = {}) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      const normalizedAddress = address.toLowerCase();
      const user = await User.findOne({ address: normalizedAddress })
        .select("+protectedInfo +accessControl")
        .session(session);

      if (!user) {
        return null;
      }

      // Add access audit log
      await user.addAuditLog(
        AUDIT_TYPES.READ_USER,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
        }
      );

      await session.commitTransaction();

      // Return sanitized response based on access level
      return await hipaaCompliance.sanitizeResponse(
        user,
        requestDetails.accessLevel || "basic"
      );
    } catch (error) {
      await session.abortTransaction();
      console.error("Error getting user:", {
        error,
        address: address?.slice(0, 10),
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to get user",
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Update user with enhanced security and validation
  async updateUser(address, updateData, requestDetails = {}) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      // Validate update data
      const validationResult = await validateUserData(updateData, "update");
      if (!validationResult.isValid) {
        throw new UserServiceError(
          "Invalid update data",
          "VALIDATION_ERROR",
          validationResult.errors
        );
      }

      // Sanitize and encrypt sensitive data
      const sanitizedUpdate = await sanitizeUserData(updateData);
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

      // Remove non-updatable fields
      delete sanitizedUpdate.address;
      delete sanitizedUpdate.createdAt;
      delete sanitizedUpdate._id;
      delete sanitizedUpdate.__v;

      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        {
          $set: {
            ...sanitizedUpdate,
            ...encryptedUpdate,
            "metadata.lastModified": new Date(),
            "metadata.lastModifiedBy": requestDetails.requestedBy || "system",
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!user) {
        throw new UserServiceError("User not found", "NOT_FOUND");
      }

      // Add update audit log
      await user.addAuditLog(
        AUDIT_TYPES.UPDATE_USER,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
          changes: Object.keys(updateData),
        }
      );

      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating user:", {
        error,
        address: address?.slice(0, 10),
        updateData,
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to update user",
        error.code || "UPDATE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Update user statistics with retry mechanism
  async updateStatistics(address, type, value = 1, requestDetails = {}) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const validTypes = ["totalUploads", "totalPurchases", "dataQualityScore"];
      if (!validTypes.includes(type)) {
        throw new UserServiceError(
          "Invalid statistics type",
          "VALIDATION_ERROR"
        );
      }

      const updateField = `statistics.${type}`;
      let retries = 3;
      let user;

      while (retries > 0) {
        try {
          user = await User.findOneAndUpdate(
            { address: address.toLowerCase() },
            {
              $inc: { [updateField]: value },
              $set: { "statistics.lastUpdated": new Date() },
            },
            { new: true, session }
          );
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!user) {
        throw new UserServiceError("User not found", "NOT_FOUND");
      }

      // Add statistics update audit log
      await user.addAuditLog(
        AUDIT_TYPES.UPDATE_STATS,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
          statisticType: type,
          value,
        }
      );

      await session.commitTransaction();

      return await hipaaCompliance.sanitizeResponse(user);
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating statistics:", {
        error,
        address,
        type,
        value,
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to update statistics",
        error.code || "UPDATE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // List users with enhanced filtering and security
  async listUsers(filters = {}, options = {}, requestDetails = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = -1,
      } = options;

      // Build secure query
      const query = this.buildSecureQuery(filters);

      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(query)
          .select("+protectedInfo")
          .sort({ [sortBy]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      // Add audit log for bulk access
      await User.addBulkAuditLog(
        AUDIT_TYPES.LIST_USERS,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
          filters,
          resultCount: users.length,
        }
      );

      return {
        users: await Promise.all(
          users.map((user) => hipaaCompliance.sanitizeResponse(user))
        ),
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.error("Error listing users:", {
        error,
        filters,
        options,
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to list users",
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    }
  },

  // Get user statistics with enhanced analytics
  async getUserStats(requestDetails = {}) {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            averageAge: { $avg: "$age" },
            totalUploads: { $sum: "$statistics.totalUploads" },
            totalPurchases: { $sum: "$statistics.totalPurchases" },
            averageQualityScore: { $avg: "$statistics.dataQualityScore" },
            activeUsers: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      "$statistics.lastActive",
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            role: "$_id",
            count: 1,
            averageAge: { $round: ["$averageAge", 1] },
            totalUploads: 1,
            totalPurchases: 1,
            averageQualityScore: { $round: ["$averageQualityScore", 1] },
            activeUsers: 1,
            activePercentage: {
              $round: [
                { $multiply: [{ $divide: ["$activeUsers", "$count"] }, 100] },
                1,
              ],
            },
          },
        },
      ]);

      // Add audit log for stats access
      await User.addBulkAuditLog(
        AUDIT_TYPES.VIEW_STATS,
        requestDetails.requestedBy || "system",
        {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          timestamp: new Date(),
        }
      );

      return await hipaaCompliance.sanitizeResponse(stats);
    } catch (error) {
      console.error("Error getting user stats:", {
        error,
        timestamp: new Date(),
      });
      throw new UserServiceError(
        error.message || "Failed to get user statistics",
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    }
  },

  // Utility methods
  buildSecureQuery(filters) {
    const query = {};

    if (filters.role) {
      query.role = filters.role.toLowerCase();
    }
    if (filters.minAge) {
      query.age = { $gte: parseInt(filters.minAge) };
    }
    if (filters.maxAge) {
      query.age = { ...query.age, $lte: parseInt(filters.maxAge) };
    }
    if (filters.active) {
      query["statistics.lastActive"] = {
        $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    return query;
  },
};

module.exports = userService;
