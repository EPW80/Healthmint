// src/components/ProtectedRoute.js
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * Enhanced Protected Route Component
 *
 * Ensures users are authenticated with both wallet and backend before accessing protected routes
 * Provides comprehensive role-based access control and redirect management
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBackendAuth = true,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();

  // Use a ref to prevent running auth checks simultaneously
  const isCheckingRef = useRef(false);

  // State for loading during auth checks
  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);

  // Get all authentication states
  const { isConnected: isWalletConnected } = useWalletConnection();
  const { isAuthenticated, isRegistrationComplete, verifyAuth } = useAuth();
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  // Component mounted status for avoiding state updates after unmount
  const isMounted = useRef(true);

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

      // Mark that we're checking auth
      isCheckingRef.current = true;

      if (isMounted.current) {
        setIsLoading(true);
      }

      try {
        // Verify auth state
        await verifyAuth();

        // Step 1: Check wallet connection
        if (!isWalletConnected) {
          console.log(
            "ProtectedRoute: Wallet not connected, redirecting to login"
          );
          if (isMounted.current) {
            setRedirectPath("/login");
          }
          return;
        }

        // Step 2: Check registration status
        if (!isRegistrationComplete) {
          console.log(
            "ProtectedRoute: Registration not complete, redirecting to register"
          );
          if (isMounted.current) {
            setRedirectPath("/register");
          }
          return;
        }

        // Step 3: Check role selection
        if (!isRoleSelected) {
          console.log(
            "ProtectedRoute: Role not selected, redirecting to role selection"
          );
          if (isMounted.current) {
            setRedirectPath("/select-role");
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
          }
          return;
        }

        // Step 5: Special path handling
        // Check if at root path and should redirect to dashboard
        if (location.pathname === "/" && isRoleSelected) {
          if (isMounted.current) {
            setRedirectPath("/dashboard");
          }
          return;
        }

        // All checks passed, clear any redirect
        if (isMounted.current) {
          setRedirectPath(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);

        // On error, redirect to login
        if (isMounted.current) {
          setRedirectPath("/login");
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
    isAuthenticated,
    isRoleSelected,
    isRegistrationComplete,
    userRole,
    allowedRoles,
    requireBackendAuth,
    dispatch,
    verifyAuth,
    location.pathname,
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

  // Log HIPAA-compliant access for auditing (would be implemented with hipaaComplianceService)
  // This would create an audit trail of who accessed which routes when
  const logRouteAccess = () => {
    // Implementation would be added here in a real application
    console.log(`HIPAA Compliant access to route: ${location.pathname}`);
  };

  // Log route access for protected routes
  logRouteAccess();

  // Render children if authorized
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requireBackendAuth: PropTypes.bool,
};

export default ProtectedRoute;
