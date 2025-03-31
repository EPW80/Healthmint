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
  localStorage.removeItem("healthmint_auth_token");
  localStorage.removeItem("healthmint_refresh_token");
  localStorage.removeItem("healthmint_token_expiry");
  localStorage.removeItem("healthmint_user_profile");
  localStorage.removeItem("healthmint_is_new_user");
  localStorage.removeItem("healthmint_user_role");
  localStorage.removeItem("healthmint_wallet_connection");
  localStorage.removeItem("healthmint_wallet_address");

  // Clear session flags
  sessionStorage.removeItem("auth_verification_override");
  sessionStorage.removeItem("bypass_registration_check");
  sessionStorage.removeItem("bypass_registration_until");

  // Redirect to login page
  window.location.href = "/login";
};

/**
 * Complete logout process with reliable redirection to login
 */
export const performLogout = async () => {
  try {
    // Clear timeout to avoid interference
    if (loopTimeoutId) {
      clearTimeout(loopTimeoutId);
      loopTimeoutId = null;
    }

    // First, clear all role-related data
    localStorage.removeItem("healthmint_user_role");

    // Clear session flags that might interfere with login flow
    sessionStorage.removeItem("auth_verification_override");
    sessionStorage.removeItem("bypass_registration_check");
    sessionStorage.removeItem("bypass_registration_until");

    // Clear other auth data
    localStorage.removeItem("healthmint_auth_token");
    localStorage.removeItem("healthmint_refresh_token");
    localStorage.removeItem("healthmint_token_expiry");
    localStorage.removeItem("healthmint_user_profile");
    localStorage.removeItem("healthmint_is_new_user");
    localStorage.removeItem("healthmint_wallet_connection");
    localStorage.removeItem("healthmint_wallet_address");

    // Reset verification counter
    resetVerificationAttempts();

    // Hard redirect to login page to avoid router issues
    window.location.href = "/login";

    return true;
  } catch (error) {
    console.error("Error during logout:", error);

    // Fallback: force redirect even if there was an error
    forceRedirectToLogin();
    return false;
  }
};

export default {
  resetVerificationAttempts,
  trackVerificationAttempt,
  setupLoopDetection,
  forceRedirectToLogin,
  performLogout,
};
