// server/services/userService.js
import apiService from "./apiService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import errorHandlingService from "./errorHandlingService.js";

class ServerUserService {
  /**
   * Get user statistics from the server
   * @param {Object} metadata - Additional metadata for the request (e.g., filters, userId)
   * @returns {Promise<Object>} User statistics
   */
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
      throw errorHandlingService.handleError(error, {
        code: "USER_STATS_ERROR",
        context: "User Statistics",
        userVisible: true,
      });
    }
  }

  /**
   * Get user's health records from the server
   * @param {Object} options - Query options (e.g., filters, pagination)
   * @returns {Promise<Array>} User's health records
   */
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
      throw errorHandlingService.handleError(error, {
        code: "HEALTH_RECORDS_ERROR",
        context: "Health Records",
        userVisible: true,
      });
    }
  }

  /**
   * Get user data by wallet address
   * @param {string} address - User's wallet address
   * @param {Object} metadata - Additional metadata for the request
   * @returns {Promise<Object>} User data
   */
  async getUserByAddress(address, metadata = {}) {
    try {
      if (!address) {
        throw new Error("Address is required");
      }

      // GET /users/{address} - Fetch user by address
      const userData = await apiService.get(`/users/${address.toLowerCase()}`, metadata);

      // Log the profile view for HIPAA compliance
      await hipaaComplianceService.createAuditLog("VIEW_USER_PROFILE", {
        viewedAddress: address.toLowerCase(),
        timestamp: new Date().toISOString(),
        ...metadata,
      });

      return userData;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "USER_FETCH_ERROR",
        context: "User Profile",
        userVisible: true,
      });
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User data to register (e.g., address, name, role)
   * @returns {Promise<Object>} Registration result
   */
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
      throw errorHandlingService.handleError(error, {
        code: "USER_REGISTRATION_ERROR",
        context: "User Registration",
        userVisible: true,
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update (e.g., address, name, email)
   * @returns {Promise<Object>} Update result
   */
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
      throw errorHandlingService.handleError(error, {
        code: "PROFILE_UPDATE_ERROR",
        context: "Profile Update",
        userVisible: true,
      });
    }
  }
}

export const userService = new ServerUserService();
export default userService;