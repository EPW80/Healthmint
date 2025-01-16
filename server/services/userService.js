const User = require("../models/User");

class UserServiceError extends Error {
  constructor(message, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "UserServiceError";
    this.code = code;
  }
}

const userService = {
  async createUser(userData) {
    try {
      if (!userData.address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      // Sanitize and validate user data
      const sanitizedData = {
        address: userData.address.toLowerCase(),
        name: userData.name?.trim(),
        age: userData.age ? parseInt(userData.age) : undefined,
        email: userData.email ? userData.email.toLowerCase().trim() : undefined,
        role: userData.role?.toLowerCase(),
        createdAt: new Date(),
        lastLogin: new Date(),
        statistics: {
          totalUploads: 0,
          totalPurchases: 0,
          dataQualityScore: 0,
        },
        settings: {
          emailNotifications: true,
          twoFactorEnabled: false,
        },
      };

      // Validate required fields
      const requiredFields = ["address", "name", "age", "role"];
      const missingFields = requiredFields.filter(
        (field) => !sanitizedData[field]
      );

      if (missingFields.length > 0) {
        throw new UserServiceError(
          `Missing required fields: ${missingFields.join(", ")}`,
          "VALIDATION_ERROR"
        );
      }

      const existingUser = await this.getUserByAddress(sanitizedData.address);
      if (existingUser) {
        throw new UserServiceError("User already exists", "DUPLICATE_ERROR");
      }

      const user = new User(sanitizedData);
      await user.save();
      return user;
    } catch (error) {
      console.error("Error creating user:", {
        error,
        userData: { ...userData, address: userData.address?.slice(0, 10) },
      });
      throw error;
    }
  },

  async getUserByAddress(address) {
    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      const normalizedAddress = address.toLowerCase();
      const user = await User.findOne({ address: normalizedAddress })
        .select("-__v")
        .lean();

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error getting user:", {
        error,
        address: address?.slice(0, 10),
      });
      throw error;
    }
  },

  async updateUser(address, updateData) {
    try {
      if (!address) {
        throw new UserServiceError("Address is required", "VALIDATION_ERROR");
      }

      // Sanitize update data
      const sanitizedUpdate = { ...updateData };
      if (updateData.email) {
        sanitizedUpdate.email = updateData.email.toLowerCase().trim();
      }
      if (updateData.name) {
        sanitizedUpdate.name = updateData.name.trim();
      }
      if (updateData.role) {
        sanitizedUpdate.role = updateData.role.toLowerCase();
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete sanitizedUpdate.address;
      delete sanitizedUpdate.createdAt;
      delete sanitizedUpdate.__v;

      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        {
          $set: sanitizedUpdate,
          $currentDate: { lastModified: true },
        },
        {
          new: true,
          runValidators: true,
          select: "-__v",
        }
      );

      if (!user) {
        throw new UserServiceError("User not found", "NOT_FOUND");
      }

      return user;
    } catch (error) {
      console.error("Error updating user:", {
        error,
        address: address?.slice(0, 10),
        updateData,
      });
      throw error;
    }
  },

  async updateStatistics(address, type, value = 1) {
    try {
      const validTypes = ["totalUploads", "totalPurchases", "dataQualityScore"];
      if (!validTypes.includes(type)) {
        throw new UserServiceError(
          "Invalid statistics type",
          "VALIDATION_ERROR"
        );
      }

      const updateField = `statistics.${type}`;
      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $inc: { [updateField]: value } },
        { new: true, select: "-__v" }
      );

      if (!user) {
        throw new UserServiceError("User not found", "NOT_FOUND");
      }

      return user;
    } catch (error) {
      console.error("Error updating statistics:", error);
      throw error;
    }
  },

  async listUsers(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = -1,
      } = options;

      const query = {};

      // Apply filters
      if (filters.role) {
        query.role = filters.role.toLowerCase();
      }
      if (filters.minAge) {
        query.age = { $gte: parseInt(filters.minAge) };
      }
      if (filters.maxAge) {
        query.age = { ...query.age, $lte: parseInt(filters.maxAge) };
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .select("-__v")
          .sort({ [sortBy]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      return {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error listing users:", error);
      throw error;
    }
  },

  async getUserStats() {
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
          },
        },
      ]);

      return stats;
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  },
};

module.exports = userService;
