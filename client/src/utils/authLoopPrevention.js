/**
 * Tracks authentication verification attempts to prevent infinite loops
 */
let verificationAttempts = 0;
let lastVerifyTime = 0;
const MAX_ATTEMPTS = 5;
const LOOP_TIMEOUT = 6000; // 6 seconds
let loopTimeoutId = null;

/**
 * Reset the verification attempts counter
 */
export const resetVerificationAttempts = () => {
  verificationAttempts = 0;
  lastVerifyTime = 0;
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId);
    loopTimeoutId = null;
  }
};

/**
 * Track verification attempt and check for potential loops
 * @returns {boolean} true if loop detected, false otherwise
 */
export const trackVerificationAttempt = () => {
  verificationAttempts++;
  const now = Date.now();

  // If too many attempts in a short time, likely in a loop
  if (verificationAttempts > MAX_ATTEMPTS && now - lastVerifyTime < 1000) {
    console.warn(
      `Auth verification loop detected (${verificationAttempts} attempts)`
    );
    return true;
  }

  lastVerifyTime = now;
  return false;
};

/**
 * Set up loop detection timeout
 * @param {Function} onLoopDetected - Callback when loop is detected
 */
export const setupLoopDetection = (onLoopDetected) => {
  // Clear any existing timeout
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId);
  }

  // Set new timeout
  loopTimeoutId = setTimeout(() => {
    if (verificationAttempts > MAX_ATTEMPTS) {
      console.error("🚨 EMERGENCY: Breaking auth loop after timeout", {
        verificationAttempts,
        lastVerifyTime,
      });

      if (onLoopDetected && typeof onLoopDetected === "function") {
        onLoopDetected();
      }

      // Force redirect to login to break the loop
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

/**
 * Force redirect to login page, bypassing router
 * This is a fallback for breaking loops
 */
export const forceRedirectToLogin = () => {
  // Clear all auth-related localStorage and sessionStorage
  clearAuthStorage();

  // Force a clean redirect to login page
  window.location.replace("/login");
};

/**
 * Clears all authentication-related storage
 */
export const clearAuthStorage = () => {
  console.log("Clearing all authentication storage...");

  // Clear all localStorage completely first
  try {
    localStorage.clear();
    console.log("localStorage cleared successfully");
  } catch (clearError) {
    console.error("Error during localStorage.clear():", clearError);
  }

  // Then ensure specific critical items are removed individually as backup
  try {
    // Auth tokens
    localStorage.removeItem("healthmint_auth_token");
    localStorage.removeItem("healthmint_refresh_token");
    localStorage.removeItem("healthmint_token_expiry");

    // User data
    localStorage.removeItem("healthmint_user_profile");
    localStorage.removeItem("healthmint_is_new_user");

    // Critical for avoiding role selector redirect
    localStorage.removeItem("healthmint_user_role");

    // Wallet connection
    localStorage.removeItem("healthmint_wallet_connection");
    localStorage.removeItem("healthmint_wallet_address");
    localStorage.removeItem("healthmint_wallet_state");

    // Additional data
    localStorage.removeItem("healthmint_favorite_datasets");
    localStorage.removeItem("healthmint_consent_history");
    localStorage.removeItem("healthmint_cached_data");
    localStorage.removeItem("use_mock_data");

    console.log("Critical localStorage items individually removed");
  } catch (storageError) {
    console.error("Error removing specific localStorage items:", storageError);
  }

  // Clear all sessionStorage completely
  try {
    sessionStorage.clear();
    console.log("sessionStorage cleared successfully");
  } catch (clearError) {
    console.error("Error during sessionStorage.clear():", clearError);
  }

  // Ensure critical session items are removed individually as backup
  try {
    sessionStorage.removeItem("auth_verification_override");
    sessionStorage.removeItem("bypass_registration_check");
    sessionStorage.removeItem("bypass_registration_until");
    sessionStorage.removeItem("bypass_route_protection");
    sessionStorage.removeItem("bypass_role_check");
    sessionStorage.removeItem("temp_selected_role");
    console.log("Critical sessionStorage items individually removed");
  } catch (sessionError) {
    console.error(
      "Error removing specific sessionStorage items:",
      sessionError
    );
  }

  // Set a flag to force wallet reconnect on next login
  try {
    sessionStorage.setItem("force_wallet_reconnect", "true");
    console.log("Force wallet reconnect flag set");
  } catch (flagError) {
    console.error("Error setting force_wallet_reconnect flag:", flagError);
  }
};

/**
 * This utility provides functions to prevent authentication and routing loops
 * by properly handling application state during authentication flows
 */

/**
 * Performs a complete logout with enhanced cleanup to prevent auth loops
 *
 * @param {Object} options Configuration options
 * @param {boolean} options.redirectToLogin Whether to redirect to the login page after logout
 * @param {boolean} options.clearLocalStorage Whether to clear localStorage
 * @param {boolean} options.clearSessionStorage Whether to clear sessionStorage
 * @param {boolean} options.useHardRedirect Whether to use hard page reload for redirect
 * @param {Function} options.onComplete Callback function after logout is complete
 * @returns {Promise<boolean>} Promise resolving to true if logout was successful
 */
/**
 * Enhanced logout function that properly handles state cleanup and redirection
 *
 * @param {Object} options Configuration options for the logout process
 * @param {boolean} options.redirectToLogin Whether to redirect to login page after logout
 * @param {boolean} options.clearLocalStorage Whether to clear localStorage
 * @param {boolean} options.clearSessionStorage Whether to clear sessionStorage
 * @param {boolean} options.useHardRedirect Whether to use window.location.replace for redirect
 * @param {Function} options.onComplete Callback function to call after logout completes
 * @returns {Promise<void>}
 */
export const performLogout = async ({
  redirectToLogin = true,
  clearLocalStorage = true,
  clearSessionStorage = true,
  useHardRedirect = false,
  onComplete = null,
} = {}) => {
  console.log("Performing complete logout...");

  try {
    // Set logout flag to prevent rendering the role selector on redirect
    sessionStorage.setItem("logout_in_progress", "true");

    // Force wallet reconnect on next login
    sessionStorage.setItem("force_wallet_reconnect", "true");

    // Clear role and wallet data
    if (clearLocalStorage) {
      // Key wallet data
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      // Key role data
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_is_new_user");

      // Additional cleanup
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_last_login");

      // Clean any other app-specific keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("healthmint_")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    // Clear session data
    if (clearSessionStorage) {
      // Clear any auth-related session flags
      sessionStorage.removeItem("temp_selected_role");
      sessionStorage.removeItem("bypass_route_protection");
      sessionStorage.removeItem("auth_verification_override");
      sessionStorage.removeItem("bypass_role_check");

      // Keep the logout flags
      const logoutFlag = sessionStorage.getItem("logout_in_progress");
      const forceReconnect = sessionStorage.getItem("force_wallet_reconnect");

      // Clear all session storage
      sessionStorage.clear();

      // Restore logout flags
      if (logoutFlag) sessionStorage.setItem("logout_in_progress", logoutFlag);
      if (forceReconnect)
        sessionStorage.setItem("force_wallet_reconnect", forceReconnect);
    }

    // Redirect to login page after state cleanup
    if (redirectToLogin) {
      if (useHardRedirect) {
        console.log("Performing hard redirect to login page");
        // Use a small delay to ensure flags are properly set
        setTimeout(() => {
          window.location.replace("/login");
        }, 50);
      } else {
        console.log("Navigating to login page via router");
        // This is expected to be handled by the calling component
        // using React Router's navigate function
      }
    }

    // Call onComplete callback if provided
    if (typeof onComplete === "function") {
      onComplete();
    }
  } catch (error) {
    console.error("Error during logout process:", error);

    // Set logout-failed flag to help with debugging
    sessionStorage.setItem("logout_failed", "true");

    // Even on error, try to redirect to login page
    if (redirectToLogin && useHardRedirect) {
      window.location.replace("/login");
    }

    throw error;
  }
};

/**
 * Utility function to check if a logout is in progress
 *
 * @returns {boolean} Whether a logout is currently in progress
 */
export const isLogoutInProgress = () => {
  return sessionStorage.getItem("logout_in_progress") === "true";
};

/**
 * Clears the logout in progress flag
 */
export const clearLogoutFlag = () => {
  sessionStorage.removeItem("logout_in_progress");
  sessionStorage.removeItem("logout_failed");
};

/**
 * Checks if a navigation operation would cause an auth loop
 * and performs corrective action if needed
 *
 * @param {string} targetPath The path being navigated to
 * @param {string} currentPath The current path
 * @param {Object} authState Current auth state for context
 * @returns {boolean} True if navigation should proceed, false if it was blocked
 */
export const preventAuthLoop = (targetPath, currentPath, authState = {}) => {
  // If logout is in progress, always force redirect to login
  if (sessionStorage.getItem("logout_in_progress") === "true") {
    console.warn("Logout in progress - forcing redirect to login page");
    window.location.replace("/login");
    return false;
  }

  // If we're already on the login page and trying to go to role selection
  // without being properly authenticated, prevent the loop
  if (
    currentPath === "/login" &&
    targetPath === "/select-role" &&
    !authState.isAuthenticated &&
    !localStorage.getItem("healthmint_auth_token")
  ) {
    console.warn("Prevented auth loop: login → select-role without auth");
    return false;
  }

  // If we detect a loop between role selection and dashboard
  if (
    (currentPath === "/select-role" && targetPath === "/dashboard") ||
    (currentPath === "/dashboard" && targetPath === "/select-role")
  ) {
    // Check how many times we've gone back and forth
    const loopCount = parseInt(
      sessionStorage.getItem("auth_loop_count") || "0"
    );
    sessionStorage.setItem("auth_loop_count", (loopCount + 1).toString());

    // If we've looped too many times, break the cycle
    if (loopCount >= 2) {
      console.warn("Detected auth loop: forcing redirect to login");
      performLogout({ redirectToLogin: true, useHardRedirect: true });
      return false;
    }
  } else {
    // Reset the counter when navigating to other routes
    sessionStorage.removeItem("auth_loop_count");
  }

  return true;
};

/**
 * Cleans up auth state after successful login to prevent future loops
 */
export const cleanupAfterLogin = () => {
  sessionStorage.removeItem("force_wallet_reconnect");
  sessionStorage.removeItem("logout_in_progress");
  sessionStorage.removeItem("auth_loop_count");
  sessionStorage.removeItem("auth_verification_override");
};

/**
 * Checks if the auth state might be stuck or invalid
 * @returns {boolean} True if auth state appears corrupt
 */
export const isAuthStateCorrupt = () => {
  const hasWalletConnection =
    localStorage.getItem("healthmint_wallet_connection") === "true";
  const hasWalletAddress = !!localStorage.getItem("healthmint_wallet_address");
  const hasRole = !!localStorage.getItem("healthmint_user_role");
  const hasAuthToken = !!localStorage.getItem("healthmint_auth_token");

  // Detect inconsistent state: claims to be connected but missing critical data
  if (
    hasWalletConnection &&
    (!hasWalletAddress || (!hasRole && hasAuthToken))
  ) {
    return true;
  }

  return false;
};

/**
 * Check if user is likely to be logged out based on state
 * This helps prevent authentication loops by detecting missing auth state
 *
 * @returns {boolean} - Whether user appears to be logged out
 */
export const isUserLikelyLoggedOut = () => {
  // Check for critical auth items
  const hasWalletAddress = Boolean(
    localStorage.getItem("healthmint_wallet_address")
  );
  const hasWalletConnection =
    localStorage.getItem("healthmint_wallet_connection") === "true";
  const hasUserRole = Boolean(localStorage.getItem("healthmint_user_role"));
  const hasAuthToken = Boolean(localStorage.getItem("healthmint_auth_token"));

  // If all major auth items are missing, user is likely logged out
  return (
    !hasWalletAddress && !hasWalletConnection && !hasUserRole && !hasAuthToken
  );
};

const authLoopPreventionUtils = {
  resetVerificationAttempts,
  trackVerificationAttempt,
  setupLoopDetection,
  forceRedirectToLogin,
  clearAuthStorage,
  performLogout,
  isUserLikelyLoggedOut,
};

export default authLoopPreventionUtils;
