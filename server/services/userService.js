// server/services/userService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import { createError } from "../errors/index.js";

class ServerUserService {
  async getUserStats(metadata = {}) {
    try {
      // GET /users/stats - Fetch user statistics
      const stats = await apiService.get("/users/stats", metadata);

      // Log the access for HIPAA compliance
      await hipaaComplianceService.createAuditLog("USER_STATS_ACCESS", {
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return stats;
    } catch (error) {
      throw createError.api(
        "USER_STATS_ERROR",
        "Failed to retrieve user statistics",
        {
          context: "User Statistics",
          originalError: error.message,
        }
      );
    }
  }
  // ... other methods for interacting with the user service
  async getUserHealthRecords(options = {}) {
    try {
      // GET /users/health-records - Fetch health records with optional filters
      const records = await apiService.get("/users/health-records", options);

      // Log the access for HIPAA compliance
      await hipaaComplianceService.createAuditLog("ACCESS_HEALTH_RECORDS", {
        timestamp: new Date().toISOString(),
        filters: options,
      });

      return records;
    } catch (error) {
      throw createError.api(
        "HEALTH_RECORDS_ERROR",
        "Failed to retrieve health records",
        {
          context: "Health Records",
          originalError: error.message,
        }
      );
    }
  }

  async getUserByAddress(address, metadata = {}) {
    try {
      if (!address) {
        throw new Error("Address is required");
      }

      // GET /users/{address} - Fetch user by address
      const userData = await apiService.get(
        `/users/${address.toLowerCase()}`,
        metadata
      );

      // Log the profile view for HIPAA compliance
      await hipaaComplianceService.createAuditLog("VIEW_USER_PROFILE", {
        viewedAddress: address.toLowerCase(),
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return userData;
    } catch (error) {
      throw createError.api(
        "USER_FETCH_ERROR",
        "Failed to retrieve user profile",
        {
          context: "User Profile",
          originalError: error.message,
        }
      );
    }
  }

  async registerUser(userData) {
    try {
      if (!userData || !userData.address) {
        throw new Error("User data with address is required");
      }

      // POST /users - Register a new user
      const response = await apiService.post("/users", userData);

      // Log the registration for HIPAA compliance
      await hipaaComplianceService.createAuditLog("USER_REGISTERED", {
        address: userData.address.toLowerCase(),
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      throw createError.api(
        "USER_REGISTRATION_ERROR",
        "Failed to register user",
        {
          context: "User Registration",
          originalError: error.message,
        }
      );
    }
  }

  async updateProfile(profileData) {
    try {
      if (!profileData || !profileData.address) {
        throw new Error("Profile data with address is required");
      }

      // PUT /users/{address} - Update user profile by address
      const response = await apiService.put(
        `/users/${profileData.address.toLowerCase()}`,
        profileData
      );

      // Log the update for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATED", {
        address: profileData.address.toLowerCase(),
        timestamp: new Date().toISOString(),
        updatedFields: Object.keys(profileData),
      });

      return response;
    } catch (error) {
      throw createError.api(
        "PROFILE_UPDATE_ERROR",
        "Failed to update profile",
        {
          context: "Profile Update",
          originalError: error.message,
        }
      );
    }
  }
}

export const userService = new ServerUserService();
export default userService;
