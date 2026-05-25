// src/services/authService.js
import hipaaComplianceService from "./hipaaComplianceService.js";
import { ENV } from "../config/environmentConfig.js";
import { STORAGE_KEYS, userProfileKey } from "../config/storageKeys.js";
import logger from "../utils/logger.js";

class AuthService {
  constructor() {
    this.API_URL = ENV.API_URL || "/api";
    this.tokenKey = STORAGE_KEYS.AUTH_TOKEN;
    this.refreshTokenKey = STORAGE_KEYS.REFRESH_TOKEN;
    this.tokenExpiryKey = STORAGE_KEYS.TOKEN_EXPIRY;
    this.userProfileKey = STORAGE_KEYS.USER_PROFILE;
    this.walletAddressKey = STORAGE_KEYS.WALLET_ADDRESS;
    this.isNewUserKey = STORAGE_KEYS.IS_NEW_USER;

    this.apiBaseUrl = process.env.REACT_APP_API_URL || "/api";
    this.mockMode =
      process.env.NODE_ENV !== "production" || !process.env.REACT_APP_API_URL;

    // Add mock users for testing
    if (this.mockMode) {
      this.mockUsers = {
        "0x123...": {
          address: "0x123...",
          role: "patient",
          name: "Test Patient",
        },
        // Add more mock users as needed
      };
    }

    // Load auth state from localStorage on init
    this.loadAuthState();
  }

  loadAuthState() {
    // Tokens are intentionally NOT loaded from localStorage — they live in
    // memory only and are cleared on page reload. See SECURITY.md.
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Parse user profile if it exists
    const userProfileStr = localStorage.getItem(this.userProfileKey);
    this.userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;

    // Get wallet address
    this.walletAddress = localStorage.getItem(this.walletAddressKey);

    // Determine if user is new based on localStorage flag
    this._isNewUser = localStorage.getItem(this.isNewUserKey) === "true";
  }

  async verifyAuth() {
    const buildResult = () => ({
      isAuthenticated: this.isAuthenticated(),
      isNewUser: this._isNewUser,
      isRegistrationComplete: this.isRegistrationComplete(),
      userProfile: this.userProfile,
    });

    if (this.mockMode) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return buildResult();
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Auth verification failed: ${response.status}`
        );
      }

      const data = await response.json();
      // Normalise server response to the shape useAuth expects
      return {
        isAuthenticated: data.isAuthenticated ?? data.authenticated ?? true,
        isNewUser: data.isNewUser ?? this._isNewUser,
        isRegistrationComplete:
          data.isRegistrationComplete ?? this.isRegistrationComplete(),
        userProfile: data.userProfile ?? data.user ?? this.userProfile,
      };
    } catch (error) {
      logger.error("Auth verification error:", error);
      return buildResult();
    }
  }

  async ensureValidToken() {
    try {
      if (!this.token) {
        logger.warn("[AuthService] No token found, attempting to recover");
        // Attempt to recover using stored wallet address
        const walletAddress = localStorage.getItem(this.walletAddressKey);
        if (walletAddress) {
          const loginResult = await this.login({ address: walletAddress });
          if (!loginResult.success) {
            throw new Error("Token recovery failed: " + loginResult.error);
          }
        } else {
          throw new Error("No authentication token or wallet address found");
        }
      }

      // Check token expiry
      const expiryDate = this.tokenExpiry ? new Date(this.tokenExpiry) : null;
      const now = new Date();

      if (expiryDate && expiryDate <= now) {
        logger.info("[AuthService] Token expired, refreshing...");
        await this.refreshAccessToken();
      }

      // Log token validation for HIPAA compliance
      await hipaaComplianceService.createAuditLog("TOKEN_VALIDATION", {
        action: "VALIDATE_TOKEN",
        walletAddress: this.walletAddress,
        timestamp: now.toISOString(),
      });

      return this.token;
    } catch (error) {
      logger.error("[AuthService] Token validation error:", error);
      await hipaaComplianceService.createAuditLog("TOKEN_VALIDATION_FAILURE", {
        action: "VALIDATE_TOKEN",
        walletAddress: this.walletAddress,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
      });
      throw new Error("Invalid or expired token: " + error.message);
    }
  }

  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error("No refresh token available");
      }

      // Simulate token refresh (replace with actual API call)
      const response = await this.performTokenRefresh(this.refreshToken);

      // Update auth state with new tokens
      this.updateAuthState({
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
        userProfile: this.userProfile, // Preserve existing profile
        isNewUser: this._isNewUser,
      });

      logger.info("[AuthService] Token refreshed successfully");
    } catch (error) {
      logger.error("[AuthService] Token refresh error:", error);
      throw new Error("Failed to refresh token: " + error.message);
    }
  }

  async performTokenRefresh(refreshToken) {
    // For demo purposes, simulate a refresh
    return {
      token: `refreshed_token_${Date.now()}`,
      refreshToken: `refreshed_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  }

  isAuthenticated() {
    if (!this.token) return false;

    if (this.tokenExpiry) {
      const expiryDate = new Date(this.tokenExpiry);
      if (expiryDate <= new Date()) {
        return false; // Token expired, rely on ensureValidToken to refresh
      }
    }

    return true;
  }

  isNewUser() {
    return this._isNewUser === true;
  }

  // Check if registration is complete
  isRegistrationComplete() {
    return this.userProfile !== null && !this._isNewUser;
  }

  // Retrieve current user data
  updateAuthState(authData) {
    const { token, refreshToken, expiresAt, userProfile, isNewUser } = authData;

    // Keep tokens in memory only — never persisted to localStorage.
    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiry = expiresAt;
    this.userProfile = userProfile;
    this._isNewUser = isNewUser === true;

    if (userProfile)
      localStorage.setItem(this.userProfileKey, JSON.stringify(userProfile));
    localStorage.setItem(this.isNewUserKey, String(this._isNewUser));
  }

  async login(credentials = {}) {
    try {
      const walletAddress = credentials.address || this.walletAddress;

      if (!walletAddress) {
        throw new Error("Wallet address is required for authentication");
      }

      this.walletAddress = walletAddress;
      localStorage.setItem(this.walletAddressKey, walletAddress);

      await hipaaComplianceService.createAuditLog("AUTH_ATTEMPT", {
        action: "LOGIN",
        walletAddress,
        timestamp: new Date().toISOString(),
      });

      if (this.isAuthenticated() && this.userProfile) {
        return {
          success: true,
          isNewUser: this.isNewUser(),
          isRegistrationComplete: this.isRegistrationComplete(),
          userProfile: this.userProfile,
        };
      }

      const authResult = await this.performApiLogin(walletAddress);

      this.updateAuthState({
        token: authResult.token,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt,
        userProfile: authResult.userProfile,
        isNewUser: authResult.isNewUser,
      });

      await hipaaComplianceService.createAuditLog("AUTH_SUCCESS", {
        action: "LOGIN",
        walletAddress,
        timestamp: new Date().toISOString(),
        isNewUser: authResult.isNewUser,
      });

      return {
        success: true,
        isNewUser: authResult.isNewUser,
        isRegistrationComplete: authResult.userProfile !== null,
        userProfile: authResult.userProfile,
      };
    } catch (error) {
      logger.error("[AuthService] Login error:", error);
      await hipaaComplianceService.createAuditLog("AUTH_FAILURE", {
        action: "LOGIN",
        walletAddress: credentials.address || this.walletAddress,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
      });
      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }
  }

  async performApiLogin(walletAddress) {
    try {
      // Simulate API login for demo
      return {
        token: `demo_token_${Date.now()}`,
        refreshToken: `demo_refresh_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        userProfile: await this.getUserByWallet(walletAddress),
        isNewUser: false,
      };
    } catch (error) {
      logger.error("[AuthService] API login error:", error);
      throw new Error("Login failed. Please try again.");
    }
  }

  async getUserByWallet(walletAddress) {
    try {
      const profileStr = localStorage.getItem(this.userProfileKey);
      const storedProfile = profileStr ? JSON.parse(profileStr) : null;

      if (storedProfile && storedProfile.address === walletAddress) {
        return storedProfile;
      }

      const savedUserKey = userProfileKey(walletAddress);
      const savedUser = localStorage.getItem(savedUserKey);

      if (savedUser) {
        return JSON.parse(savedUser);
      }

      this._isNewUser = true;
      localStorage.setItem(this.isNewUserKey, "true");
      return null;
    } catch (error) {
      logger.error("[AuthService] Error getting user by wallet:", error);
      return null;
    }
  }

  async logout() {
    try {
      await hipaaComplianceService.createAuditLog("AUTH_LOGOUT", {
        action: "LOGOUT",
        walletAddress: this.walletAddress,
        timestamp: new Date().toISOString(),
      });

      // Clear all auth-related localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      localStorage.removeItem(this.userProfileKey);
      localStorage.removeItem(this.isNewUserKey);
      localStorage.removeItem(this.walletAddressKey);

      // IMPORTANT: Also clear role to prevent going to role selection screen
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);

      // Reset all state variables
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      this.userProfile = null;
      this._isNewUser = false;
      this.walletAddress = null;

      return true;
    } catch (error) {
      logger.error("[AuthService] Logout error:", error);
      return false;
    }
  }

  async register(userData) {
    try {
      if (!userData || !userData.address) {
        throw new Error("Wallet address is required for registration");
      }

      await hipaaComplianceService.createAuditLog("REGISTRATION_ATTEMPT", {
        action: "REGISTER",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      const savedUserKey = userProfileKey(userData.address);
      localStorage.setItem(savedUserKey, JSON.stringify(userData));

      this.userProfile = userData;
      localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

      this._isNewUser = false;
      localStorage.setItem(this.isNewUserKey, "false");

      await hipaaComplianceService.createAuditLog("REGISTRATION_SUCCESS", {
        action: "REGISTER",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error("[AuthService] Registration error:", error);
      await hipaaComplianceService.createAuditLog("REGISTRATION_FAILURE", {
        action: "REGISTER",
        walletAddress: userData?.address || this.walletAddress,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
      });
      return false;
    }
  }

  completeRegistration(userData) {
    this.userProfile = userData;
    localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

    this._isNewUser = false;
    localStorage.setItem(this.isNewUserKey, "false");

    hipaaComplianceService
      .createAuditLog("REGISTRATION_COMPLETED", {
        action: "COMPLETE_REGISTRATION",
        walletAddress: userData.address || this.walletAddress,
        timestamp: new Date().toISOString(),
      })
      .catch((err) =>
        console.error(
          "[AuthService] Error logging registration completion:",
          err
        )
      );
  }

  async updateProfile(userData) {
    try {
      if (!userData || !userData.address) {
        throw new Error("Wallet address is required for profile update");
      }

      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        action: "UPDATE_PROFILE",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      const savedUserKey = userProfileKey(userData.address);
      localStorage.setItem(savedUserKey, JSON.stringify(userData));

      this.userProfile = userData;
      localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

      return userData;
    } catch (error) {
      logger.error("[AuthService] Profile update error:", error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.userProfile;
  }

  // Check if user is new
  clearVerificationCache() {
    logger.info("[AuthService] Verification cache cleared");
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
