/**
 * Auth Loop Prevention Utilities
 * - Detects verification loops
 * - Handles secure logout
 * - Ensures state cleanup and redirect
 */

let verificationAttempts = 0;
let lastVerifyTime = 0;
const MAX_ATTEMPTS = 5;
const LOOP_TIMEOUT = 6000;
let loopTimeoutId = null;

export const resetVerificationAttempts = () => {
  verificationAttempts = 0;
  lastVerifyTime = 0;
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId);
    loopTimeoutId = null;
  }
};

export const trackVerificationAttempt = () => {
  verificationAttempts++;
  const now = Date.now();

  if (verificationAttempts > MAX_ATTEMPTS && now - lastVerifyTime < 1000) {
    console.warn(
      `Auth verification loop detected (${verificationAttempts} attempts)`
    );
    return true;
  }

  lastVerifyTime = now;
  return false;
};

export const setupLoopDetection = (onLoopDetected) => {
  if (loopTimeoutId) clearTimeout(loopTimeoutId);

  loopTimeoutId = setTimeout(() => {
    if (verificationAttempts > MAX_ATTEMPTS) {
      console.error("🚨 EMERGENCY: Breaking auth loop after timeout", {
        verificationAttempts,
        lastVerifyTime,
      });
      if (typeof onLoopDetected === "function") onLoopDetected();
      forceRedirectToLogin();
    }
  }, LOOP_TIMEOUT);

  return () => {
    if (loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      loopTimeoutId = null;
    }
  };
};

export const forceRedirectToLogin = () => {
  clearAuthStorage();
  window.location.replace("/login");
};

export const clearAuthStorage = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("force_wallet_reconnect", "true");
  } catch (err) {
    console.error("Error clearing auth storage:", err);
  }
};

export const performLogout = async ({
  redirectToLogin = true,
  clearLocalStorage = true,
  clearSessionStorage = true,
  useHardRedirect = false,
  onComplete = null,
} = {}) => {
  try {
    sessionStorage.setItem("logout_in_progress", "true");
    sessionStorage.setItem("force_wallet_reconnect", "true");

    if (clearLocalStorage) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("healthmint_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    if (clearSessionStorage) {
      const logoutFlag = sessionStorage.getItem("logout_in_progress");
      const forceReconnect = sessionStorage.getItem("force_wallet_reconnect");

      sessionStorage.clear();

      if (logoutFlag) sessionStorage.setItem("logout_in_progress", logoutFlag);
      if (forceReconnect)
        sessionStorage.setItem("force_wallet_reconnect", forceReconnect);
    }

    if (redirectToLogin) {
      if (useHardRedirect) {
        setTimeout(() => window.location.replace("/login"), 50);
      } else {
        window.location.href = "/login";
      }
    }

    if (typeof onComplete === "function") onComplete();
    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);
    sessionStorage.setItem("logout_failed", "true");

    if (redirectToLogin && useHardRedirect) window.location.replace("/login");
    if (typeof onComplete === "function") onComplete();

    return { success: false, error };
  }
};

export const isLogoutInProgress = () => {
  return sessionStorage.getItem("logout_in_progress") === "true";
};

export const clearLogoutFlag = () => {
  sessionStorage.removeItem("logout_in_progress");
  sessionStorage.removeItem("logout_failed");
};

export const preventAuthLoop = (targetPath, currentPath, authState = {}) => {
  if (isLogoutInProgress()) {
    console.warn("Logout in progress - forcing redirect to login page");
    window.location.replace("/login");
    return false;
  }

  if (
    currentPath === "/login" &&
    targetPath === "/select-role" &&
    !authState.isAuthenticated &&
    !localStorage.getItem("healthmint_auth_token")
  ) {
    console.warn("Prevented auth loop: login → select-role without auth");
    return false;
  }

  const isLoop =
    (currentPath === "/select-role" && targetPath === "/dashboard") ||
    (currentPath === "/dashboard" && targetPath === "/select-role");

  if (isLoop) {
    const loopCount = parseInt(
      sessionStorage.getItem("auth_loop_count") || "0"
    );
    sessionStorage.setItem("auth_loop_count", (loopCount + 1).toString());

    if (loopCount >= 2) {
      console.warn("Detected auth loop: forcing redirect to login");
      performLogout({ redirectToLogin: true, useHardRedirect: true });
      return false;
    }
  } else {
    sessionStorage.removeItem("auth_loop_count");
  }

  return true;
};

export const cleanupAfterLogin = () => {
  sessionStorage.removeItem("force_wallet_reconnect");
  sessionStorage.removeItem("logout_in_progress");
  sessionStorage.removeItem("auth_loop_count");
  sessionStorage.removeItem("auth_verification_override");
};

export const isAuthStateCorrupt = () => {
  const hasWalletConnection =
    localStorage.getItem("healthmint_wallet_connection") === "true";
  const hasWalletAddress = !!localStorage.getItem("healthmint_wallet_address");
  const hasRole = !!localStorage.getItem("healthmint_user_role");
  const hasAuthToken = !!localStorage.getItem("healthmint_auth_token");

  return (
    hasWalletConnection && (!hasWalletAddress || (!hasRole && hasAuthToken))
  );
};

export const isUserLikelyLoggedOut = () => {
  return (
    !localStorage.getItem("healthmint_wallet_address") &&
    localStorage.getItem("healthmint_wallet_connection") !== "true" &&
    !localStorage.getItem("healthmint_user_role") &&
    !localStorage.getItem("healthmint_auth_token")
  );
};

const authLoopPreventionUtils = {
  resetVerificationAttempts,
  trackVerificationAttempt,
  setupLoopDetection,
  forceRedirectToLogin,
  clearAuthStorage,
  performLogout,
  isLogoutInProgress,
  clearLogoutFlag,
  preventAuthLoop,
  cleanupAfterLogin,
  isAuthStateCorrupt,
  isUserLikelyLoggedOut,
};

export default authLoopPreventionUtils;