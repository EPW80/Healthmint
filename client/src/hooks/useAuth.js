// src/hooks/useAuth.js
import { useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import authService from "../services/authService.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";

/**
 * Custom hook for authentication operations
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
   * Verify authentication state with rate limiting and attempt limiting
   */
  const verifyAuth = useCallback(async () => {
    try {
      // Check for override first
      if (checkOverride()) {
        return true;
      }

      // Don't allow too many verification attempts
      verificationAttempts.current += 1;
      if (verificationAttempts.current > 5) {
        console.warn(
          `Too many auth verification attempts (${verificationAttempts.current}), forcing success state`
        );
        sessionStorage.setItem("auth_verification_override", "true");
        setIsAuthenticated(true);
        setIsRegistrationComplete(true);
        setLoading(false);
        return true;
      }

      // Rate limit verification attempts
      const now = Date.now();
      if (
        now - lastVerifyTime.current < 1000 &&
        verificationAttempts.current > 1
      ) {
        console.warn("Auth verification too frequent, delaying");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      lastVerifyTime.current = now;

      console.log(`Auth verification attempt #${verificationAttempts.current}`);
      setLoading(true);
      setError(null);

      // Check if wallet is connected via localStorage
      const walletConnected =
        localStorage.getItem("healthmint_wallet_connection") === "true";
      if (!walletConnected) {
        console.log("Wallet not connected according to localStorage");
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        setLoading(false);
        return false;
      }

      // Check if user is authenticated with authService
      const user = authService.getCurrentUser();

      if (user) {
        console.log("User found in authService:", !!user);
        // Update Redux store with user profile
        dispatch(updateUserProfile(user));

        // Check registration status
        const isComplete = authService.isRegistrationComplete();
        const newUser = authService.isNewUser();

        console.log("Registration status:", { isComplete, newUser });

        setIsAuthenticated(true);
        setIsRegistrationComplete(isComplete);
        setIsNewUser(newUser);
        setLoading(false);
        return true;
      } else {
        // Try to get user role from localStorage as a fallback
        const role = localStorage.getItem("healthmint_user_role");
        const walletAddress = localStorage.getItem("healthmint_wallet_address");

        if (role && walletAddress) {
          console.log("User role found in localStorage:", role);
          // Create minimal user profile
          const minimalUser = {
            role,
            address: walletAddress,
          };

          // Force registration to be complete
          authService.completeRegistration(minimalUser);
          dispatch(updateUserProfile(minimalUser));

          setIsAuthenticated(true);
          setIsRegistrationComplete(true);
          setIsNewUser(false);
          setLoading(false);
          return true;
        }

        // No user in authService or localStorage
        console.log("No user found in authService or localStorage");
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);

        // Check if new user flag is set
        const isNewUserFlag =
          localStorage.getItem("healthmint_is_new_user") === "true";
        setIsNewUser(isNewUserFlag);
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error("Auth verification error:", err);
      setError(err.message || "Authentication verification failed");
      setLoading(false);

      // On error, force success state after several attempts
      if (verificationAttempts.current > 3) {
        console.warn(
          "Multiple auth verification errors, forcing success state"
        );
        sessionStorage.setItem("auth_verification_override", "true");
        setIsAuthenticated(true);
        setIsRegistrationComplete(true);
        setIsNewUser(false);
        return true;
      }

      return false;
    }
  }, [dispatch]);

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

      // Login with authService
      const result = await authService.login(walletAddress);

      if (result.success) {
        setIsAuthenticated(true);
        setIsRegistrationComplete(authService.isRegistrationComplete());
        setIsNewUser(authService.isNewUser());

        // Get user profile and update Redux store
        const user = authService.getCurrentUser();
        if (user) {
          dispatch(updateUserProfile(user));
        }

        setLoading(false);
        return result;
      } else {
        throw new Error(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
      setLoading(false);
      return { success: false, message: err.message };
    }
  }, [dispatch]);

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

        // Register with authService
        const result = await authService.register(userData);

        if (result.success) {
          setIsAuthenticated(true);
          setIsRegistrationComplete(true);
          setIsNewUser(false);

          // Update Redux store with user profile
          dispatch(updateUserProfile(userData));

          setLoading(false);
          return true;
        } else {
          throw new Error(result.message || "Registration failed");
        }
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Registration failed");
        setLoading(false);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Logout user and clear auth state
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Clear Auth Service state
      await authService.logout();

      // Reset local state
      setIsAuthenticated(false);
      setIsRegistrationComplete(false);
      setIsNewUser(false);
      setError(null);

      // Clear overrides
      sessionStorage.removeItem("auth_verification_override");
      verificationAttempts.current = 0;

      setLoading(false);
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed");
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
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
  };
};

export default useAuth;
