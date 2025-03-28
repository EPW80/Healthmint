// src/components/ProtectedRoute.js
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import {
  selectIsAuthenticated,
  refreshTokenAsync,
} from "../redux/slices/authSlice.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import useNavigation from "../hooks/useNavigation.js";

/**
 * Enhanced Protected Route Component
 *
 * Ensures users are authenticated with both wallet and backend before accessing protected routes
 * Provides improved role-based access control and redirect management
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBackendAuth = true,
}) => {
  const dispatch = useDispatch();
  const { location } = useNavigation();

  // Use a ref to prevent running auth checks simultaneously
  const isCheckingRef = useRef(false);

  // State for loading during auth checks
  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [lastRedirectAttempt, setLastRedirectAttempt] = useState(null);

  // Get all authentication states
  const { isConnected: isWalletConnected, address: walletAddress } =
    useWalletConnection();
  const isBackendAuthenticated = useSelector(selectIsAuthenticated);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  // Component mounted status for avoiding state updates after unmount
  const isMounted = useRef(true);

  // Debug log the current state
  useEffect(() => {
    console.log("ProtectedRoute state:", {
      isWalletConnected,
      isBackendAuthenticated,
      isRoleSelected,
      userRole,
      currentPath: location.pathname,
      allowedRoles,
      requireBackendAuth,
    });
  }, [
    isWalletConnected,
    isBackendAuthenticated,
    isRoleSelected,
    userRole,
    location.pathname,
    allowedRoles,
    requireBackendAuth,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle authentication checks
  useEffect(() => {
    // Comprehensive auth check function
    const checkAuth = async () => {
      // Avoid duplicate checks
      if (isCheckingRef.current) {
        return;
      }

      // Don't recheck if we've just redirected
      if (
        redirectPath !== null &&
        lastRedirectAttempt &&
        Date.now() - lastRedirectAttempt < 2000
      ) {
        return;
      }

      // Mark that we're checking auth
      isCheckingRef.current = true;

      if (isMounted.current) {
        setIsLoading(true);
      }

      try {
        // Step 1: Check wallet connection
        if (!isWalletConnected) {
          console.log(
            "ProtectedRoute: Wallet not connected, redirecting to login"
          );
          if (isMounted.current) {
            setRedirectPath("/login");
            setLastRedirectAttempt(Date.now());
          }
          return;
        }

        // Step 2: Check backend authentication if required
        if (requireBackendAuth && !isBackendAuthenticated) {
          console.log(
            "ProtectedRoute: Backend auth required but not authenticated"
          );
          // Try to refresh token first before redirecting
          try {
            console.log("ProtectedRoute: Attempting to refresh token");
            const refreshResult = await dispatch(refreshTokenAsync()).unwrap();
            if (!refreshResult) {
              throw new Error("Authentication failed");
            }
          } catch (error) {
            console.log(
              "ProtectedRoute: Token refresh failed, redirecting to login"
            );
            if (isMounted.current) {
              setRedirectPath("/login");
              setLastRedirectAttempt(Date.now());
            }
            return;
          }
        }

        // Step 3: Check role selection
        if (!isRoleSelected) {
          console.log(
            "ProtectedRoute: Role not selected, redirecting to role selection"
          );
          if (isMounted.current) {
            setRedirectPath("/select-role");
            setLastRedirectAttempt(Date.now());
          }
          return;
        }

        // Step 4: Check role permissions if allowedRoles is provided
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          console.log(
            `ProtectedRoute: User role ${userRole} not in allowed roles: ${allowedRoles.join(", ")}`
          );
          dispatch(
            addNotification({
              type: "error",
              message: `Access denied. This page requires ${allowedRoles.join(" or ")} role.`,
              duration: 5000,
            })
          );

          if (isMounted.current) {
            setRedirectPath("/dashboard");
            setLastRedirectAttempt(Date.now());
          }
          return;
        }

        // All checks passed, clear any redirect
        if (isMounted.current) {
          setRedirectPath(null);
        }
      } finally {
        isCheckingRef.current = false;

        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    // Run the auth check
    checkAuth();
  }, [
    isWalletConnected,
    isBackendAuthenticated,
    isRoleSelected,
    userRole,
    allowedRoles,
    requireBackendAuth,
    dispatch,
    redirectPath,
    lastRedirectAttempt,
  ]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if needed
  if (redirectPath) {
    console.log(
      `ProtectedRoute: Redirecting from ${location.pathname} to ${redirectPath}`
    );
    return (
      <Navigate to={redirectPath} state={{ from: location.pathname }} replace />
    );
  }

  // Render children if authorized
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requireBackendAuth: PropTypes.bool,
};

export default ProtectedRoute;
