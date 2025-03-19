// src/services/userService.js
import apiService from "../services/apiService.js";
import authService from "../services/authService.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import errorHandlingService from "../services/errorHandlingService.js";
import secureStorageService from "../services/secureStorageService.js";
class UserService {
  constructor() {
    this.userProfileKey = "healthmint_user_profile";
    this.userSettingsKey = "healthmint_user_settings";
    this.userConsentKey = "healthmint_user_consent";
    // Define base API path
    this.basePath = "/api/users";
  }

  async getCurrentUser() {
    try {
      await authService.ensureValidToken();
      const response = await apiService.get(`${this.basePath}/profile`);

      if (response && response.data) {
        localStorage.setItem(
          this.userProfileKey,
          JSON.stringify(response.data)
        );
      }
      return response.data;
    } catch (error) {
      const cachedProfile = localStorage.getItem(this.userProfileKey);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      throw errorHandlingService.handleError(error, {
        code: "USER_PROFILE_ERROR",
        context: "User Profile",
        userVisible: false,
      });
    }
  }

  async getUserByAddress(address, metadata = {}) {
    try {
      if (!address) throw new Error("Address is required");

      const normalizedAddress = address.toLowerCase();
      const response = await apiService.get(
        `${this.basePath}/${normalizedAddress}`,
        metadata
      );

      await hipaaComplianceService.createAuditLog("VIEW_USER_PROFILE", {
        viewedAddress: normalizedAddress,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "USER_FETCH_ERROR",
        context: "User Profile",
        userVisible: true,
      });
    }
  }

  async registerUser(userData) {
    try {
      if (!userData.address) throw new Error("Wallet address is required");
      if (!userData.name) throw new Error("Name is required");
      if (!userData.role) throw new Error("Role is required");

      const normalizedData = {
        ...userData,
        address: userData.address.toLowerCase(),
      };

      const response = await apiService.post(
        `${this.basePath}/register`,
        normalizedData
      );

      await hipaaComplianceService.createAuditLog("USER_REGISTRATION", {
        address: normalizedData.address,
        role: normalizedData.role,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "USER_REGISTRATION_ERROR",
        context: "User Registration",
        userVisible: true,
      });
    }
  }

  async updateProfile(profileData) {
    try {
      await authService.ensureValidToken();
      const sanitizedData = hipaaComplianceService.sanitizeData(profileData, {
        excludeFields: ["profileImageHash", "walletType", "password"],
      });

      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        userId: sanitizedData.address || "unknown",
        action: "UPDATE",
        details: { fields: Object.keys(sanitizedData) },
      });

      const response = await apiService.put(
        `${this.basePath}/profile`,
        sanitizedData
      );
      localStorage.setItem(this.userProfileKey, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "PROFILE_UPDATE_ERROR",
        context: "User Profile",
        userVisible: true,
      });
    }
  }

  async updateProfileImage(imageFile, onProgress = () => {}) {
    try {
      if (!imageFile) throw new Error("No image file provided");
      await authService.ensureValidToken();

      const result = await secureStorageService.uploadProfileImage(imageFile, {
        onProgress,
      });
      if (!result || !result.reference)
        throw new Error("Failed to upload image");

      const currentProfile = await this.getCurrentUser();
      const updatedProfile = await this.updateProfile({
        ...currentProfile,
        profileImage: result.url,
        profileImageHash: result.reference,
      });
      return updatedProfile;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "PROFILE_IMAGE_ERROR",
        context: "Profile Image",
        userVisible: true,
      });
    }
  }

  async removeProfileImage() {
    try {
      await authService.ensureValidToken();
      const currentProfile = await this.getCurrentUser();

      if (!currentProfile.profileImageHash) return currentProfile;

      await secureStorageService.deleteProfileImage(
        currentProfile.profileImageHash
      );
      const updatedProfile = await this.updateProfile({
        ...currentProfile,
        profileImage: null,
        profileImageHash: null,
      });
      return updatedProfile;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "PROFILE_IMAGE_REMOVE_ERROR",
        context: "Profile Image",
        userVisible: true,
      });
    }
  }

  async updateRole(role, address = null) {
    try {
      if (!role) throw new Error("Role is required");
      await authService.ensureValidToken();

      const userAddress = address || (await this.getCurrentUser())?.address;
      if (!userAddress) throw new Error("User address is required");

      const response = await apiService.post(`${this.basePath}/role`, {
        role,
        address: userAddress,
      });

      await hipaaComplianceService.createAuditLog("ROLE_UPDATE", {
        address: userAddress,
        role,
        timestamp: new Date().toISOString(),
      });

      if (!address) {
        const cachedProfile = localStorage.getItem(this.userProfileKey);
        if (cachedProfile) {
          const profile = JSON.parse(cachedProfile);
          profile.role = role;
          localStorage.setItem(this.userProfileKey, JSON.stringify(profile));
        }
      }
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "ROLE_UPDATE_ERROR",
        context: "User Role Management",
        userVisible: true,
      });
    }
  }

  async getUserStats() {
    try {
      await authService.ensureValidToken();
      const response = await apiService.get(`${this.basePath}/stats`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
      return {
        totalUploads: 0,
        totalPurchases: 0,
        earnings: "0",
        storageUsed: "0",
      };
    }
  }

  async getUserHealthRecords(options = {}) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.get(
        `${this.basePath}/records`,
        options
      );

      await hipaaComplianceService.createAuditLog("ACCESS_HEALTH_RECORDS", {
        timestamp: new Date().toISOString(),
        filters: options,
      });
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "HEALTH_RECORDS_ERROR",
        context: "Health Records",
        userVisible: true,
      });
    }
  }

  async getAuditLog(options = {}) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.get(`${this.basePath}/audit`, options);

      await hipaaComplianceService.createAuditLog("VIEW_AUDIT_LOG", {
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "AUDIT_LOG_ERROR",
        context: "Audit Log",
        userVisible: true,
      });
    }
  }

  async updateNotificationSettings(settings) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.put(
        `${this.basePath}/settings/notifications`,
        settings
      );
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "NOTIFICATION_SETTINGS_ERROR",
        context: "Notification Settings",
        userVisible: true,
      });
    }
  }

  async updatePrivacySettings(settings) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.put(
        `${this.basePath}/settings/privacy`,
        settings
      );
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "PRIVACY_SETTINGS_ERROR",
        context: "Privacy Settings",
        userVisible: true,
      });
    }
  }

  async updateConsent(consentType, granted, details = {}) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.post(`${this.basePath}/consent`, {
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        ...details,
      });

      await hipaaComplianceService.createAuditLog(
        granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
        {
          consentType,
          timestamp: new Date().toISOString(),
          details,
        }
      );

      try {
        const consents = JSON.parse(
          localStorage.getItem(this.userConsentKey) || "{}"
        );
        consents[consentType] = {
          granted,
          timestamp: new Date().toISOString(),
          details,
        };
        localStorage.setItem(this.userConsentKey, JSON.stringify(consents));
      } catch (e) {
        console.error("Failed to update local consent:", e);
      }
      return response;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "CONSENT_UPDATE_ERROR",
        context: "User Consent",
        userVisible: true,
      });
    }
  }

  async updateResearcherCredentials(credentials) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.put(
        `${this.basePath}/researcher/credentials`,
        credentials
      );
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "RESEARCHER_CREDENTIALS_ERROR",
        context: "Researcher Credentials",
        userVisible: true,
      });
    }
  }

  async updatePublications(publications) {
    try {
      await authService.ensureValidToken();
      const response = await apiService.put(
        `${this.basePath}/researcher/publications`,
        { publications }
      );
      return response.data;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "PUBLICATIONS_UPDATE_ERROR",
        context: "Researcher Publications",
        userVisible: true,
      });
    }
  }

  async deleteAccount(options = {}) {
    try {
      await authService.ensureValidToken();
      await apiService.delete(`${this.basePath}/account`, { data: options });

      localStorage.removeItem(this.userProfileKey);
      localStorage.removeItem(this.userSettingsKey);
      localStorage.removeItem(this.userConsentKey);

      await hipaaComplianceService.createAuditLog("ACCOUNT_DELETION", {
        timestamp: new Date().toISOString(),
        reason: options.reason || "User requested account deletion",
      });
      await authService.logout();
      return true;
    } catch (error) {
      throw errorHandlingService.handleError(error, {
        code: "ACCOUNT_DELETION_ERROR",
        context: "User Account",
        userVisible: true,
      });
    }
  }

  isProfileComplete() {
    try {
      const profileData = localStorage.getItem(this.userProfileKey);
      if (!profileData) return false;

      const profile = JSON.parse(profileData);
      const requiredFields = ["name", "role"];
      const patientFields = [...requiredFields];
      const researcherFields = [
        ...requiredFields,
        "institution",
        "credentials",
      ];
      const fieldsToCheck =
        profile.role === "researcher" ? researcherFields : patientFields;

      return fieldsToCheck.every((field) => !!profile[field]);
    } catch (error) {
      console.error("Error checking profile completion:", error);
      return false;
    }
  }

  clearProfile() {
    localStorage.removeItem(this.userProfileKey);
    localStorage.removeItem(this.userSettingsKey);
    localStorage.removeItem(this.userConsentKey);
  }
}

const userService = new UserService();
export default userService;
