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

    // Create HIPAA-compliant audit log for logout
    await hipaaComplianceService
      .createAuditLog("USER_LOGOUT", {
        action: "LOGOUT",
        timestamp: new Date().toISOString(),
      })
      .catch((err) => console.error("Failed to log logout action:", err));

    // Clear auth service state
    await authService.logout();

    // Clear Redux state
    store.dispatch(clearRole());
    store.dispatch(resetUserState());
    store.dispatch(clearWalletConnection());

    // Clear additional localStorage items that might cause role persistence
    localStorage.removeItem("healthmint_user_role");
    localStorage.removeItem("healthmint_wallet_connection");
    localStorage.removeItem("healthmint_wallet_address");

    // Clear any session storage items
    sessionStorage.removeItem("auth_verification_override");
    sessionStorage.removeItem("bypass_registration_check");
    sessionStorage.removeItem("bypass_registration_until");

    // Show notification if requested
    if (showNotification) {
      store.dispatch(
        addNotification({
          type: "info",
          message: "You have been successfully logged out",
          duration: 3000,
        })
      );
    }

    // Execute post-logout callback if provided
    if (onLogoutComplete && typeof onLogoutComplete === "function") {
      onLogoutComplete(true);
    }

    // Redirect to login page
    window.location.replace("/login");
    return true;
  } catch (error) {
    console.error("Logout failed:", error);

    // Show error notification
    if (showNotification) {
      store.dispatch(
        addNotification({
          type: "error",
          message: "Logout failed. Please try again.",
          duration: 5000,
        })
      );
    }

    // Execute post-logout callback with error status
    if (onLogoutComplete && typeof onLogoutComplete === "function") {
      onLogoutComplete(false, error);
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
    // Clear all auth-related state without making API calls
    localStorage.removeItem("healthmint_auth_token");
    localStorage.removeItem("healthmint_refresh_token");
    localStorage.removeItem("healthmint_token_expiry");
    localStorage.removeItem("healthmint_user_profile");
    localStorage.removeItem("healthmint_is_new_user");
    localStorage.removeItem("healthmint_user_role");
    localStorage.removeItem("healthmint_wallet_connection");
    localStorage.removeItem("healthmint_wallet_address");

    // Clear Redux state
    store.dispatch(clearRole());
    store.dispatch(resetUserState());
    store.dispatch(clearWalletConnection());

    // Show notification if requested
    if (options.showNotification !== false) {
      store.dispatch(
        addNotification({
          type: "warning",
          message:
            options.message || "Your session has expired. Please log in again.",
          duration: 5000,
        })
      );
    }

    // Redirect to login page
    window.location.replace("/login");
  };
};

export default {
  handleLogout,
  createForceLogout,
};
