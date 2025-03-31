// src/services/authService.js
import hipaaComplianceService from "./hipaaComplianceService.js";
import { ENV } from "../config/environmentConfig.js";

/**
 * AuthService
 *
 * Provides authentication services with HIPAA compliance for the Healthmint application.
 */
class AuthService {
  constructor() {
    this.API_URL = ENV.API_URL || "/api";
    this.tokenKey = "healthmint_auth_token";
    this.refreshTokenKey = "healthmint_refresh_token";
    this.tokenExpiryKey = "healthmint_token_expiry";
    this.userProfileKey = "healthmint_user_profile";
    this.walletAddressKey = "healthmint_wallet_address";
    this.isNewUserKey = "healthmint_is_new_user";

    // Load auth state from localStorage on init
    this.loadAuthState();
  }

  /**
   * Load the authentication state from localStorage
   * @private
   */
  loadAuthState() {
    this.token = localStorage.getItem(this.tokenKey);
    this.refreshToken = localStorage.getItem(this.refreshTokenKey);
    this.tokenExpiry = localStorage.getItem(this.tokenExpiryKey);

    // Parse user profile if it exists
    const userProfileStr = localStorage.getItem(this.userProfileKey);
    this.userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;

    // Get wallet address
    this.walletAddress = localStorage.getItem(this.walletAddressKey);

    // Determine if user is new based on localStorage flag
    this._isNewUser = localStorage.getItem(this.isNewUserKey) === "true";
  }

  /**
   * Check if the user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    // Check if token exists and is not expired
    if (!this.token) return false;

    // Check expiry if available
    if (this.tokenExpiry) {
      const expiryDate = new Date(this.tokenExpiry);
      if (expiryDate <= new Date()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if the user is a new user
   * @returns {boolean} True if user is new
   */
  isNewUser() {
    return this._isNewUser === true;
  }

  /**
   * Check if user registration is complete
   * @returns {boolean} True if registration is complete
   */
  isRegistrationComplete() {
    return this.userProfile !== null && !this._isNewUser;
  }

  /**
   * Update the authentication state
   * @param {Object} authData - Authentication data
   * @private
   */
  updateAuthState(authData) {
    const { token, refreshToken, expiresAt, userProfile, isNewUser } = authData;

    // Update memory state
    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiry = expiresAt;
    this.userProfile = userProfile;
    this._isNewUser = isNewUser === true;

    // Update localStorage
    if (token) localStorage.setItem(this.tokenKey, token);
    if (refreshToken) localStorage.setItem(this.refreshTokenKey, refreshToken);
    if (expiresAt) localStorage.setItem(this.tokenExpiryKey, expiresAt);
    if (userProfile)
      localStorage.setItem(this.userProfileKey, JSON.stringify(userProfile));
    localStorage.setItem(this.isNewUserKey, String(this._isNewUser));
  }

  /**
   * Log in with wallet address
   * @param {Object} credentials - Credentials object with wallet address
   * @returns {Promise<Object>} Authentication result
   */
  async login(credentials = {}) {
    try {
      // Extract wallet address from credentials or use stored one
      const walletAddress = credentials.address || this.walletAddress;

      if (!walletAddress) {
        throw new Error("Wallet address is required for authentication");
      }

      // Store wallet address
      this.walletAddress = walletAddress;
      localStorage.setItem(this.walletAddressKey, walletAddress);

      // Log auth attempt for HIPAA compliance
      await hipaaComplianceService.createAuditLog("AUTH_ATTEMPT", {
        action: "LOGIN",
        walletAddress,
        timestamp: new Date().toISOString(),
      });

      // Check if we need to do a full API login or can use existing auth
      if (this.isAuthenticated() && this.userProfile) {
        return {
          success: true,
          isNewUser: this.isNewUser(),
          isRegistrationComplete: this.isRegistrationComplete(),
          userProfile: this.userProfile,
        };
      }

      // Perform API login
      const authResult = await this.performApiLogin(walletAddress);

      // Update auth state with login result
      this.updateAuthState({
        token: authResult.token,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt,
        userProfile: authResult.userProfile,
        isNewUser: authResult.isNewUser,
      });

      // Log successful login for HIPAA compliance
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
      console.error("Login error:", error);

      // Log auth failure for HIPAA compliance
      hipaaComplianceService
        .createAuditLog("AUTH_FAILURE", {
          action: "LOGIN",
          walletAddress: credentials.address || this.walletAddress,
          timestamp: new Date().toISOString(),
          errorMessage: error.message,
        })
        .catch((err) => console.error("Error logging auth failure:", err));

      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }
  }

  /**
   * Perform API login with wallet address
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} Login result
   * @private
   */
  async performApiLogin(walletAddress) {
    try {
      // For demo, simulate API login success
      // In a real app, replace this with actual API call
      return {
        token: `demo_token_${Date.now()}`,
        refreshToken: `demo_refresh_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        userProfile: await this.getUserByWallet(walletAddress),
        isNewUser: false, // Will be true if user doesn't exist yet
      };

      // In a real implementation, do something like:
      // return await apiService.post("/auth/login", { walletAddress });
    } catch (error) {
      console.error("API login error:", error);
      throw new Error("Login failed. Please try again.");
    }
  }

  /**
   * Get user profile by wallet address
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object|null>} User profile or null if not found
   * @private
   */
  async getUserByWallet(walletAddress) {
    // In a real implementation, this would call the API
    // For now, check localStorage for an existing profile
    try {
      const profileStr = localStorage.getItem(this.userProfileKey);
      const storedProfile = profileStr ? JSON.parse(profileStr) : null;

      // If we have a profile with matching address, return it
      if (storedProfile && storedProfile.address === walletAddress) {
        return storedProfile;
      }

      // For demo purposes - return null to indicate new user
      // This would be replaced with an API call in a real app
      const savedUserKey = `healthmint_user_${walletAddress}`;
      const savedUser = localStorage.getItem(savedUserKey);

      if (savedUser) {
        return JSON.parse(savedUser);
      }

      // Set new user flag since we couldn't find a profile
      this._isNewUser = true;
      localStorage.setItem(this.isNewUserKey, "true");

      return null;
    } catch (error) {
      console.error("Error getting user by wallet:", error);
      return null;
    }
  }

  /**
   * Log out the current user
   * @returns {Promise<boolean>} Success or failure
   */
  async logout() {
    try {
      // Log the logout attempt for HIPAA compliance
      await hipaaComplianceService.createAuditLog("AUTH_LOGOUT", {
        action: "LOGOUT",
        walletAddress: this.walletAddress,
        timestamp: new Date().toISOString(),
      });

      // Clear localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      localStorage.removeItem(this.userProfileKey);
      localStorage.removeItem(this.isNewUserKey);

      // Clear memory state
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      this.userProfile = null;
      this._isNewUser = false;

      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @returns {Promise<boolean>} Success or failure
   */
  async register(userData) {
    try {
      if (!userData || !userData.address) {
        throw new Error("Wallet address is required for registration");
      }

      // Log registration attempt for HIPAA compliance
      await hipaaComplianceService.createAuditLog("REGISTRATION_ATTEMPT", {
        action: "REGISTER",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      // In a real app, this would be an API call
      // For now, just store in localStorage
      const savedUserKey = `healthmint_user_${userData.address}`;
      localStorage.setItem(savedUserKey, JSON.stringify(userData));

      // Update user profile
      this.userProfile = userData;
      localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

      // No longer a new user
      this._isNewUser = false;
      localStorage.setItem(this.isNewUserKey, "false");

      // Log registration success
      await hipaaComplianceService.createAuditLog("REGISTRATION_SUCCESS", {
        action: "REGISTER",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Registration error:", error);

      // Log registration failure
      hipaaComplianceService
        .createAuditLog("REGISTRATION_FAILURE", {
          action: "REGISTER",
          walletAddress: userData?.address || this.walletAddress,
          timestamp: new Date().toISOString(),
          errorMessage: error.message,
        })
        .catch((err) =>
          console.error("Error logging registration failure:", err)
        );

      return false;
    }
  }

  /**
   * Mark registration as complete
   * @param {Object} userData - User data
   */
  completeRegistration(userData) {
    // Update user profile
    this.userProfile = userData;
    localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

    // No longer a new user
    this._isNewUser = false;
    localStorage.setItem(this.isNewUserKey, "false");

    // Log registration completion
    hipaaComplianceService
      .createAuditLog("REGISTRATION_COMPLETED", {
        action: "COMPLETE_REGISTRATION",
        walletAddress: userData.address || this.walletAddress,
        timestamp: new Date().toISOString(),
      })
      .catch((err) =>
        console.error("Error logging registration completion:", err)
      );
  }

  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(userData) {
    try {
      if (!userData || !userData.address) {
        throw new Error("Wallet address is required for profile update");
      }

      // Log profile update for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        action: "UPDATE_PROFILE",
        walletAddress: userData.address,
        timestamp: new Date().toISOString(),
      });

      // In a real app, this would be an API call
      // For now, just update localStorage
      const savedUserKey = `healthmint_user_${userData.address}`;
      localStorage.setItem(savedUserKey, JSON.stringify(userData));

      // Update user profile
      this.userProfile = userData;
      localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @returns {Object|null} User profile or null if not authenticated
   */
  getCurrentUser() {
    return this.userProfile;
  }

  /**
   * Verify JWT token expiration
   * @returns {boolean} True if token is valid
   * @private
   */
  verifyToken() {
    if (!this.token) return false;

    // Check expiry if available
    if (this.tokenExpiry) {
      const expiryDate = new Date(this.tokenExpiry);
      if (expiryDate <= new Date()) {
        // Token is expired, try to refresh
        return false;
      }
    }

    return true;
  }

  /**
   * Refresh the auth token
   * @returns {Promise<boolean>} Success or failure
   * @private
   */
  async refreshAuthToken() {
    try {
      if (!this.refreshToken) return false;

      // In a real app, call API to refresh token
      // For now, just create a new demo token
      const newToken = `demo_token_${Date.now()}`;
      const newRefreshToken = `demo_refresh_${Date.now()}`;
      const newExpiry = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(); // 24 hours

      // Update auth state
      this.token = newToken;
      this.refreshToken = newRefreshToken;
      this.tokenExpiry = newExpiry;

      // Update localStorage
      localStorage.setItem(this.tokenKey, newToken);
      localStorage.setItem(this.refreshTokenKey, newRefreshToken);
      localStorage.setItem(this.tokenExpiryKey, newExpiry);

      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
