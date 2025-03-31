// src/hooks/useAuth.js
import { useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import authService from "../services/authService.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";

/**
 * Custom hook for authentication operations with improved loop prevention
 */
const useAuth = (options = {}) => {
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add verification attempt tracking
  const verificationAttempts = useRef(0);
  const lastVerifyTime = useRef(0);

  // Add a verification lock to prevent concurrent verifications
  const isVerifying = useRef(false);

  // Add a verification result cache to prevent redundant checks
  const verificationCache = useRef({
    timestamp: 0,
    result: null,
    ttl: 5000, // Cache TTL in milliseconds (5 seconds)
  });

  // Check for a manual override in sessionStorage
  const checkOverride = () => {
    const override = sessionStorage.getItem("auth_verification_override");
    if (override === "true") {
      console.log("Auth verification override active, skipping checks");
      setIsAuthenticated(true);
      setIsRegistrationComplete(true);
      setIsNewUser(false);
      setLoading(false);
      return true;
    }
    return false;
  };

  /**
   * Verify authentication state with rate limiting, attempt limiting, and caching
   */
  const verifyAuth = useCallback(async () => {
    if (isVerifying.current) {
      console.log("Auth verification already in progress, skipping");
      return null;
    }

    try {
      if (checkOverride()) {
        return true;
      }

      const now = Date.now();
      if (
        now - verificationCache.current.timestamp <
        verificationCache.current.ttl
      ) {
        console.log("Using cached auth verification result");
        return verificationCache.current.result;
      }

      verificationAttempts.current += 1;
      if (verificationAttempts.current > 5) {
        console.warn(
          `Too many auth verification attempts (${verificationAttempts.current}), forcing success state`
        );
        sessionStorage.setItem("auth_verification_override", "true");
        setIsAuthenticated(true);
        setIsRegistrationComplete(true);
        setLoading(false);

        verificationCache.current = {
          timestamp: now,
          result: true,
          ttl: verificationCache.current.ttl,
        };
        return true;
      }

      if (
        now - lastVerifyTime.current < 1000 &&
        verificationAttempts.current > 1
      ) {
        console.warn("Auth verification too frequent, delaying");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      lastVerifyTime.current = now;

      isVerifying.current = true;

      console.log(`Auth verification attempt #${verificationAttempts.current}`);
      setLoading(true);
      setError(null);

      const walletConnected =
        localStorage.getItem("healthmint_wallet_connection") === "true";
      if (!walletConnected) {
        console.log("Wallet not connected according to localStorage");
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        setLoading(false);

        verificationCache.current = {
          timestamp: now,
          result: false,
          ttl: verificationCache.current.ttl,
        };
        isVerifying.current = false;
        return false;
      }

      const user = authService.getCurrentUser();

      if (user) {
        console.log("User found in authService:", !!user);
        dispatch(updateUserProfile(user));

        const isComplete = authService.isRegistrationComplete();
        const newUser = authService.isNewUser();

        console.log("Registration status:", { isComplete, newUser });

        setIsAuthenticated(true);
        setIsRegistrationComplete(isComplete);
        setIsNewUser(newUser);
        setLoading(false);

        verificationCache.current = {
          timestamp: now,
          result: true,
          ttl: verificationCache.current.ttl,
        };
        isVerifying.current = false;
        return true;
      } else {
        const role = localStorage.getItem("healthmint_user_role");
        const walletAddress = localStorage.getItem("healthmint_wallet_address");

        if (role && walletAddress) {
          console.log("User role found in localStorage:", role);
          const minimalUser = { role, address: walletAddress };
          authService.completeRegistration(minimalUser);
          dispatch(updateUserProfile(minimalUser));

          setIsAuthenticated(true);
          setIsRegistrationComplete(true);
          setIsNewUser(false);
          setLoading(false);

          verificationCache.current = {
            timestamp: now,
            result: true,
            ttl: verificationCache.current.ttl,
          };
          isVerifying.current = false;
          return true;
        }

        console.log("No user found in authService or localStorage");
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);

        const isNewUserFlag =
          localStorage.getItem("healthmint_is_new_user") === "true";
        setIsNewUser(isNewUserFlag);
        setLoading(false);

        verificationCache.current = {
          timestamp: now,
          result: false,
          ttl: verificationCache.current.ttl,
        };
        isVerifying.current = false;
        return false;
      }
    } catch (err) {
      console.error("Auth verification error:", err);
      setError(err.message || "Authentication verification failed");
      setLoading(false);

      if (verificationAttempts.current > 3) {
        console.warn(
          "Multiple auth verification errors, forcing success state"
        );
        sessionStorage.setItem("auth_verification_override", "true");
        setIsAuthenticated(true);
        setIsRegistrationComplete(true);
        setIsNewUser(false);

        verificationCache.current = {
          timestamp: Date.now(),
          result: true,
          ttl: verificationCache.current.ttl,
        };
        isVerifying.current = false;
        return true;
      }

      verificationCache.current = {
        timestamp: Date.now(),
        result: false,
        ttl: verificationCache.current.ttl,
      };
      isVerifying.current = false;
      return false;
    } finally {
      isVerifying.current = false;
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Clear verification cache to force fresh verification
   */
  const clearVerificationCache = useCallback(() => {
    verificationCache.current = {
      timestamp: 0,
      result: null,
      ttl: verificationCache.current.ttl,
    };
  }, []);

  /**
   * Login user with wallet address
   */
  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const walletAddress = localStorage.getItem("healthmint_wallet_address");
      if (!walletAddress) {
        throw new Error("No wallet address found");
      }

      const result = await authService.login(walletAddress);

      if (result.success) {
        setIsAuthenticated(true);
        setIsRegistrationComplete(authService.isRegistrationComplete());
        setIsNewUser(authService.isNewUser());

        const user = authService.getCurrentUser();
        if (user) {
          dispatch(updateUserProfile(user));
        }

        clearVerificationCache();

        return result;
      } else {
        throw new Error(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [dispatch, clearVerificationCache]);

  /**
   * Register a new user
   */
  const register = useCallback(
    async (userData) => {
      try {
        setLoading(true);
        setError(null);

        if (!userData.address) {
          throw new Error("Wallet address is required for registration");
        }

        const result = await authService.register(userData);

        if (result.success) {
          setIsAuthenticated(true);
          setIsRegistrationComplete(true);
          setIsNewUser(false);

          dispatch(updateUserProfile(userData));

          clearVerificationCache();

          return true;
        } else {
          throw new Error(result.message || "Registration failed");
        }
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Registration failed");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, clearVerificationCache]
  );

  /**
   * Logout user and clear auth state
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      await authService.logout();

      setIsAuthenticated(false);
      setIsRegistrationComplete(false);
      setIsNewUser(false);
      setError(null);

      sessionStorage.removeItem("auth_verification_override");
      verificationAttempts.current = 0;

      clearVerificationCache();

      return true;
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearVerificationCache]);

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset verification attempts counter
   */
  const resetVerificationAttempts = useCallback(() => {
    verificationAttempts.current = 0;
  }, []);

  // Combine all returned values
  return {
    isAuthenticated,
    isRegistrationComplete,
    isNewUser,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    verifyAuth,
    clearVerificationCache,
    resetVerificationAttempts,
  };
};

export default useAuth;
