// src/hooks/updatedUseAuth.js
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useWalletConnection from "./useWalletConnection";
import authService from "../services/authService";
import userService from "../services/userService";
import errorHandlingService from "../services/errorHandlingService";
import { SECURITY_CONFIG } from "../config/envConfig";

import {
  loginAsync,
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
    isNewUser: false,
  });

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
        if (authService.needsRefresh(SECURITY_CONFIG.REFRESH_WINDOW)) {
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

      // 2. & 3. Auth with wallet and get token
      const authResult = await dispatch(
        loginAsync({ address: walletResult.address })
      );

      if (!loginAsync.fulfilled.match(authResult)) {
        throw new Error(authResult.payload || "Authentication failed");
      }

      // 4. Fetch user profile if authenticated
      if (authResult.payload.isNewUser) {
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
  }, [authState, connectWallet, dispatch, walletAddress]);

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
      disconnectWallet();

      // 3. Reset local state
      setAuthState({
        status: "idle",
        user: null,
        isNewUser: false,
      });

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

        const result = await userService.registerUser(registerData);

        // Update local state
        setAuthState({
          status: "authenticated",
          isNewUser: false,
          user: result,
        });

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
    if (!isAuthenticated) return false;

    try {
      // Check if token needs refresh
      if (authService.needsRefresh(SECURITY_CONFIG.REFRESH_WINDOW)) {
        await dispatch(refreshTokenAsync());
      }

      // If we still don't have user data, fetch it
      if (isAuthenticated && !authState.user) {
        const userProfile = await userService.getCurrentUser();

        setAuthState({
          status: "authenticated",
          isNewUser: false,
          user: userProfile,
        });
      }

      return true;
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "AUTH_VERIFICATION_ERROR",
        context: "Auth Verification",
        userVisible: false, // Don't bother user unless necessary
      });
      return false;
    }
  }, [isAuthenticated, authState.user, dispatch]);

  // Return hook API
  return {
    // State
    isAuthenticated,
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

    // Underlying services for advanced usage
    authService,
    userService,
  };
};

export default useAuth;
