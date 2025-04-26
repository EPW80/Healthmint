// src/hooks/useAuth.js
import { useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { setRole } from "../redux/slices/roleSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import authService from "../services/authService.js";
import { isLogoutInProgress } from "../utils/authLoopPrevention.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

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

  const clearVerificationCache = useCallback(() => {
    verificationCacheRef.current = null;

    if (verificationCacheTimeoutRef.current) {
      clearTimeout(verificationCacheTimeoutRef.current);
      verificationCacheTimeoutRef.current = null;
    }
  }, []);

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
      if (typeof authService.verifyAuth === "function") {
        const result = await authService.verifyAuth();
        // Check if result is null or undefined
        if (!result) {
          throw new Error(
            "Authentication verification failed: no result returned from authService"
          );
        }
        // Now safe to access result properties
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
      }

      // Fallback implementation if function doesn't exist (shouldn't happen after our patch)
      console.warn("Using fallback auth verification in useAuth hook");

      const walletAddress = localStorage.getItem("healthmint_wallet_address");
      const isWalletConnected =
        localStorage.getItem("healthmint_wallet_connection") === "true";

      if (!walletAddress || !isWalletConnected) {
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        clearVerificationCache();

        setLoading(false);
        isVerifyingRef.current = false;

        return null;
      }

      const userData = authService.getCurrentUser
        ? authService.getCurrentUser()
        : null;

      if (!userData) {
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        clearVerificationCache();

        setLoading(false);
        isVerifyingRef.current = false;

        return null;
      }

      const storedRole = localStorage.getItem("healthmint_user_role");
      const isUserNew =
        localStorage.getItem("healthmint_is_new_user") === "true";

      // Update state based on the verification
      setIsAuthenticated(true);
      setIsNewUser(isUserNew);
      setIsRegistrationComplete(!isUserNew);

      const result = {
        ...userData,
        isAuthenticated: true,
        isNewUser: isUserNew,
        isRegistrationComplete: !isUserNew,
        role: storedRole || null,
        userProfile: userData,
      };

      // Cache the result
      verificationCacheRef.current = result;

      if (verificationCacheTimeoutRef.current) {
        clearTimeout(verificationCacheTimeoutRef.current);
      }

      verificationCacheTimeoutRef.current = setTimeout(() => {
        verificationCacheRef.current = null;
      }, 5000);

      // Log verification
      await hipaaComplianceService.createAuditLog(
        "AUTH_VERIFICATION_FALLBACK",
        {
          timestamp: new Date().toISOString(),
          result: "AUTHENTICATED",
          isNewUser: isUserNew,
          walletAddress,
        }
      );

      // Update Redux if needed
      dispatch(updateUserProfile(userData));
      if (storedRole) {
        dispatch(setRole(storedRole));
      }

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
  }, [dispatch, clearVerificationCache]);

  const login = async (walletAddress) => {
    try {
      setLoading(true);
      console.log("Login attempt with wallet:", walletAddress);
      
      // Make sure address is properly formatted with 0x prefix
      const formattedAddress = walletAddress.startsWith('0x') 
        ? walletAddress 
        : `0x${walletAddress}`;
      
      const response = await fetch('/api/auth/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: formattedAddress }),
      });
      
      const data = await response.json();
      console.log("Auth API response:", data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Authentication request failed');
      }
      
      if (data.token) {
        localStorage.setItem('healthmint_auth_token', data.token);
      }
      
      return data;
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

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

  const register = useCallback(
    async (userData) => {
      if (!userData || !userData.address) {
        setError("User data and wallet address are required for registration");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Call authentication service to register the user
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
