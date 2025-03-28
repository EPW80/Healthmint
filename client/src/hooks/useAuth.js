// src/hooks/useAuth.js
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useWalletConnection from "./useWalletConnect.js";
import authService from "../services/authService";
import userService from "../services/userService";
import errorHandlingService from "../services/errorHandlingService";
import { SECURITY_CONFIG } from "../config/environmentConfig";

import {
  logoutAsync,
  refreshTokenAsync,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUserRoles,
  updateActivity,
} from "../redux/slices/authSlice";

/**
 * Enhanced authentication hook combining wallet connection and JWT auth
 * with improved error handling and environment configuration
 *
 * @param {Object} options - Hook options
 * @returns {Object} Authentication state and methods
 */
const useAuth = (options = {}) => {
  const dispatch = useDispatch();

  // Auth state from Redux
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const userRoles = useSelector(selectUserRoles);

  // Get wallet connection from wallet hook
  const {
    connectWallet,
    disconnectWallet,
    error: walletError,
    loading: walletLoading,
    isConnected: isWalletConnected,
    address: walletAddress,
  } = useWalletConnection();

  // Local state
  const [authState, setAuthState] = useState({
    status: "idle", // idle, connecting, authenticating, authenticated, error
    user: null,
    isNewUser: localStorage.getItem("healthmint_is_new_user") === "true", // Get initial new user state from localStorage
  });

  // Check localStorage for existing user profile to determine new user status
  useEffect(() => {
    try {
      const userProfile = localStorage.getItem("healthmint_user_profile");
      // Set isNewUser to true if no profile exists
      const isNewUser = !userProfile || userProfile === "{}";

      // Update state and localStorage
      setAuthState((prev) => ({
        ...prev,
        isNewUser,
      }));

      localStorage.setItem("healthmint_is_new_user", isNewUser.toString());
    } catch (error) {
      console.error("Error checking new user status:", error);
    }
  }, []);

  // Update activity periodically to keep session alive
  useEffect(() => {
    let interval;

    if (isAuthenticated) {
      // Update activity every 5 minutes
      interval = setInterval(
        () => {
          dispatch(updateActivity());
        },
        5 * 60 * 1000
      );
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, dispatch]);

  // Check auth token needs refresh
  useEffect(() => {
    const checkTokenRefresh = async () => {
      try {
        if (
          authService.needsRefresh &&
          authService.needsRefresh(SECURITY_CONFIG.REFRESH_WINDOW)
        ) {
          await dispatch(refreshTokenAsync());
        }
      } catch (error) {
        errorHandlingService.handleError(error, {
          code: "AUTH_REFRESH_ERROR",
          context: "Auth Token Refresh",
          userVisible: false, // Don't show to user automatically
        });
      }
    };

    if (isAuthenticated) {
      checkTokenRefresh();
    }
  }, [isAuthenticated, dispatch]);

  /**
   * Handles the full authentication flow:
   * 1. Connect wallet
   * 2. Sign authentication message
   * 3. Verify signature and get JWT token
   * 4. Fetch user profile if needed
   */
  const login = useCallback(async () => {
    try {
      setAuthState({
        ...authState,
        status: "connecting",
      });

      // 1. Connect wallet
      const walletResult = await connectWallet();

      if (!walletResult.success) {
        throw new Error(walletResult.error || "Failed to connect wallet");
      }

      setAuthState({
        ...authState,
        status: "authenticating",
      });

      // For mock implementation, simulate new user checking
      const existingUser = localStorage.getItem("healthmint_user_profile");
      const mockIsNewUser = !existingUser || existingUser === "{}";

      // Store new user status
      localStorage.setItem("healthmint_is_new_user", mockIsNewUser.toString());

      // 2. & 3. Auth with wallet and get token - MOCK IMPLEMENTATION
      // In a real implementation, this would use the loginAsync action
      const mockAuthResult = {
        isNewUser: mockIsNewUser,
        token: "mock-token-" + Date.now(),
        user: {
          address: walletResult.address,
          role: "",
          name: "",
        },
      };

      // Store mock token
      localStorage.setItem(authService.tokenKey, mockAuthResult.token);
      localStorage.setItem(
        authService.userKey,
        JSON.stringify(mockAuthResult.user)
      );
      localStorage.setItem(
        authService.tokenExpiryKey,
        (Date.now() + 3600 * 1000).toString()
      );

      // 4. Set auth state based on new user status
      if (mockAuthResult.isNewUser) {
        setAuthState({
          status: "authenticated",
          isNewUser: true,
          user: null,
        });
      } else {
        try {
          const userProfile = await userService.getCurrentUser();

          setAuthState({
            status: "authenticated",
            isNewUser: false,
            user: userProfile,
          });
        } catch (profileError) {
          // Log the error but don't fail the login
          errorHandlingService.handleError(profileError, {
            code: "PROFILE_FETCH_ERROR",
            context: "User Profile",
            userVisible: false,
          });

          setAuthState({
            status: "authenticated",
            isNewUser: false,
            user: null,
          });
        }
      }

      return true;
    } catch (error) {
      // Use error handling service for consistent handling
      errorHandlingService.handleError(error, {
        code: "AUTH_LOGIN_ERROR",
        context: "Authentication",
        userVisible: true,
        updateUi: true,
        details: {
          walletAddress: walletAddress || "Not connected",
        },
      });

      setAuthState({
        ...authState,
        status: "error",
      });

      return false;
    }
  }, [authState, connectWallet, walletAddress]);

  /**
   * Complete logout flow:
   * 1. Logout from backend (revoke token)
   * 2. Disconnect wallet
   * 3. Clear local auth state
   */
  const logout = useCallback(async () => {
    try {
      // 1. Logout from backend
      await dispatch(logoutAsync());

      // 2. Disconnect wallet
      await disconnectWallet();

      // 3. Reset local state
      setAuthState({
        status: "idle",
        user: null,
        isNewUser: false,
      });

      // Clear localStorage
      localStorage.removeItem("healthmint_is_new_user");

      return true;
    } catch (error) {
      // Log error but ensure logout still completes
      errorHandlingService.handleError(error, {
        code: "AUTH_LOGOUT_ERROR",
        context: "Logout",
        userVisible: true,
      });

      // Still disconnect and clear state even if API call fails
      disconnectWallet();
      setAuthState({
        status: "idle",
        user: null,
        isNewUser: false,
      });

      // Clear localStorage
      localStorage.removeItem("healthmint_is_new_user");

      return true; // Return success anyway since we've cleared local state
    }
  }, [dispatch, disconnectWallet]);

  /**
   * Register a new user
   */
  const register = useCallback(
    async (userData) => {
      try {
        if (!isWalletConnected) {
          throw new Error("Wallet must be connected to register");
        }

        if (!userData.name || !userData.role) {
          throw new Error("Name and role are required for registration");
        }

        // Register user with service
        const registerData = {
          ...userData,
          address: walletAddress,
        };

        // Mock registration - store in localStorage
        localStorage.setItem(
          "healthmint_user_profile",
          JSON.stringify(registerData)
        );

        // Update local state
        setAuthState({
          status: "authenticated",
          isNewUser: false,
          user: registerData,
        });

        // Update new user flag in localStorage
        localStorage.setItem("healthmint_is_new_user", "false");

        return true;
      } catch (error) {
        // Use error handling service
        errorHandlingService.handleError(error, {
          code: "USER_REGISTRATION_ERROR",
          context: "User Registration",
          userVisible: true,
          updateUi: true,
          details: {
            providedFields: Object.keys(userData || {}),
            walletConnected: isWalletConnected,
          },
        });

        return false;
      }
    },
    [isWalletConnected, walletAddress]
  );

  /**
   * Verify if the current authentication state is valid and refresh if needed
   */
  const verifyAuth = useCallback(async () => {
    // If not authenticated, no need to verify
    if (!isAuthenticated && !isWalletConnected) return false;

    try {
      // For mock implementation with localStorage
      if (isWalletConnected) {
        // Get saved user profile to check
        const userProfileStr = localStorage.getItem("healthmint_user_profile");
        const isNewUser =
          localStorage.getItem("healthmint_is_new_user") === "true";

        if (!userProfileStr || userProfileStr === "{}") {
          // No profile exists, user is new
          setAuthState((prev) => ({
            ...prev,
            isNewUser: true,
          }));
          localStorage.setItem("healthmint_is_new_user", "true");
          return true;
        }

        try {
          const userProfile = JSON.parse(userProfileStr);

          // Check if profile has required fields
          const profileIncomplete = !userProfile.name || !userProfile.role;
          if (profileIncomplete) {
            setAuthState((prev) => ({
              ...prev,
              isNewUser: true,
            }));
            localStorage.setItem("healthmint_is_new_user", "true");
          } else if (isNewUser) {
            // Profile exists but was marked as new - fix this inconsistency
            setAuthState((prev) => ({
              ...prev,
              isNewUser: false,
              user: userProfile,
            }));
            localStorage.setItem("healthmint_is_new_user", "false");
          } else {
            // Update user in state
            setAuthState((prev) => ({
              ...prev,
              user: userProfile,
            }));
          }
        } catch (error) {
          console.error("Error parsing user profile:", error);
          setAuthState((prev) => ({
            ...prev,
            isNewUser: true,
          }));
          localStorage.setItem("healthmint_is_new_user", "true");
        }

        return true;
      }

      return false;
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "AUTH_VERIFICATION_ERROR",
        context: "Auth Verification",
        userVisible: false,
      });
      return false;
    }
  }, [isAuthenticated, isWalletConnected]);

  // Return hook API
  return {
    // State
    isAuthenticated: isAuthenticated || isWalletConnected, // For mock implementation
    isWalletConnected,
    authLoading: authLoading || walletLoading,
    error: authError || walletError,
    user: authState.user,
    isNewUser: authState.isNewUser,
    status: authState.status,
    walletAddress,
    userRoles,

    // Actions
    login,
    logout,
    register,
    verifyAuth,

    // For testing/development, allow forced new user state
    setIsNewUser: (value) => {
      setAuthState((prev) => ({ ...prev, isNewUser: value }));
      localStorage.setItem("healthmint_is_new_user", value.toString());
    },

    // Underlying services for advanced usage
    authService,
    userService,
  };
};

export default useAuth;
