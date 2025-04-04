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
export const performLogout = async ({
  redirectToLogin = true,
  clearLocalStorage = true,
  clearSessionStorage = true,
  useHardRedirect = false,
  onComplete = null,
} = {}) => {
  try {
    // 1. Set the forced reconnect flag first - CRITICAL for correct auth flow
    sessionStorage.setItem("force_wallet_reconnect", "true");
    sessionStorage.setItem("logout_in_progress", "true");

    // 2. Clear any bypass flags that interfere with routing
    sessionStorage.removeItem("bypass_route_protection");
    sessionStorage.removeItem("temp_selected_role");
    sessionStorage.removeItem("bypass_role_check");
    sessionStorage.removeItem("auth_verification_override");

    // 3. Explicitly clear authentication and role-related state
    if (clearLocalStorage) {
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");
      localStorage.removeItem("healthmint_is_new_user");
      localStorage.removeItem("healthmint_wallet_state");
    }

    // 4. Apply additional session cleanup
    if (clearSessionStorage) {
      // Only clear logout-related flags, keep other session data
      const forceReconnect = sessionStorage.getItem("force_wallet_reconnect");
      const logoutInProgress = sessionStorage.getItem("logout_in_progress");

      // sessionStorage.clear(); // Don't use clear() as it's too aggressive

      // Restore critical flags
      sessionStorage.setItem("force_wallet_reconnect", forceReconnect);
      sessionStorage.setItem("logout_in_progress", logoutInProgress);
    }

    // 5. Redirect to login page if requested
    if (redirectToLogin) {
      if (useHardRedirect) {
        // Hard redirect to ensure clean state
        window.location.href = "/login";
      } else {
        // Using replace to prevent back-button issues
        window.history.replaceState({}, "", "/login");

        // Force a page reload to clear React component state
        window.location.reload();
      }
    }

    // 6. Clean up flags after a delay to ensure they're used by the login page
    setTimeout(() => {
      sessionStorage.removeItem("logout_in_progress");
    }, 1000);

    // 7. Call the completion callback if provided
    if (onComplete && typeof onComplete === "function") {
      onComplete();
    }

    return true;
  } catch (error) {
    console.error("Logout error in authLoopPrevention:", error);

    // Force redirect to login as emergency fallback
    window.location.replace("/login");
    return false;
  }
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
