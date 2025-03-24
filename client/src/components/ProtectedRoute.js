// src/components/ProtectedRoute.js
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import {
  selectIsAuthenticated,
  refreshTokenAsync,
} from "../redux/slices/authSlice.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import useNavigation from "../hooks/useNavigation.js";

/**
 * Protected Route Component
 * Ensures users are authenticated with both wallet and backend before accessing protected routes
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

  // Get all authentication states
  const { isConnected: isWalletConnected } = useWalletConnection();
  const isBackendAuthenticated = useSelector(selectIsAuthenticated);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  // Component mounted status for avoiding state updates after unmount
  const isMounted = useRef(true);

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
      // Don't run checks if we've already determined a redirect or are currently checking
      if (redirectPath !== null || isCheckingRef.current) {
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
          if (isMounted.current) {
            setRedirectPath("/login");
          }
          return;
        }

        // Step 2: Check backend authentication if required
        if (requireBackendAuth && !isBackendAuthenticated) {
          // Try to refresh token first before redirecting
          try {
            const refreshResult = await dispatch(refreshTokenAsync()).unwrap();
            if (!refreshResult) {
              throw new Error("Authentication failed");
            }
          } catch (error) {
            if (isMounted.current) {
              setRedirectPath("/login");
            }
            return;
          }
        }

        // Step 3: Check role selection
        if (!isRoleSelected) {
          if (isMounted.current) {
            setRedirectPath("/select-role");
          }
          return;
        }

        // Step 4: Check role permissions if allowedRoles is provided
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          dispatch(
            addNotification({
              type: "error",
              message: `Access denied. This page requires ${allowedRoles.join(" or ")} role.`,
              duration: 5000,
            })
          );

          if (isMounted.current) {
            setRedirectPath("/dashboard");
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
    redirectPath, // Added to fix the ESLint warning
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
