// src/services/authService.js
/**
 * Authentication Service with enhanced registration status tracking
 */
class AuthenticationService {
  constructor() {
    this.tokenKey = "healthmint_auth_token";
    this.refreshTokenKey = "healthmint_refresh_token";
    this.userKey = "healthmint_user";
    this.tokenExpiryKey = "healthmint_token_expiry";
    this.challengeKey = "healthmint_nonce";
    this.registrationStatusKey = "healthmint_registration_status";
  }

  /**
   * Retrieves the authentication token
   * @returns {string|null} The JWT token or null if not found
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Retrieves the refresh token
   * @returns {string|null} The refresh token or null if not found
   */
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * Gets the current user data from localStorage
   * @returns {Object|null} User data or null if not logged in
   */
  getCurrentUser() {
    try {
      const userData = localStorage.getItem(this.userKey);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Checks if the user is authenticated with a valid token
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    const token = this.getToken();
    const expiry = localStorage.getItem(this.tokenExpiryKey);

    if (!token || !expiry) return false;

    // Check if token is still valid
    return Date.now() < parseInt(expiry, 10);
  }

  /**
   * Checks if the user has completed registration
   * @returns {boolean} Whether registration is complete
   */
  isRegistrationComplete() {
    try {
      // First check explicit registration status flag
      const regStatus = localStorage.getItem(this.registrationStatusKey);
      if (regStatus === "complete") return true;

      // If no explicit status, check user profile
      const profileStr = localStorage.getItem(this.userKey);
      if (!profileStr) return false;

      const profile = JSON.parse(profileStr);

      // User is considered registered if they have name and role
      const isComplete = Boolean(profile && profile.name && profile.role);

      // If complete, update the status flag
      if (isComplete) {
        localStorage.setItem(this.registrationStatusKey, "complete");
      }

      return isComplete;
    } catch (e) {
      console.error("Error checking registration status:", e);
      return false;
    }
  }

  /**
   * Authenticates user with wallet signature
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateWithWallet(address) {
    try {
      // For debugging, return a mock response
      console.log("Authenticating with wallet address:", address);

      // Check if user has previously completed registration
      const regStatus = localStorage.getItem(this.registrationStatusKey);
      const isNewUser = regStatus !== "complete";

      // Create or retrieve user data
      let userData;
      const existingData = localStorage.getItem(this.userKey);

      if (existingData) {
        userData = JSON.parse(existingData);
      } else {
        userData = {
          address: address,
          role: null,
          id: "user-" + Date.now(),
        };
      }

      // Save user data to localStorage
      localStorage.setItem(this.userKey, JSON.stringify(userData));
      localStorage.setItem(this.tokenKey, "mock-token-" + Date.now());
      localStorage.setItem(
        this.tokenExpiryKey,
        (Date.now() + 3600 * 1000).toString()
      );

      // Mark registration status for new users
      if (isNewUser && !userData.role) {
        localStorage.setItem(this.registrationStatusKey, "pending");
      }

      return {
        success: true,
        user: userData,
        isNewUser: isNewUser && !userData.role,
        token: "mock-token-" + Date.now(),
      };
    } catch (error) {
      console.error("Authentication error:", error);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      throw error;
    }
  }

  /**
   * Marks user registration as complete
   * @param {Object} userData - User data with role and profile info
   */
  completeRegistration(userData) {
    if (!userData || !userData.role) {
      console.error("Cannot complete registration: missing user data or role");
      return false;
    }

    try {
      // Update user data with the new information
      localStorage.setItem(this.userKey, JSON.stringify(userData));

      // Set registration status to complete
      localStorage.setItem(this.registrationStatusKey, "complete");

      // Remove any new user flags
      localStorage.removeItem("healthmint_is_new_user");

      return true;
    } catch (error) {
      console.error("Error completing registration:", error);
      return false;
    }
  }

  /**
   * Logs out the user by clearing auth data
   * @returns {Promise<boolean>} Success status
   */
  async logout() {
    try {
      // Clear all auth data
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      localStorage.removeItem(this.challengeKey);
      // Don't clear registration status to remember registered users
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Utility method to try token refresh if needed
   * @returns {Promise<boolean>} Whether refresh was successful
   */
  async ensureValidToken() {
    return this.isAuthenticated();
  }
}

// Create singleton instance
const authService = new AuthenticationService();
// Add this debugging helper function to your authService.js file

/**
 * Debug helper to print the current auth state
 * This can be called from the browser console to diagnose issues
 */
const debugAuthState = () => {
  try {
    const walletConnected =
      localStorage.getItem("healthmint_wallet_connection") === "true";
    const walletAddress = localStorage.getItem("healthmint_wallet_address");
    const userRole = localStorage.getItem("healthmint_user_role");
    const isNewUser = localStorage.getItem("healthmint_is_new_user");
    const authToken = localStorage.getItem("healthmint_auth_token");

    const sessionBypass = {
      routeProtection: sessionStorage.getItem("bypass_route_protection"),
      roleCheck: sessionStorage.getItem("bypass_role_check"),
      authVerification: sessionStorage.getItem("auth_verification_override"),
    };

    // Get user from storage
    let userString = localStorage.getItem("healthmint_user_profile");
    let user = null;
    try {
      user = userString ? JSON.parse(userString) : null;
    } catch (e) {
      user = { error: "Invalid JSON" };
    }

    console.log("🔍 Auth State Debug:");
    console.log({
      walletConnected,
      walletAddress,
      userRole,
      isNewUser,
      hasAuthToken: !!authToken,
      user,
      sessionBypass,
    });

    return true;
  } catch (e) {
    console.error("Error in debugAuthState:", e);
    return false;
  }
};

// Export the debug function so it can be accessed
window.debugHealthmintAuth = debugAuthState;

// Add this to your authService exports
export { debugAuthState };

export default authService;
