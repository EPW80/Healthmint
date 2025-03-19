// src/services/authService.js
import apiService from "../services/apiService.js";
import { ethers } from "ethers";

/**
 * Authentication Service
 *
 * Centralized service that handles all authentication-related functionality,
 * including wallet connectivity and JWT token management.
 */
class AuthenticationService {
  constructor() {
    this.tokenKey = "healthmint_auth_token";
    this.refreshTokenKey = "healthmint_refresh_token";
    this.userKey = "healthmint_user";
    this.tokenExpiryKey = "healthmint_token_expiry";
    this.challengeKey = "healthmint_nonce";
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
   * Checks if token is expired or about to expire
   * @param {number} thresholdMs - Time threshold in milliseconds
   * @returns {boolean} Whether token needs refresh
   */
  needsRefresh(thresholdMs = 5 * 60 * 1000) {
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    if (!expiry) return false;

    const expiryTime = parseInt(expiry, 10);
    return Date.now() > expiryTime - thresholdMs;
  }

  /**
   * Sets tokens and user data after successful authentication
   * @param {Object} authData - Authentication response data
   */
  setAuthData(authData) {
    const { token, refreshToken, expiresIn, user } = authData;

    const expiryTime = Date.now() + expiresIn * 1000;

    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());

    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  /**
   * Clears all authentication data
   */
  clearAuthData() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.challengeKey);
  }

  /**
   * Requests a nonce (challenge) from the server for wallet authentication
   * @param {string} address - Wallet address
   * @returns {Promise<string>} Nonce for signing
   */
  async requestAuthChallenge(address) {
    try {
      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Request challenge from server
      const response = await apiService.post("/api/auth/challenge", {
        address: normalizedAddress,
      });

      if (!response?.nonce) {
        throw new Error("Invalid challenge response from server");
      }

      // Store nonce locally for verification
      localStorage.setItem(this.challengeKey, response.nonce);

      return response.nonce;
    } catch (error) {
      console.error("Challenge request error:", error);
      throw error;
    }
  }

  /**
   * Signs a message with connected wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    if (!window.ethereum) {
      throw new Error("No wallet detected");
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error("Signing error:", error);
      throw error;
    }
  }

  /**
   * Authenticates user with wallet signature
   * @param {string} address - Wallet address
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateWithWallet(address) {
    try {
      // Request challenge from server
      const nonce = await this.requestAuthChallenge(address);

      // Create message for signing
      const message = `Sign this message to authenticate with Healthmint: ${nonce}`;

      // Get signature from wallet
      const signature = await this.signMessage(message);

      // Verify signature with server
      const authResponse = await apiService.post("/api/auth/wallet/verify", {
        address,
        signature,
        nonce,
      });

      // Set auth data in local storage
      this.setAuthData(authResponse);

      return {
        success: true,
        user: authResponse.user,
        isNewUser: authResponse.isNewUser,
        token: authResponse.token,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * Refreshes the authentication token
   * @returns {Promise<Object>} New token data
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiService.post("/api/auth/refresh", {
        refreshToken,
      });

      this.setAuthData(response);

      return {
        success: true,
        token: response.token,
        expiresIn: response.expiresIn,
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * Logs out the user by clearing auth data
   * @returns {Promise<boolean>} Success status
   */
  async logout() {
    try {
      // Attempt to notify server about logout
      const token = this.getToken();
      if (token) {
        try {
          await apiService.post("/api/auth/logout");
        } catch (error) {
          console.warn("Logout API call failed:", error);
          // Continue with logout anyway
        }
      }

      // Clear all auth data
      this.clearAuthData();

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
    if (!this.isAuthenticated()) {
      return false;
    }

    if (this.needsRefresh()) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
      }
    }

    return true;
  }
}

// Create singleton instance
const authService = new AuthenticationService();
export default authService;
