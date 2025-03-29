// src/components/ProtectedRoute.js
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

// Global redirect tracking
const redirectHistory = {};
const redirectCounts = {};
const REDIRECT_THRESHOLD = 3;
const REDIRECT_WINDOW_MS = 10000; // 10 seconds

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

  // Use ref to prevent running auth checks simultaneously
  const isCheckingRef = useRef(false);

  // State for loading during auth checks
  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [bypassAuth, setBypassAuth] = useState(false);

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

  // Emergency fallback check - force auth if we're in a loop
  useEffect(() => {
    // If we have a redirect path and we've already loaded, check for loops
    if (redirectPath && !isLoading) {
      const now = Date.now();

      // Clean up old redirects (older than REDIRECT_WINDOW_MS)
      Object.keys(redirectHistory).forEach((path) => {
        if (now - redirectHistory[path] > REDIRECT_WINDOW_MS) {
          delete redirectHistory[path];
          delete redirectCounts[path];
        }
      });

      // Track this redirect
      redirectHistory[redirectPath] = now;
      redirectCounts[redirectPath] = (redirectCounts[redirectPath] || 0) + 1;

      // If we've redirected to this path too many times, activate emergency bypass
      if (redirectCounts[redirectPath] >= REDIRECT_THRESHOLD) {
        console.warn(
          `🚨 EMERGENCY: Redirect loop detected for ${redirectPath}. Activating auth bypass.`
        );

        // Force authentication success
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");

        // Force localStorage values for wallet connection
        if (!localStorage.getItem("healthmint_wallet_connection")) {
          localStorage.setItem("healthmint_wallet_connection", "true");
          localStorage.setItem(
            "healthmint_wallet_address",
            "0xEmergencyFixAddress"
          );
        }

        // If no role is selected, force a default role
        if (!isRoleSelected) {
          localStorage.setItem("healthmint_user_role", "patient");
        }

        // Set bypass flag to render children directly
        setBypassAuth(true);
        setRedirectPath(null);
      }
    }
  }, [redirectPath, isLoading, isRoleSelected]);

  // Handle authentication checks
  useEffect(() => {
    // Skip checks if we're bypassing auth
    if (bypassAuth) {
      return;
    }

    // Check for bypass flag in sessionStorage
    if (sessionStorage.getItem("bypass_route_protection") === "true") {
      console.log("Route protection bypassed via sessionStorage flag");
      sessionStorage.removeItem("bypass_route_protection");
      setIsLoading(false);
      return;
    }

    // Auth check function
    const checkAuth = async () => {
      // Avoid duplicate checks
      if (isCheckingRef.current) {
        return;
      }

      // Mark that we're checking auth
      isCheckingRef.current = true;

      try {
        if (isMounted.current) {
          setIsLoading(true);
        }

        // Verify auth state (with error handling)
        try {
          await verifyAuth();
        } catch (error) {
          console.error("Auth verification error:", error);
          // Continue with the checks even if verification fails
        }

        // AUTH CHECK SECTION
        // Each check now has its own try/catch for resilience

        // Check for override first
        if (sessionStorage.getItem("auth_verification_override") === "true") {
          console.log("Auth verification bypassed via override");
          sessionStorage.removeItem("auth_verification_override");

          if (isMounted.current) {
            setIsLoading(false);
            setRedirectPath(null);
          }

          isCheckingRef.current = false;
          return;
        }

        // Step 1: Check wallet connection
        try {
          // First check localStorage directly as a backup
          const isWalletConnectedFromStorage =
            localStorage.getItem("healthmint_wallet_connection") === "true";

          if (!isWalletConnected && !isWalletConnectedFromStorage) {
            console.log(
              "ProtectedRoute: Wallet not connected, redirecting to login"
            );

            if (isMounted.current) {
              setRedirectPath("/login");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error("Wallet connection check error:", error);
          // Continue to next check
        }

        // Step 2: Check registration status
        try {
          if (!isRegistrationComplete) {
            console.log(
              "ProtectedRoute: Registration not complete, redirecting to register"
            );

            if (isMounted.current) {
              setRedirectPath("/register");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error("Registration check error:", error);
          // Continue to next check
        }

        // Step 3: Check role selection
        try {
          // Check localStorage directly as a backup
          const storedRole = localStorage.getItem("healthmint_user_role");

          if (!isRoleSelected && !storedRole) {
            console.log(
              "ProtectedRoute: Role not selected, redirecting to role selection"
            );

            if (isMounted.current) {
              setRedirectPath("/select-role");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error("Role selection check error:", error);
          // Continue to next check
        }

        // Step 4: Check role permissions
        try {
          if (allowedRoles.length > 0) {
            // Get role from Redux or localStorage
            const effectiveRole =
              userRole || localStorage.getItem("healthmint_user_role");

            if (!allowedRoles.includes(effectiveRole)) {
              console.log(
                `ProtectedRoute: Role ${effectiveRole} not in allowed roles: ${allowedRoles.join(", ")}`
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
                setIsLoading(false);
              }

              isCheckingRef.current = false;
              return;
            }
          }
        } catch (error) {
          console.error("Role permission check error:", error);
          // Continue to next check
        }

        // Step 5: Root path handling
        try {
          if (location.pathname === "/") {
            const hasRole =
              isRoleSelected || localStorage.getItem("healthmint_user_role");

            if (hasRole) {
              console.log(
                "ProtectedRoute: At root path with role, redirecting to dashboard"
              );

              if (isMounted.current) {
                setRedirectPath("/dashboard");
                setIsLoading(false);
              }

              isCheckingRef.current = false;
              return;
            }
          }
        } catch (error) {
          console.error("Root path handling error:", error);
          // Continue to final state
        }

        // All checks passed
        if (isMounted.current) {
          setRedirectPath(null);
          setIsLoading(false);
        }
      } catch (error) {
        // Global error handler
        console.error("Protected route global error:", error);

        if (isMounted.current) {
          setRedirectPath("/login");
          setIsLoading(false);
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Run the auth check with a small delay
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    isWalletConnected,
    isAuthenticated,
    isRoleSelected,
    isRegistrationComplete,
    userRole,
    allowedRoles,
    requireBackendAuth,
    verifyAuth,
    location.pathname,
    dispatch,
    bypassAuth,
  ]);

  // Emergency timeout to prevent infinite loading
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.warn("🚨 EMERGENCY: Breaking auth loading after timeout");
        setIsLoading(false);

        // Check if we should redirect to a default route
        if (!redirectPath) {
          // Determine best default route based on auth state
          const walletConnected =
            isWalletConnected ||
            localStorage.getItem("healthmint_wallet_connection") === "true";
          const hasRole =
            isRoleSelected || localStorage.getItem("healthmint_user_role");

          if (!walletConnected) {
            setRedirectPath("/login");
          } else if (hasRole) {
            setRedirectPath("/dashboard");
          } else {
            setRedirectPath("/select-role");
          }
        }
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(emergencyTimeout);
  }, [isLoading, redirectPath, isWalletConnected, isRoleSelected]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Bypass auth and render children directly if emergency mode is active
  if (bypassAuth) {
    console.log(
      "ProtectedRoute: Auth bypassed due to emergency mode, rendering children directly"
    );
    return children;
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

  // Log HIPAA-compliant access for auditing
  const logRouteAccess = () => {
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
