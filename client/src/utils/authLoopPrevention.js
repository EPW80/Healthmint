/**
 * This utility helps prevent authentication loops and ensures
 * proper logout functionality with direct redirection to login page.
 */

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
 * Complete logout process with reliable redirection to login
 * @param {Object} options - Optional settings
 * @param {Function} onStateClear - Callback to clear application state
 * @returns {Promise<boolean>} - Whether logout was successful
 */
export const performLogout = async (options = {}, onStateClear) => {
  try {
    const { useHardRedirect = true, clearTimeout: shouldClearTimeout = true } =
      options;

    console.log("Performing complete logout...");

    // Clear timeout to avoid interference
    if (shouldClearTimeout && loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      loopTimeoutId = null;
    }

    // Clear all authentication storage
    clearAuthStorage();

    // Reset verification counter
    resetVerificationAttempts();

    // Call the state clear callback if provided
    if (onStateClear && typeof onStateClear === "function") {
      try {
        onStateClear();
      } catch (e) {
        console.error("Error during state clearing:", e);
      }
    }

    // Double-check that the role is cleared
    try {
      localStorage.removeItem("healthmint_user_role");
    } catch (e) {
      console.error("Additional error removing role from localStorage:", e);
    }

    // Add a small delay to ensure state clearing completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Log the redirection
    console.log("Redirecting to login page after logout...");

    // Redirect to login page
    if (useHardRedirect) {
      window.location.href = "/login";
      // Fallback in case the above doesn't trigger immediately
      setTimeout(() => {
        console.log("Executing fallback redirect");
        window.location.replace("/login");
      }, 150);
    } else {
      window.location.href = "/login";
    }

    return true;
  } catch (error) {
    console.error("Error during logout:", error);

    // Fallback: force redirect even if there was an error
    try {
      console.log("Error during logout - executing emergency cleanup");
      localStorage.clear();
      sessionStorage.clear();
      localStorage.removeItem("healthmint_user_role");

      console.log("Emergency redirect to login page");
      forceRedirectToLogin();
    } catch (e) {
      console.error("Error in force redirect:", e);
      // Absolutely last resort
      window.location.href = "/login";
    }
    return false;
  }
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
