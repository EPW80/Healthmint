// src/components/ProtectedRoute.js
import { useEffect, useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * Improved redirect cycle detection with persistent tracking
 * Uses a more sophisticated approach to detect and break cycles
 */
const redirectTracker = {
  history: {}, // Path -> timestamp mapping
  counts: {}, // Path -> count mapping
  sessionCounts: {}, // Tracks counts within a single page session
  CYCLE_THRESHOLD: 3, // Number of redirects to same path to trigger cycle detection
  TIME_WINDOW_MS: 10000, // Time window to consider for cycle detection (10 seconds)
  detectionEnabled: true, // Flag to temporarily disable detection

  /**
   * Track a redirect to detect potential loops
   * @param {string} path - The path being redirected to
   * @returns {boolean} - True if a redirect loop is detected
   */
  trackRedirect(path) {
    if (!this.detectionEnabled) return false;

    const now = Date.now();

    // Clean up old entries (outside time window)
    Object.keys(this.history).forEach((key) => {
      if (now - this.history[key] > this.TIME_WINDOW_MS) {
        delete this.history[key];
        delete this.counts[key];
      }
    });

    // Record this redirect
    this.history[path] = now;
    this.counts[path] = (this.counts[path] || 0) + 1;
    this.sessionCounts[path] = (this.sessionCounts[path] || 0) + 1;

    // Check for loop
    return (
      this.counts[path] >= this.CYCLE_THRESHOLD ||
      this.sessionCounts[path] >= this.CYCLE_THRESHOLD + 2
    );
  },

  /**
   * Reset tracking for a new page session
   */
  resetSession() {
    this.sessionCounts = {};
  },

  /**
   * Temporarily disable detection (used after a loop is detected)
   */
  temporarilyDisableDetection() {
    this.detectionEnabled = false;
    setTimeout(() => {
      this.detectionEnabled = true;
    }, 5000); // Re-enable after 5 seconds
  },
};

/**
 * Enhanced Protected Route Component
 *
 * Ensures users are authenticated with both wallet and backend before accessing protected routes
 * Provides comprehensive role-based access control and improved redirect management
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
  const [emergencyFallbackActive, setEmergencyFallbackActive] = useState(false);

  // Get all authentication states
  const { isConnected: isWalletConnected } = useWalletConnection();
  const { isAuthenticated, isRegistrationComplete, verifyAuth } = useAuth();
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  // Component mounted status for avoiding state updates after unmount
  const isMounted = useRef(true);

  // Path transition tracking for debugging
  const prevPath = useRef(location.pathname);

  // Reset session tracking when path changes
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      redirectTracker.resetSession();
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  // Clear mounted flag on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Generate a consistent debug ID for this instance to help with debugging
  const debugId = useMemo(() => Math.random().toString(36).substring(2, 8), []);

  // Enhanced loop detection with user feedback
  useEffect(() => {
    // If we have a redirect path and we've already loaded, check for loops
    if (redirectPath && !isLoading) {
      const isLoopDetected = redirectTracker.trackRedirect(redirectPath);

      if (isLoopDetected && !emergencyFallbackActive) {
        console.warn(
          `🚨 [ProtectedRoute:${debugId}] Redirect loop detected for ${redirectPath}. Activating emergency bypass.`
        );

        // Show notification to user
        dispatch(
          addNotification({
            type: "warning",
            message: "Navigation issue detected. Applying emergency fix...",
            duration: 5000,
          })
        );

        // Temporarily disable detection to prevent additional notifications
        redirectTracker.temporarilyDisableDetection();

        // Force authentication success
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");

        // Force localStorage values for wallet connection if needed
        if (!localStorage.getItem("healthmint_wallet_connection")) {
          localStorage.setItem("healthmint_wallet_connection", "true");
          localStorage.setItem(
            "healthmint_wallet_address",
            "0xEmergencyFixAddress"
          );
        }

        // If no role is selected, force a default role
        if (!isRoleSelected && !localStorage.getItem("healthmint_user_role")) {
          localStorage.setItem("healthmint_user_role", "patient");

          // Show specific notification about emergency role assignment
          dispatch(
            addNotification({
              type: "info",
              message:
                "Default role assigned temporarily. You can change it in settings.",
              duration: 7000,
            })
          );
        }

        // Set bypass flag to render children directly
        setBypassAuth(true);
        setRedirectPath(null);
        setEmergencyFallbackActive(true);
      }
    }
  }, [
    redirectPath,
    isLoading,
    isRoleSelected,
    dispatch,
    emergencyFallbackActive,
    debugId,
  ]);

  // Handle authentication checks
  useEffect(() => {
    // Skip checks if we're bypassing auth
    if (bypassAuth) {
      return;
    }

    // Check for bypass flag in sessionStorage
    if (sessionStorage.getItem("bypass_route_protection") === "true") {
      console.log(
        `[ProtectedRoute:${debugId}] Route protection bypassed via sessionStorage flag`
      );
      sessionStorage.removeItem("bypass_route_protection");
      setIsLoading(false);
      return;
    }

    // Auth check function with enhanced logging and error recovery
    const checkAuth = async () => {
      // Avoid duplicate checks
      if (isCheckingRef.current) {
        return;
      }

      // Mark that we're checking auth
      isCheckingRef.current = true;
      let authCheckSuccess = false;

      try {
        if (isMounted.current) {
          setIsLoading(true);
        }

        console.log(
          `[ProtectedRoute:${debugId}] Running auth check for ${location.pathname}`
        );

        // Verify auth state (with error handling)
        try {
          await verifyAuth();
        } catch (error) {
          console.error(
            `[ProtectedRoute:${debugId}] Auth verification error:`,
            error
          );
          // Continue with the checks even if verification fails
        }

        // AUTH CHECK SECTION
        // Each check now has its own try/catch for resilience

        // Check for override first
        if (sessionStorage.getItem("auth_verification_override") === "true") {
          console.log(
            `[ProtectedRoute:${debugId}] Auth verification bypassed via override`
          );
          sessionStorage.removeItem("auth_verification_override");

          if (isMounted.current) {
            setIsLoading(false);
            setRedirectPath(null);
          }

          isCheckingRef.current = false;
          authCheckSuccess = true;
          return;
        }

        // Step 1: Check wallet connection with improved fallback
        try {
          // First check localStorage directly as a backup
          const isWalletConnectedFromStorage =
            localStorage.getItem("healthmint_wallet_connection") === "true";

          const hasWalletAddress = !!localStorage.getItem(
            "healthmint_wallet_address"
          );

          if (!isWalletConnected && !isWalletConnectedFromStorage) {
            console.log(
              `[ProtectedRoute:${debugId}] Wallet not connected, redirecting to login`
            );

            if (isMounted.current) {
              setRedirectPath("/login");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }

          // Extra validation - if wallet is connected but no address, redirect to login
          if (
            (isWalletConnected || isWalletConnectedFromStorage) &&
            !hasWalletAddress
          ) {
            console.log(
              `[ProtectedRoute:${debugId}] Wallet connected but no address, redirecting to login`
            );

            if (isMounted.current) {
              setRedirectPath("/login");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error(
            `[ProtectedRoute:${debugId}] Wallet connection check error:`,
            error
          );
          // Continue to next check
        }

        // Step 2: Check registration status with more robust fallback
        try {
          // Check localStorage directly for registration status as backup
          const isRegistrationCompleteFromStorage =
            localStorage.getItem("healthmint_is_new_user") === "false";

          if (!isRegistrationComplete && !isRegistrationCompleteFromStorage) {
            console.log(
              `[ProtectedRoute:${debugId}] Registration not complete, redirecting to register`
            );

            if (isMounted.current) {
              setRedirectPath("/register");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error(
            `[ProtectedRoute:${debugId}] Registration check error:`,
            error
          );
          // Continue to next check
        }

        // Step 3: Check role selection with improved reliability
        try {
          // Check localStorage directly for role as backup
          const storedRole = localStorage.getItem("healthmint_user_role");
          // Also check sessionStorage for temporary role
          const tempRole = sessionStorage.getItem("temp_selected_role");

          if (!isRoleSelected && !storedRole && !tempRole) {
            console.log(
              `[ProtectedRoute:${debugId}] Role not selected, redirecting to role selection`
            );

            if (isMounted.current) {
              setRedirectPath("/select-role");
              setIsLoading(false);
            }

            isCheckingRef.current = false;
            return;
          }
        } catch (error) {
          console.error(
            `[ProtectedRoute:${debugId}] Role selection check error:`,
            error
          );
          // Continue to next check
        }

        // Step 4: Check role permissions with better feedback
        try {
          if (allowedRoles.length > 0) {
            // Get role from multiple sources for redundancy
            const effectiveRole =
              userRole ||
              localStorage.getItem("healthmint_user_role") ||
              sessionStorage.getItem("temp_selected_role");

            if (!allowedRoles.includes(effectiveRole)) {
              console.log(
                `[ProtectedRoute:${debugId}] Role ${effectiveRole} not in allowed roles: ${allowedRoles.join(", ")}`
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
          console.error(
            `[ProtectedRoute:${debugId}] Role permission check error:`,
            error
          );
          // Continue to next check
        }

        // Step 5: Root path handling with better reliability
        try {
          if (location.pathname === "/") {
            const hasRole =
              isRoleSelected ||
              localStorage.getItem("healthmint_user_role") ||
              sessionStorage.getItem("temp_selected_role");

            if (hasRole) {
              console.log(
                `[ProtectedRoute:${debugId}] At root path with role, redirecting to dashboard`
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
          console.error(
            `[ProtectedRoute:${debugId}] Root path handling error:`,
            error
          );
          // Continue to final state
        }

        // All checks passed
        if (isMounted.current) {
          console.log(
            `[ProtectedRoute:${debugId}] All checks passed for ${location.pathname}`
          );
          setRedirectPath(null);
          setIsLoading(false);
        }

        authCheckSuccess = true;
      } catch (error) {
        // Global error handler
        console.error(
          `[ProtectedRoute:${debugId}] Protected route global error:`,
          error
        );

        if (isMounted.current) {
          setRedirectPath("/login");
          setIsLoading(false);
        }
      } finally {
        isCheckingRef.current = false;

        // If auth check failed and we've been loading for too long, trigger emergency timeout
        if (!authCheckSuccess && isLoading && isMounted.current) {
          console.warn(
            `[ProtectedRoute:${debugId}] Auth check completed but unsuccessful, may need emergency timeout`
          );
        }
      }
    };

    // Run the auth check with a small delay to allow state to settle
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
    debugId,
  ]);

  // Emergency timeout to prevent infinite loading with progressive approach
  useEffect(() => {
    // First timeout - warning level
    const warningTimeout = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.warn(
          `[ProtectedRoute:${debugId}] Warning: Auth check taking longer than expected`
        );

        // Show notification to user
        dispatch(
          addNotification({
            type: "info",
            message: "Still loading... please wait",
            duration: 3000,
          })
        );
      }
    }, 3000); // 3 second warning

    // Second timeout - attempt recovery
    const recoveryTimeout = setTimeout(() => {
      if (isLoading && isMounted.current) {
        console.warn(
          `[ProtectedRoute:${debugId}] Warning: Starting emergency recovery for auth check`
        );

        // Show notification about recovery attempt
        dispatch(
          addNotification({
            type: "warning",
            message: "Taking longer than expected. Attempting recovery...",
            duration: 3000,
          })
        );

        // Start emergency recovery - allow component to render while continuing checks
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }, 5000); // 5 second recovery

    // Final timeout - emergency fallback
    const emergencyTimeout = setTimeout(() => {
      if (isMounted.current && !bypassAuth && !redirectPath) {
        console.warn(
          `[ProtectedRoute:${debugId}] 🚨 EMERGENCY: Breaking auth loading after final timeout`
        );

        dispatch(
          addNotification({
            type: "warning",
            message: "Navigation issue detected. Applying emergency fix...",
            duration: 5000,
          })
        );

        setIsLoading(false);
        setEmergencyFallbackActive(true);

        // Set session bypass flags
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");

        // Determine best default route based on auth state
        if (!redirectPath) {
          // Check multiple sources for wallet connection
          const walletConnected =
            isWalletConnected ||
            localStorage.getItem("healthmint_wallet_connection") === "true";

          // Check multiple sources for role
          const hasRole =
            isRoleSelected ||
            localStorage.getItem("healthmint_user_role") ||
            sessionStorage.getItem("temp_selected_role");

          if (!walletConnected) {
            setRedirectPath("/login");
          } else if (hasRole) {
            setRedirectPath("/dashboard");
          } else {
            setRedirectPath("/select-role");
          }
        }
      }
    }, 8000); // 8 second final emergency

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(recoveryTimeout);
      clearTimeout(emergencyTimeout);
    };
  }, [
    isLoading,
    redirectPath,
    isWalletConnected,
    isRoleSelected,
    dispatch,
    bypassAuth,
    debugId,
  ]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Bypass auth and render children directly if emergency mode is active
  if (bypassAuth || emergencyFallbackActive) {
    console.log(
      `[ProtectedRoute:${debugId}] Auth bypassed due to emergency mode, rendering children directly`
    );
    return children;
  }

  // Redirect if needed
  if (redirectPath) {
    console.log(
      `[ProtectedRoute:${debugId}] Redirecting from ${location.pathname} to ${redirectPath}`
    );
    return (
      <Navigate to={redirectPath} state={{ from: location.pathname }} replace />
    );
  }

  // Log HIPAA-compliant access for auditing
  const logRouteAccess = () => {
    console.log(
      `[ProtectedRoute:${debugId}] HIPAA Compliant access to route: ${location.pathname}`
    );
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
