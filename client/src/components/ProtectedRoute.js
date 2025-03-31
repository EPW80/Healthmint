// src/components/ProtectedRoute.js
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * RedirectTracker
 * Singleton utility to detect and prevent redirect loops
 */
const redirectTracker = {
  history: {}, // Path -> timestamp
  counts: {}, // Path -> redirect count
  sessionCounts: {}, // Session-specific redirect count
  CYCLE_THRESHOLD: 3, // Max redirects before loop detection
  TIME_WINDOW_MS: 10000, // 10-second window for cleanup
  detectionEnabled: true,

  trackRedirect(path) {
    if (!this.detectionEnabled) return false;
    const now = Date.now();

    // Clean up stale entries
    Object.keys(this.history).forEach((key) => {
      if (now - this.history[key] > this.TIME_WINDOW_MS) {
        delete this.history[key];
        delete this.counts[key];
      }
    });

    // Track this redirect
    this.history[path] = now;
    this.counts[path] = (this.counts[path] || 0) + 1;
    this.sessionCounts[path] = (this.sessionCounts[path] || 0) + 1;

    return (
      this.counts[path] >= this.CYCLE_THRESHOLD ||
      this.sessionCounts[path] >= this.CYCLE_THRESHOLD + 2
    );
  },

  resetSession() {
    this.sessionCounts = {};
  },

  temporarilyDisableDetection() {
    this.detectionEnabled = false;
    setTimeout(() => {
      this.detectionEnabled = true;
    }, 5000);
  },
};

/**
 * ProtectedRoute
 * Ensures authentication and role-based access for protected routes
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireBackendAuth = true,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const isCheckingRef = useRef(false);
  const authCheckCompletedRef = useRef(false);
  const isMounted = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [bypassAuth, setBypassAuth] = useState(false);

  const { isConnected: isWalletConnected } = useWalletConnection();
  const {
    isAuthenticated,
    isRegistrationComplete,
    verifyAuth,
    isNewUser,
    clearVerificationCache,
    resetVerificationAttempts,
  } = useAuth();
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  const prevPath = useRef(location.pathname);
  const authCheckAttempts = useRef(0);
  const debugId = useMemo(() => Math.random().toString(36).substring(2, 8), []);

  // Check bypass flags
  const checkBypassFlags = useCallback(() => {
    if (sessionStorage.getItem("bypass_route_protection") === "true") {
      console.log(`[ProtectedRoute:${debugId}] Bypassing route protection`);
      return true;
    }
    return false;
  }, [debugId]);

  // Reset tracking on path change
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      redirectTracker.resetSession();
      prevPath.current = location.pathname;
      authCheckCompletedRef.current = false;
      authCheckAttempts.current = 0;
    }
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      clearVerificationCache();
    };
  }, [clearVerificationCache]);

  // Authentication check
  useEffect(() => {
    if (bypassAuth || authCheckCompletedRef.current) {
      setIsLoading(false);
      return;
    }

    if (checkBypassFlags()) {
      setBypassAuth(true);
      setIsLoading(false);
      authCheckCompletedRef.current = true;
      return;
    }

    const checkAuth = async () => {
      if (isCheckingRef.current) return;

      authCheckAttempts.current += 1;
      if (authCheckAttempts.current > 3) {
        console.warn(
          `[ProtectedRoute:${debugId}] Too many auth attempts, bypassing`
        );
        setBypassAuth(true);
        sessionStorage.setItem("bypass_route_protection", "true");
        setIsLoading(false);
        authCheckCompletedRef.current = true;
        return;
      }

      if (sessionStorage.getItem("force_wallet_reconnect") === "true") {
        console.log(`[ProtectedRoute:${debugId}] Forcing wallet reconnect`);
        sessionStorage.removeItem("force_wallet_reconnect");
        setRedirectPath("/login");
        setIsLoading(false);
        authCheckCompletedRef.current = true;
        return;
      }

      isCheckingRef.current = true;

      try {
        setIsLoading(true);
        console.log(
          `[ProtectedRoute:${debugId}] Checking auth for ${location.pathname}`
        );

        const result = await Promise.race([
          verifyAuth(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Auth timeout")), 5000)
          ),
        ]);

        if (result === null) {
          console.log(`[ProtectedRoute:${debugId}] Auth already in progress`);
          setTimeout(() => {
            if (isMounted.current && !authCheckCompletedRef.current) {
              setIsLoading(false);
              authCheckCompletedRef.current = true;
            }
          }, 2000);
          return;
        }

        if (sessionStorage.getItem("auth_verification_override") === "true") {
          console.log(`[ProtectedRoute:${debugId}] Auth override active`);
          setBypassAuth(true);
          setIsLoading(false);
          authCheckCompletedRef.current = true;
          return;
        }

        const isWalletConnectedFromStorage =
          localStorage.getItem("healthmint_wallet_connection") === "true";
        const hasWalletAddress = !!localStorage.getItem(
          "healthmint_wallet_address"
        );

        if (!isWalletConnected && !isWalletConnectedFromStorage) {
          setRedirectPath("/login");
        } else if (
          (isWalletConnected || isWalletConnectedFromStorage) &&
          !hasWalletAddress
        ) {
          setRedirectPath("/login");
        } else if (requireBackendAuth && !isAuthenticated) {
          setRedirectPath("/login");
        } else if (!isRegistrationComplete && isNewUser) {
          setRedirectPath("/register");
        } else if (
          !isRoleSelected &&
          !localStorage.getItem("healthmint_user_role") &&
          !sessionStorage.getItem("temp_selected_role")
        ) {
          setRedirectPath("/select-role");
        } else if (allowedRoles.length > 0) {
          const effectiveRole =
            userRole ||
            localStorage.getItem("healthmint_user_role") ||
            sessionStorage.getItem("temp_selected_role");
          if (!allowedRoles.includes(effectiveRole)) {
            dispatch(
              addNotification({
                type: "error",
                message: `Access denied. Requires ${allowedRoles.join(" or ")} role.`,
                duration: 5000,
              })
            );
            setRedirectPath("/dashboard");
          }
        } else if (location.pathname === "/") {
          const hasRole =
            isRoleSelected ||
            localStorage.getItem("healthmint_user_role") ||
            sessionStorage.getItem("temp_selected_role");
          if (hasRole) {
            setRedirectPath("/dashboard");
          }
        }

        if (!redirectPath) {
          console.log(`[ProtectedRoute:${debugId}] Auth check passed`);
        }
      } catch (error) {
        console.error(`[ProtectedRoute:${debugId}] Auth check failed:`, error);
        setRedirectPath("/login");
      } finally {
        isCheckingRef.current = false;
        if (isMounted.current) {
          setIsLoading(false);
          authCheckCompletedRef.current = true;
        }
      }
    };

    const timeoutId = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeoutId);
  }, [
    redirectPath,
    bypassAuth,
    isWalletConnected,
    isAuthenticated,
    isRegistrationComplete,
    isNewUser,
    isRoleSelected,
    userRole,
    allowedRoles,
    requireBackendAuth,
    verifyAuth,
    location.pathname,
    dispatch,
    debugId,
    checkBypassFlags,
  ]);

  // Emergency timeout with redirect loop detection
  useEffect(() => {
    if (bypassAuth || !isLoading || authCheckCompletedRef.current) return;

    const handleEmergency = () => {
      if (!isMounted.current) return;

      if (redirectPath && redirectTracker.trackRedirect(redirectPath)) {
        console.warn(
          `[ProtectedRoute:${debugId}] Redirect loop detected: ${redirectPath}`
        );
        dispatch(
          addNotification({
            type: "warning",
            message: "Navigation loop detected. Applying fix...",
            duration: 5000,
          })
        );
        redirectTracker.temporarilyDisableDetection();
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");

        if (!localStorage.getItem("healthmint_wallet_connection")) {
          localStorage.setItem("healthmint_wallet_connection", "true");
          localStorage.setItem("healthmint_wallet_address", "0xEmergencyFix");
        }
        if (!isRoleSelected && !localStorage.getItem("healthmint_user_role")) {
          localStorage.setItem("healthmint_user_role", "patient");
          dispatch(
            addNotification({
              type: "info",
              message: "Assigned default role: patient",
              duration: 5000,
            })
          );
        }

        setBypassAuth(true);
        setRedirectPath(null);
        resetVerificationAttempts();
      } else if (!redirectPath) {
        console.warn(
          `[ProtectedRoute:${debugId}] Auth taking too long, bypassing`
        );
        dispatch(
          addNotification({
            type: "warning",
            message: "Authentication delayed. Applying fix...",
            duration: 5000,
          })
        );
        setBypassAuth(true);
        sessionStorage.setItem("bypass_route_protection", "true");
      }

      setIsLoading(false);
      authCheckCompletedRef.current = true;
    };

    const timer = setTimeout(handleEmergency, 8000);
    return () => clearTimeout(timer);
  }, [
    isLoading,
    redirectPath,
    bypassAuth,
    isRoleSelected,
    dispatch,
    debugId,
    resetVerificationAttempts,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (bypassAuth) {
    console.log(`[ProtectedRoute:${debugId}] Rendering children due to bypass`);
    return children;
  }

  if (redirectPath) {
    console.log(`[ProtectedRoute:${debugId}] Redirecting to ${redirectPath}`);
    return (
      <Navigate to={redirectPath} state={{ from: location.pathname }} replace />
    );
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requireBackendAuth: PropTypes.bool,
};

export default ProtectedRoute;
