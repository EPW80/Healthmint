// src/components/ProtectedRoute.js
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
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
 * Also verifies that user has selected a role
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements to render if authenticated
 * @param {Array<string>} props.allowedRoles - Roles allowed to access this route (optional)
 * @param {boolean} props.requireBackendAuth - Whether backend authentication is required (defaults to true)
 * @returns {React.ReactNode} - The protected content or null during redirect
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBackendAuth = true,
}) => {
  const dispatch = useDispatch();
  const { navigateTo, location } = useNavigation();

  // State for loading during auth checks
  const [isChecking, setIsChecking] = useState(true);

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
          navigateTo("/login", {
            replace: true,
            state: { from: location.pathname },
          });
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
            navigateTo("/login", {
              replace: true,
              state: { from: location.pathname },
            });
            return;
          }
        }

        // Step 3: Check role selection
        if (!isRoleSelected) {
          navigateTo("/select-role", {
            replace: true,
            state: { from: location.pathname },
          });
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

          navigateTo("/dashboard", { replace: true });
          return;
        }
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
    navigateTo,
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

  // Only render children if all required conditions are met
  return isWalletConnected &&
    (!requireBackendAuth || isBackendAuthenticated) &&
    isRoleSelected &&
    (allowedRoles.length === 0 || allowedRoles.includes(userRole))
    ? children
    : null;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requireBackendAuth: PropTypes.bool,
};

export default ProtectedRoute;
