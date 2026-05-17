// client/src/hooks/useSynchronizedAuth.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { setRole } from "../redux/slices/roleSlice";
import { updateUserProfile } from "../redux/slices/userSlice";
import useWalletConnect from "./useWalletConnect";
import useAuth from "./useAuth";
import useNavigation from "./useNavigation";
import useAsyncOperation from "./useAsyncOperation";
import { useError } from "../contexts/ErrorContext";
import { addNotification } from "../redux/slices/notificationSlice";
import {
  isLogoutInProgress,
  trackVerificationAttempt,
  resetVerificationAttempts,
  trackNavigation,
} from "../utils/authLoopPrevention";
import hipaaComplianceService from "../services/hipaaComplianceService";

// Custom hook for synchronized authentication
const useSynchronizedAuth = (options = {}) => {
  const { componentId = "auth-synchronizer" } = options;

  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();
  const location = useLocation(); // Use React Router's useLocation hook
  const walletState = useSelector((state) => state.wallet);
  const roleState = useSelector((state) => state.role);
  const { addError, removeError } = useError();

  // Get auth and wallet hooks
  const {
    isConnected: isWalletConnected,
    address: walletAddress,
    loading: walletLoading,
  } = useWalletConnect();

  const {
    isAuthenticated,
    isRegistrationComplete,
    isNewUser,
    verifyAuth,
    loading: authLoading,
    userIdentity,
  } = useAuth();

  // Setup async operation handler with HIPAA compliance
  const { execute, loading: asyncLoading } = useAsyncOperation({
    componentId,
    userId:
      walletAddress ||
      localStorage.getItem("healthmint_wallet_address") ||
      "anonymous",
    onError: (error) => {
      console.error("Auth synchronization error:", error);
      dispatch(
        addNotification({
          type: "error",
          message: "Authentication error occurred",
          duration: 5000,
        })
      );
    },
  });

  // State
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const verificationInProgress = useRef(false);
  const authVerificationCount = useRef(0);
  const lastVerificationTime = useRef(0);
  const isMounted = useRef(true);
  const isLoading = walletLoading || authLoading || isVerifying || asyncLoading;
  const effectiveWalletAddress =
    walletAddress || localStorage.getItem("healthmint_wallet_address");
  const effectiveRole =
    roleState.role || localStorage.getItem("healthmint_user_role");
  const effectiveIsConnected =
    isWalletConnected ||
    localStorage.getItem("healthmint_wallet_connection") === "true";

  // Track navigation to detect loops
  useEffect(() => {
    if (location.pathname) {
      trackNavigation(location.pathname);
    }
  }, [location.pathname]);

  // Cleanup
  useEffect(() => {
    // Log initialization
    hipaaComplianceService
      .createAuditLog("AUTH_SYNC_INITIALIZED", {
        timestamp: new Date().toISOString(),
        userId: effectiveWalletAddress || "anonymous",
        componentId,
      })
      .catch((err) =>
        console.error("Failed to log auth sync initialization:", err)
      );

    return () => {
      isMounted.current = false;
      resetVerificationAttempts();
      removeError?.(componentId);

      // Log cleanup
      hipaaComplianceService
        .createAuditLog("AUTH_SYNC_CLEANUP", {
          timestamp: new Date().toISOString(),
          userId: effectiveWalletAddress || "anonymous",
          componentId,
        })
        .catch((err) => console.error("Failed to log auth sync cleanup:", err));
    };
  }, [componentId, effectiveWalletAddress, removeError]);

  // Primary auth verification function with loop prevention and HIPAA compliance
  const syncAuthState = useCallback(
    async (options = {}) => {
      const {
        force = false,
        redirectOnFailure = true,
        maxAttempts = 3,
      } = options;

      // Skip if logout is in progress
      if (isLogoutInProgress()) {
        setStatus("logout");
        if (redirectOnFailure) navigateTo("/login", { replace: true });
        return { success: false, reason: "logout-in-progress" };
      }

      // Skip if another verification is currently running or too many attempts
      if (verificationInProgress.current && !force) {
        return { success: false, reason: "verification-in-progress" };
      }

      if (authVerificationCount.current >= maxAttempts) {
        setError("Too many authentication attempts");
        setStatus("error");

        if (redirectOnFailure) {
          hipaaComplianceService
            .createAuditLog("AUTH_TOO_MANY_ATTEMPTS", {
              timestamp: new Date().toISOString(),
              componentId,
              attemptCount: authVerificationCount.current,
            })
            .catch((err) =>
              console.error("Failed to log too many auth attempts:", err)
            );

          navigateTo("/login", { replace: true });
        }

        return { success: false, reason: "too-many-attempts" };
      }

      // Check for loop using the trackVerificationAttempt utility
      if (trackVerificationAttempt(location.pathname)) {
        console.warn("Auth verification loop detected, breaking cycle");
        setStatus("loop-detected");

        if (redirectOnFailure) navigateTo("/login", { replace: true });
        return { success: false, reason: "loop-detected" };
      }

      // Use the async operation handler to perform verification with HIPAA logging
      return await execute(async () => {
        verificationInProgress.current = true;
        authVerificationCount.current++;
        lastVerificationTime.current = Date.now();

        if (isMounted.current) {
          setIsVerifying(true);
          setError(null);
          setStatus("verifying");
        }

        try {
          // Log verification attempt
          await hipaaComplianceService
            .createAuditLog("AUTH_VERIFICATION_ATTEMPT", {
              timestamp: new Date().toISOString(),
              userId: effectiveWalletAddress || "anonymous",
              attemptCount: authVerificationCount.current,
              componentId,
            })
            .catch((err) =>
              console.error("Error logging auth verification attempt:", err)
            );

          // Perform auth verification with timeout
          const authResult = await Promise.race([
            verifyAuth(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Auth verification timeout")),
                5000
              )
            ),
          ]);

          // If we didn't get a result, or auth failed
          if (!authResult || authResult.error) {
            throw new Error(
              authResult?.error?.message || "Authentication verification failed"
            );
          }

          // Check for wallet connection
          if (!effectiveWalletAddress || !effectiveIsConnected) {
            if (redirectOnFailure) navigateTo("/login", { replace: true });
            setStatus("no-wallet");
            return { success: false, reason: "no-wallet-connection" };
          }

          // Check user registration status
          if (isNewUser) {
            if (redirectOnFailure) navigateTo("/register", { replace: true });
            setStatus("new-user");
            return { success: false, reason: "new-user" };
          }

          // Check role selection
          if (!effectiveRole) {
            if (redirectOnFailure)
              navigateTo("/select-role", { replace: true });
            setStatus("no-role");
            return { success: false, reason: "no-role" };
          }

          // Everything is OK
          if (isMounted.current) {
            setStatus("authenticated");
            setLastVerified(new Date());
          }

          // Ensure role is set in Redux
          if (effectiveRole && !roleState.role) {
            dispatch(setRole(effectiveRole));
          }

          // Update user profile with wallet address if needed
          if (effectiveWalletAddress && !walletState.address) {
            dispatch(updateUserProfile({ address: effectiveWalletAddress }));
          }

          // Log successful verification
          await hipaaComplianceService
            .createAuditLog("AUTH_VERIFICATION_SUCCESS", {
              timestamp: new Date().toISOString(),
              userId: effectiveWalletAddress,
              role: effectiveRole,
              componentId,
            })
            .catch((err) =>
              console.error("Error logging auth verification success:", err)
            );

          return { success: true };
        } catch (err) {
          console.error("Auth verification error:", err);

          if (isMounted.current) {
            setError(err.message || "Authentication failed");
            setStatus("error");
            addError?.(componentId, err, {
              operation: "syncAuthState",
              context: "authentication",
              attemptCount: authVerificationCount.current,
            });
          }

          // Log verification failure
          await hipaaComplianceService
            .createAuditLog("AUTH_VERIFICATION_FAILURE", {
              timestamp: new Date().toISOString(),
              userId: effectiveWalletAddress || "anonymous",
              error: err.message || "Unknown error",
              componentId,
            })
            .catch((logErr) =>
              console.error("Error logging auth verification failure:", logErr)
            );

          if (redirectOnFailure) {
            dispatch(
              addNotification({
                type: "error",
                message: "Authentication error. Redirecting to login...",
                duration: 5000,
              })
            );
            navigateTo("/login", { replace: true });
          }

          return { success: false, error: err, reason: "verification-error" };
        } finally {
          verificationInProgress.current = false;

          if (isMounted.current) {
            setIsVerifying(false);
          }
        }
      });
    },
    [
      dispatch,
      navigateTo,
      verifyAuth,
      isNewUser,
      roleState.role,
      walletState.address,
      effectiveWalletAddress,
      effectiveIsConnected,
      effectiveRole,
      location.pathname,
      execute,
      addError,
      componentId,
    ]
  );

  // Utility to check redirect path based on current auth state
  const getRedirectPath = useCallback(() => {
    if (!effectiveIsConnected || !effectiveWalletAddress) {
      return "/login";
    }

    if (isNewUser) {
      return "/register";
    }

    if (!effectiveRole) {
      return "/select-role";
    }

    return "/dashboard";
  }, [effectiveIsConnected, effectiveWalletAddress, effectiveRole, isNewUser]);

  // Force a redirect based on current auth state
  const redirectToProperRoute = useCallback(() => {
    const path = getRedirectPath();

    hipaaComplianceService
      .createAuditLog("AUTH_REDIRECT", {
        timestamp: new Date().toISOString(),
        userId: effectiveWalletAddress || "anonymous",
        targetPath: path,
        currentPath: location.pathname,
        componentId,
      })
      .catch((err) => console.error("Error logging auth redirect:", err));

    navigateTo(path, { replace: true });
    return path;
  }, [
    getRedirectPath,
    navigateTo,
    effectiveWalletAddress,
    location.pathname,
    componentId,
  ]);

  // Force auth check on component mount
  useEffect(() => {
    // Only do the initial check once
    const initialCheckTimeout = setTimeout(() => {
      if (status === "idle" && !isVerifying && !isLoading) {
        syncAuthState({ redirectOnFailure: false, maxAttempts: 1 }).catch(
          (err) => console.error("Initial auth check failed:", err)
        );
      }
    }, 500);

    return () => clearTimeout(initialCheckTimeout);
  }, [status, isVerifying, isLoading, syncAuthState]);

  return {
    // State
    isVerifying,
    lastVerified,
    status,
    error,
    isLoading,

    // Derived state
    isAuthenticated,
    isRegistrationComplete,
    isWalletConnected: effectiveIsConnected,
    walletAddress: effectiveWalletAddress,
    userRole: effectiveRole,
    userIdentity,

    // Methods
    syncAuthState,
    getRedirectPath,
    redirectToProperRoute,
    clearError: () => {
      setError(null);
      removeError?.(componentId);
    },

    // Extra info
    verificationCount: authVerificationCount.current,
    componentId,
  };
};

export default useSynchronizedAuth;
