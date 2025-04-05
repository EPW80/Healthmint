// src/hooks/useAuth.js
import { useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { setRole } from "../redux/slices/roleSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import authService from "../services/authService.js";
import { isLogoutInProgress } from "../utils/authLoopPrevention.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * useAuth Hook
 *
 * Manages authentication state, registration, and related operations
 * with improved logout handling
 */
const useAuth = () => {
  const dispatch = useDispatch();

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userIdentity, setUserIdentity] = useState(null);

  // Refs for verification state management
  const isVerifyingRef = useRef(false);
  const verificationCacheTimeoutRef = useRef(null);
  const verificationCacheRef = useRef(null);

  /**
   * Verify authentication status with smart caching and logout handling
   */
  const verifyAuth = useCallback(async () => {
    // Skip verification if there's a logout in progress
    if (isLogoutInProgress()) {
      console.log("Auth verification skipped due to logout in progress");
      setIsAuthenticated(false);
      setIsNewUser(false);
      setIsRegistrationComplete(false);
      return {
        isAuthenticated: false,
        isNewUser: false,
        isRegistrationComplete: false,
      };
    }

    // Return cached verification if available and recent
    if (verificationCacheRef.current) {
      return verificationCacheRef.current;
    }

    // Prevent concurrent verifications
    if (isVerifyingRef.current) {
      console.log("Auth verification already in progress");
      return null;
    }

    isVerifyingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log("Verifying authentication...");

      // Check auth status from service
      const result = await authService.verifyAuth();

      // Update state based on verification result
      setIsAuthenticated(result.isAuthenticated);
      setIsNewUser(result.isNewUser);
      setIsRegistrationComplete(result.isRegistrationComplete);

      if (result.userProfile) {
        setUserIdentity(result.userProfile);

        // Update Redux state with user profile and role
        dispatch(updateUserProfile(result.userProfile));

        if (result.userProfile.role) {
          dispatch(setRole(result.userProfile.role));
        }
      }

      // Cache the verification result briefly to prevent repeated calls
      verificationCacheRef.current = result;

      // Clear cache after a short period
      if (verificationCacheTimeoutRef.current) {
        clearTimeout(verificationCacheTimeoutRef.current);
      }

      verificationCacheTimeoutRef.current = setTimeout(() => {
        verificationCacheRef.current = null;
      }, 5000);

      // Create HIPAA-compliant audit log for auth verification
      await hipaaComplianceService.createAuditLog("AUTH_VERIFICATION", {
        timestamp: new Date().toISOString(),
        result: result.isAuthenticated ? "AUTHENTICATED" : "UNAUTHENTICATED",
        isNewUser: result.isNewUser,
        isRegistrationComplete: result.isRegistrationComplete,
      });

      setLoading(false);
      isVerifyingRef.current = false;

      return result;
    } catch (err) {
      console.error("Auth verification error:", err);
      setError(err.message || "Failed to verify authentication");

      // Create HIPAA-compliant audit log for auth verification error
      await hipaaComplianceService.createAuditLog("AUTH_VERIFICATION_ERROR", {
        timestamp: new Date().toISOString(),
        error: err.message || "Unknown error",
      });

      setLoading(false);
      isVerifyingRef.current = false;

      // Clear any cached verification on error
      verificationCacheRef.current = null;

      // Return default error state
      return {
        isAuthenticated: false,
        isNewUser: false,
        isRegistrationComplete: false,
        error: err.message || "Authentication verification failed",
      };
    }
  }, [dispatch]);

  /**
   * Clear verification cache
   */
  const clearVerificationCache = useCallback(() => {
    verificationCacheRef.current = null;

    if (verificationCacheTimeoutRef.current) {
      clearTimeout(verificationCacheTimeoutRef.current);
      verificationCacheTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle login with a wallet address
   */
  const login = useCallback(
    async (walletAddress) => {
      if (!walletAddress) {
        setError("Wallet address is required for login");
        return { success: false, message: "Wallet address is required" };
      }

      setLoading(true);
      setError(null);

      try {
        // Call authentication service to verify the wallet address
        const result = await authService.login({ address: walletAddress });

        // Update authentication state based on login result
        setIsAuthenticated(result.isAuthenticated);
        setIsNewUser(result.isNewUser);
        setIsRegistrationComplete(result.isRegistrationComplete);

        if (result.userProfile) {
          setUserIdentity(result.userProfile);

          // Update Redux state
          dispatch(updateUserProfile(result.userProfile));

          if (result.userProfile.role) {
            dispatch(setRole(result.userProfile.role));
          }
        }

        // Create HIPAA-compliant audit log for login
        await hipaaComplianceService.createAuditLog("USER_LOGIN", {
          timestamp: new Date().toISOString(),
          walletAddress,
          result: result.isAuthenticated ? "SUCCESS" : "FAILURE",
          isNewUser: result.isNewUser,
        });

        // Clear any cached verification after login
        clearVerificationCache();

        setLoading(false);
        return { ...result, success: result.isAuthenticated };
      } catch (err) {
        console.error("Login error:", err);
        setError(err.message || "Failed to log in");

        // Create HIPAA-compliant audit log for login error
        await hipaaComplianceService.createAuditLog("USER_LOGIN_ERROR", {
          timestamp: new Date().toISOString(),
          walletAddress,
          error: err.message || "Unknown error",
        });

        setLoading(false);
        return { success: false, message: err.message || "Login failed" };
      }
    },
    [dispatch, clearVerificationCache]
  );

  /**
   * Complete the registration process
   */
  const completeRegistration = useCallback(
    async (userData) => {
      if (!userData || !userData.role) {
        setError("User data and role are required for registration");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Update authentication state
        setIsAuthenticated(true);
        setIsNewUser(false);
        setIsRegistrationComplete(true);
        setUserIdentity(userData);

        // Update Redux state
        dispatch(updateUserProfile(userData));
        dispatch(setRole(userData.role));

        // Create HIPAA-compliant audit log for registration
        await hipaaComplianceService.createAuditLog("REGISTRATION_COMPLETED", {
          timestamp: new Date().toISOString(),
          role: userData.role,
          userId: userData.address || userData.id,
        });

        // Clear any cached verification after registration
        clearVerificationCache();

        setLoading(false);
        return true;
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Failed to complete registration");

        // Create HIPAA-compliant audit log for registration error
        await hipaaComplianceService.createAuditLog("REGISTRATION_ERROR", {
          timestamp: new Date().toISOString(),
          error: err.message || "Unknown error",
          userId: userData.address || userData.id,
        });

        setLoading(false);
        return false;
      }
    },
    [dispatch, clearVerificationCache]
  );

  /**
   * Register a new user
   */
  const register = useCallback(
    async (userData) => {
      if (!userData || !userData.address) {
        setError("User data and wallet address are required for registration");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Call authentication service to register user

        // Update authentication state
        setIsAuthenticated(true);
        setIsNewUser(false);
        setIsRegistrationComplete(true);
        setUserIdentity(userData);

        // Update Redux state
        dispatch(updateUserProfile(userData));

        if (userData.role) {
          dispatch(setRole(userData.role));
        }

        // Create HIPAA-compliant audit log for registration
        await hipaaComplianceService.createAuditLog("USER_REGISTERED", {
          timestamp: new Date().toISOString(),
          walletAddress: userData.address,
          role: userData.role || "unspecified",
        });

        // Clear any cached verification after registration
        clearVerificationCache();

        setLoading(false);
        return true;
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Failed to register user");

        // Create HIPAA-compliant audit log for registration error
        await hipaaComplianceService.createAuditLog("REGISTRATION_ERROR", {
          timestamp: new Date().toISOString(),
          error: err.message || "Unknown error",
          walletAddress: userData.address,
        });

        setLoading(false);
        return false;
      }
    },
    [dispatch, clearVerificationCache]
  );

  // Return the auth hook API
  return {
    isAuthenticated,
    isNewUser,
    isRegistrationComplete,
    loading,
    error,
    userIdentity,
    login,
    register,
    completeRegistration,
    verifyAuth,
    clearVerificationCache,
    clearError: () => setError(null),
  };
};

export default useAuth;
