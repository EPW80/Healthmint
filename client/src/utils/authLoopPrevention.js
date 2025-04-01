// client/src/utils/authLoopPrevention.js
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
  // Clear all authentication-related localStorage
  localStorage.removeItem("healthmint_auth_token");
  localStorage.removeItem("healthmint_refresh_token");
  localStorage.removeItem("healthmint_token_expiry");
  localStorage.removeItem("healthmint_user_profile");
  localStorage.removeItem("healthmint_is_new_user");
  localStorage.removeItem("healthmint_user_role");
  localStorage.removeItem("healthmint_wallet_connection");
  localStorage.removeItem("healthmint_wallet_address");
  localStorage.removeItem("healthmint_wallet_state");
  localStorage.removeItem("healthmint_favorite_datasets");
  localStorage.removeItem("healthmint_consent_history");

  // Clear all authentication-related sessionStorage
  sessionStorage.removeItem("auth_verification_override");
  sessionStorage.removeItem("bypass_registration_check");
  sessionStorage.removeItem("bypass_registration_until");
  sessionStorage.removeItem("bypass_route_protection");
  sessionStorage.removeItem("bypass_role_check");
  sessionStorage.removeItem("temp_selected_role");
  
  // Set a flag to force wallet reconnect on next login
  sessionStorage.setItem("force_wallet_reconnect", "true");
};

/**
 * Complete logout process with reliable redirection to login
 * @param {Object} options - Optional settings
 * @returns {Promise<boolean>} - Whether logout was successful
 */
export const performLogout = async (options = {}) => {
  try {
    const {
      useHardRedirect = true,
      clearTimeout: shouldClearTimeout = true,
    } = options;
    
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

    // Add a small delay to ensure state clearing completes
    await new Promise(resolve => setTimeout(resolve, 50));

    // Redirect to login page
    if (useHardRedirect) {
      // Hard redirect to completely reset application state
      window.location.replace("/login");
    } else {
      // Use standard redirect
      window.location.href = "/login";
    }

    return true;
  } catch (error) {
    console.error("Error during logout:", error);

    // Fallback: force redirect even if there was an error
    forceRedirectToLogin();
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
  const hasWalletAddress = Boolean(localStorage.getItem("healthmint_wallet_address"));
  const hasWalletConnection = localStorage.getItem("healthmint_wallet_connection") === "true";
  const hasUserRole = Boolean(localStorage.getItem("healthmint_user_role"));
  const hasAuthToken = Boolean(localStorage.getItem("healthmint_auth_token"));
  
  // If all major auth items are missing, user is likely logged out
  return !hasWalletAddress && !hasWalletConnection && !hasUserRole && !hasAuthToken;
};

const authLoopPreventionUtils = {
  resetVerificationAttempts,
  trackVerificationAttempt,
  setupLoopDetection,
  forceRedirectToLogin,
  clearAuthStorage,
  performLogout,
  isUserLikelyLoggedOut
};

export default authLoopPreventionUtils;