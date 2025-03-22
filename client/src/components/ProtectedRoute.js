// src/components/ProtectedRoute.js - Fixed to prevent navigation loops
import { useEffect, useState } from "react";
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
 * Protected Route Component - Fixed to prevent navigation loops
 * Ensures users are authenticated with both wallet and backend before accessing protected routes
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBackendAuth = true,
}) => {
  const dispatch = useDispatch();
  const { location } = useNavigation();

  // State for loading during auth checks
  const [isChecking, setIsChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);

  // Get all authentication states
  const { isConnected: isWalletConnected } = useWalletConnection();
  const isBackendAuthenticated = useSelector(selectIsAuthenticated);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  useEffect(() => {
    // Comprehensive auth check function
    const checkAuth = async () => {
      setIsChecking(true);

      try {
        // Step 1: Check wallet connection
        if (!isWalletConnected) {
          setRedirectTo("/login");
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
            setRedirectTo("/login");
            return;
          }
        }

        // Step 3: Check role selection
        if (!isRoleSelected) {
          setRedirectTo("/select-role");
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

          setRedirectTo("/dashboard");
          return;
        }

        // All checks passed, clear any redirect
        setRedirectTo(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [
    isWalletConnected,
    isBackendAuthenticated,
    isRoleSelected,
    userRole,
    allowedRoles,
    requireBackendAuth,
    dispatch,
    location.pathname,
  ]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if needed
  if (redirectTo) {
    return (
      <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
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
