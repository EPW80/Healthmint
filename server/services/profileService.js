// profileService.js
const User = require("../models/User");

const profileService = {
  async updateProfileImage(address, imageHash) {
    try {
      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: { profileImageHash: imageHash } },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error("Error updating profile image:", error);
      throw error;
    }
  },

  async updateProfile(address, updateData) {
    try {
      // Remove sensitive or non-updatable fields
      const { _id, createdAt, ...safeUpdateData } = updateData;

      const user = await User.findOneAndUpdate(
        { address: address.toLowerCase() },
        { $set: safeUpdateData },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  async getProfileStats(address) {
    try {
      const user = await User.findOne({ address: address.toLowerCase() });
      if (!user) return null;

      return {
        totalUploads: user.totalUploads || 0,
        totalPurchases: user.totalPurchases || 0,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };
    } catch (error) {
      console.error("Error getting profile stats:", error);
      throw error;
    }
  },
};

module.exports = profileService;
