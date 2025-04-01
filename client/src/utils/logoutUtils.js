// client/src/utils/logoutUtils.js
import { store } from "../redux/store.js";
import authService from "../services/authService.js";
import { clearRole } from "../redux/slices/roleSlice.js";
import { resetState as resetUserState } from "../redux/slices/userSlice.js";
import { clearWalletConnection } from "../redux/slices/walletSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * Handles complete logout flow with proper redirect to login page
 *
 * @param {Object} options - Options for logout
 * @param {boolean} options.showNotification - Whether to show a notification
 * @param {Function} options.onLogoutStart - Callback before logout starts
 * @param {Function} options.onLogoutComplete - Callback after logout completes
 * @returns {Promise<boolean>} Whether logout was successful
 */
export const handleLogout = async (options = {}) => {
  const { showNotification = true, onLogoutStart, onLogoutComplete } = options;

  try {
    // Execute pre-logout callback if provided
    if (onLogoutStart && typeof onLogoutStart === "function") {
      onLogoutStart();
    }

    // Create HIPAA-compliant audit log for logout - with proper error handling
    try {
      await hipaaComplianceService.createAuditLog("USER_LOGOUT", {
        action: "LOGOUT",
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Failed to log logout action:", auditError);
      // Continue with logout even if audit logging fails
    }

    // Clear auth service state
    try {
      await authService.logout();
    } catch (authError) {
      console.error("Auth service logout error:", authError);
      // Continue with logout process even if auth service fails
    }

    // Clear Redux state - using try/catch to ensure one failure doesn't break the chain
    try {
      store.dispatch(clearRole());
      store.dispatch(resetUserState());
      store.dispatch(clearWalletConnection());
    } catch (reduxError) {
      console.error("Redux state clearing error:", reduxError);
      // Continue with logout process
    }

    // Clear localStorage items - CRITICAL for preventing redirect to role selection
    try {
      // These are the critical items that must be removed
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_is_new_user");
      localStorage.removeItem("healthmint_user_role"); // Most important for role selection issue
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_wallet_address");
    } catch (storageError) {
      console.error("Local storage clearing error:", storageError);
    }

    // Clear session storage items
    try {
      sessionStorage.removeItem("auth_verification_override");
      sessionStorage.removeItem("bypass_registration_check");
      sessionStorage.removeItem("bypass_registration_until");
    } catch (sessionError) {
      console.error("Session storage clearing error:", sessionError);
    }

    // Show notification if requested
    if (showNotification) {
      try {
        store.dispatch(
          addNotification({
            type: "info",
            message: "You have been successfully logged out",
            duration: 3000,
          })
        );
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }
    }

    // Execute post-logout callback if provided
    if (onLogoutComplete && typeof onLogoutComplete === "function") {
      try {
        onLogoutComplete(true);
      } catch (callbackError) {
        console.error("Logout callback error:", callbackError);
      }
    }

    // Redirect to login page - CRITICAL STEP
    window.location.replace("/login");
    return true;
  } catch (error) {
    console.error("Logout failed:", error);

    // Show error notification
    if (showNotification) {
      try {
        store.dispatch(
          addNotification({
            type: "error",
            message: "Logout failed. Please try again.",
            duration: 5000,
          })
        );
      } catch (notifyError) {
        console.error("Error notification failed:", notifyError);
      }
    }

    // Execute post-logout callback with error status
    if (onLogoutComplete && typeof onLogoutComplete === "function") {
      try {
        onLogoutComplete(false, error);
      } catch (callbackError) {
        console.error("Error callback failed:", callbackError);
      }
    }

    // Even on error, try to redirect to login page
    try {
      // Still try to clear role to prevent role selection redirect
      localStorage.removeItem("healthmint_user_role");
      window.location.replace("/login");
    } catch (redirectError) {
      console.error("Redirect error:", redirectError);
    }

    return false;
  }
};

/**
 * Creates a force logout function that can be used in case of auth errors
 *
 * @param {Object} options - Options for forced logout
 * @returns {Function} Force logout function
 */
export const createForceLogout = (options = {}) => {
  return async () => {
    try {
      console.log("Performing forced logout...");

      // Clear all auth-related state without making API calls
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_is_new_user");
      localStorage.removeItem("healthmint_user_role"); // Critical for role selection issue
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_wallet_address");

      // Clear Redux state - wrapped in try/catch for resilience
      try {
        store.dispatch(clearRole());
        store.dispatch(resetUserState());
        store.dispatch(clearWalletConnection());
      } catch (storeError) {
        console.error("Redux state clearing error:", storeError);
      }

      // Show notification if requested
      if (options.showNotification !== false) {
        try {
          store.dispatch(
            addNotification({
              type: "warning",
              message:
                options.message ||
                "Your session has expired. Please log in again.",
              duration: 5000,
            })
          );
        } catch (notifyError) {
          console.error("Notification error:", notifyError);
        }
      }

      // Redirect to login page - most important step
      window.location.replace("/login");
      return true;
    } catch (error) {
      console.error("Force logout failed:", error);

      // Last resort - try to redirect anyway
      try {
        localStorage.removeItem("healthmint_user_role");
        window.location.replace("/login");
      } catch (finalError) {
        console.error("Final redirect failed:", finalError);
      }

      return false;
    }
  };
};

export default {
  handleLogout,
  createForceLogout,
};
