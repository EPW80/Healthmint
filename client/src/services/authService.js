// src/services/authService.js
import hipaaComplianceService from "./hipaaComplianceService.js";
import { ENV } from "../config/environmentConfig.js";

class AuthService {
  constructor() {
    this.API_URL = ENV.API_URL || "/api";
    this.tokenKey = "healthmint_auth_token";
    this.refreshTokenKey = "healthmint_refresh_token";
    this.tokenExpiryKey = "healthmint_token_expiry";
    this.userProfileKey = "healthmint_user_profile";
    this.walletAddressKey = "healthmint_wallet_address";
    this.isNewUserKey = "healthmint_is_new_user";

    this.apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
    this.mockMode = process.env.NODE_ENV !== 'production' || !process.env.REACT_APP_API_URL;

    // Add mock users for testing
    if (this.mockMode) {
      this.mockUsers = {
        '0x123...': { address: '0x123...', role: 'patient', name: 'Test Patient' },
        // Add more mock users as needed
      };
    }

    // Load auth state from localStorage on init
    this.loadAuthState();
  }

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

  async verifyAuth(token) {
    if (this.mockMode) {
      console.log('Using mock auth service in development mode');
      // Return mock authentication data
      return { authenticated: true, user: { id: '123', role: 'patient' } };
    }

    try {
      // Check if we have a wallet address in localStorage
      const walletAddress = localStorage.getItem(this.walletAddressKey);
      if (!walletAddress) {
        console.log("[AuthService] No wallet address found in localStorage");
        return null;
      }

      // Check if wallet is connected
      const isWalletConnected =
        localStorage.getItem("healthmint_wallet_connection") === "true";
      if (!isWalletConnected) {
        console.log(
          "[AuthService] Wallet not connected according to localStorage"
        );
        return null;
      }

      // Check if we have user data
      const userData = this.getCurrentUser();
      if (!userData) {
        console.log("[AuthService] No user data found");
        return null;
      }

      // Check if user is registered
      const isNewUser = localStorage.getItem(this.isNewUserKey) === "true";
      if (isNewUser) {
        console.log(
          "[AuthService] User is marked as new, registration required"
        );
        return { ...userData, isNewUser: true, isRegistrationComplete: false };
      }

      // Get user role
      const userRole = localStorage.getItem("healthmint_user_role");

      // Log auth verification for HIPAA compliance
      await hipaaComplianceService
        .createAuditLog("AUTH_VERIFICATION", {
          action: "VERIFY_AUTH",
          walletAddress,
          timestamp: new Date().toISOString(),
        })
        .catch((err) =>
          console.error("[AuthService] Error logging auth verification:", err)
        );

      // Return authenticated user data
      return {
        ...userData,
        address: walletAddress,
        isAuthenticated: true,
        isNewUser: false,
        isRegistrationComplete: true,
        role: userRole || null,
      };
    } catch (error) {
      console.error("[AuthService] Auth verification error:", error);

      // Log verification failure
      await hipaaComplianceService
        .createAuditLog("AUTH_VERIFICATION_FAILURE", {
          action: "VERIFY_AUTH",
          walletAddress: this.walletAddress,
          timestamp: new Date().toISOString(),
          errorMessage: error.message,
        })
        .catch((err) =>
          console.error("[AuthService] Error logging auth failure:", err)
        );

      return null;
    }
  }

  async ensureValidToken() {
    try {
      if (!this.token) {
        console.warn("[AuthService] No token found, attempting to recover");
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
        console.log("[AuthService] Token expired, refreshing...");
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
      console.error("[AuthService] Token validation error:", error);
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

      console.log("[AuthService] Token refreshed successfully");
    } catch (error) {
      console.error("[AuthService] Token refresh error:", error);
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

    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiry = expiresAt;
    this.userProfile = userProfile;
    this._isNewUser = isNewUser === true;

    if (token) localStorage.setItem(this.tokenKey, token);
    if (refreshToken) localStorage.setItem(this.refreshTokenKey, refreshToken);
    if (expiresAt) localStorage.setItem(this.tokenExpiryKey, expiresAt);
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
      console.error("[AuthService] Login error:", error);
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
      console.error("[AuthService] API login error:", error);
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

      const savedUserKey = `healthmint_user_${walletAddress}`;
      const savedUser = localStorage.getItem(savedUserKey);

      if (savedUser) {
        return JSON.parse(savedUser);
      }

      this._isNewUser = true;
      localStorage.setItem(this.isNewUserKey, "true");
      return null;
    } catch (error) {
      console.error("[AuthService] Error getting user by wallet:", error);
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
      localStorage.removeItem("healthmint_user_role");

      // Reset all state variables
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      this.userProfile = null;
      this._isNewUser = false;
      this.walletAddress = null;

      return true;
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
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

      const savedUserKey = `healthmint_user_${userData.address}`;
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
      console.error("[AuthService] Registration error:", error);
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

      const savedUserKey = `healthmint_user_${userData.address}`;
      localStorage.setItem(savedUserKey, JSON.stringify(userData));

      this.userProfile = userData;
      localStorage.setItem(this.userProfileKey, JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error("[AuthService] Profile update error:", error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.userProfile;
  }

  // Check if user is new
  clearVerificationCache() {
    console.log("[AuthService] Verification cache cleared");
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;
