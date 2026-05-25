// src/components/ProtectedRoute.js
import { useEffect, useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { selectIsRoleSelected, selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { isLogoutInProgress } from "../utils/authLoopPrevention.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";
import LoadingSpinner from "./ui/LoadingSpinner.js";

// This object tracks redirects to prevent infinite loops and excessive redirects
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

// This component protects routes based on authentication and role
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

  const { isConnected: isWalletConnected } = useWalletConnection();
  const {
    isAuthenticated,
    isRegistrationComplete,
    verifyAuth,
    isNewUser,
    clearVerificationCache,
  } = useAuth();
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userRole = useSelector(selectRole);

  const prevPath = useRef(location.pathname);
  const authCheckAttempts = useRef(0);
  const debugId = useMemo(() => Math.random().toString(36).substring(2, 8), []);

  // Check for logout in progress - this is the most important check
  useEffect(() => {
    // If logout is in progress, immediately redirect to login
    if (isLogoutInProgress()) {
      console.log(
        `[ProtectedRoute:${debugId}] Logout in progress, redirecting to login`
      );
      setRedirectPath("/login");
      setIsLoading(false);
      authCheckCompletedRef.current = true;
    }
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
    // Reset on every effect run. Strict Mode does mount→cleanup→remount, and
    // the cleanup below sets this to false — without this line, the second
    // mount (and every dep-change re-run) would leave isMounted stuck at false,
    // so the auth-check finally block would skip setting authCheckCompletedRef,
    // letting subsequent effect re-fires repeat the auth check indefinitely.
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearVerificationCache();
    };
  }, [clearVerificationCache]);

  // Authentication check
  useEffect(() => {
    if (authCheckCompletedRef.current) {
      setIsLoading(false);
      return;
    }

    // Check for logout in progress first
    if (isLogoutInProgress()) {
      console.log(
        `[ProtectedRoute:${debugId}] Logout in progress, redirecting to login`
      );
      setRedirectPath("/login");
      setIsLoading(false);
      authCheckCompletedRef.current = true;
      return;
    }

    const checkAuth = async () => {
      if (isCheckingRef.current) return;

      authCheckAttempts.current += 1;
      if (authCheckAttempts.current > 3) {
        console.warn(
          `[ProtectedRoute:${debugId}] Too many auth attempts, redirecting to login`
        );
        setRedirectPath("/login");
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

        const isWalletConnectedFromStorage =
          localStorage.getItem(STORAGE_KEYS.WALLET_CONNECTION) === "true";
        const hasWalletAddress = !!localStorage.getItem(
          STORAGE_KEYS.WALLET_ADDRESS
        );

        // Use fresh values from verifyAuth result to avoid stale closure reads.
        // isAuthenticated / isNewUser / isRegistrationComplete from hook state
        // are always the initial values during the first render cycle (before
        // the awaited state updates flush), so we must read from `result` here.
        const freshIsAuthenticated = result.isAuthenticated ?? isAuthenticated;
        const freshIsNewUser = result.isNewUser ?? isNewUser;
        const freshIsRegistrationComplete =
          result.isRegistrationComplete ?? isRegistrationComplete;

        if (!isWalletConnected && !isWalletConnectedFromStorage) {
          setRedirectPath("/login");
        } else if (
          (isWalletConnected || isWalletConnectedFromStorage) &&
          !hasWalletAddress
        ) {
          setRedirectPath("/login");
        } else if (requireBackendAuth && !freshIsAuthenticated) {
          setRedirectPath("/login");
        } else if (!freshIsRegistrationComplete && freshIsNewUser) {
          setRedirectPath("/register");
        } else if (
          !isRoleSelected &&
          !localStorage.getItem(STORAGE_KEYS.USER_ROLE) &&
          !sessionStorage.getItem("temp_selected_role")
        ) {
          setRedirectPath("/select-role");
        } else if (allowedRoles.length > 0) {
          const effectiveRole =
            userRole ||
            localStorage.getItem(STORAGE_KEYS.USER_ROLE) ||
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
            localStorage.getItem(STORAGE_KEYS.USER_ROLE) ||
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

    checkAuth();
  }, [
    redirectPath,
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
  ]);

  // Emergency timeout
  useEffect(() => {
    if (!isLoading || authCheckCompletedRef.current) return;

    const handleEmergency = () => {
      if (!isMounted.current) return;

      console.warn(
        `[ProtectedRoute:${debugId}] Emergency: forcing redirect to login`
      );
      dispatch(
        addNotification({
          type: "warning",
          message: "Authentication issue detected. Redirecting to login...",
          duration: 5000,
        })
      );
      setRedirectPath("/login");
      setIsLoading(false);
      authCheckCompletedRef.current = true;
    };

    const timer = setTimeout(handleEmergency, 8000);
    return () => clearTimeout(timer);
  }, [isLoading, dispatch, debugId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner
          size="large"
          label="Verifying authentication..."
          showLabel={true}
        />
      </div>
    );
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
