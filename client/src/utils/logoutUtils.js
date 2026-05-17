// client/src/utils/logoutUtils.js
import { store } from "../redux/store.js";
import authService from "../services/authService.js";
import { clearRole } from "../redux/slices/roleSlice.js";
import { resetState as resetUserState } from "../redux/slices/userSlice.js";
import { clearWalletConnection } from "../redux/slices/walletSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

export const handleLogout = async (options = {}) => {
  const { showNotification = true, onLogoutStart, onLogoutComplete } = options;

  try {
    // Execute pre-logout callback if provided
    if (onLogoutStart && typeof onLogoutStart === "function") {
      onLogoutStart();
    }

    console.log("Performing complete logout...");

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

    try {
      localStorage.clear();
    } catch (clearError) {
      console.error("Error clearing localStorage:", clearError);
    }

    // Clear critical localStorage items individually as backup
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

    try {
      sessionStorage.clear();
    } catch (sessionClearError) {
      console.error("Error clearing sessionStorage:", sessionClearError);
    }

    // Clear session storage items individually as backup
    try {
      sessionStorage.removeItem("auth_verification_override");
      sessionStorage.removeItem("bypass_registration_check");
      sessionStorage.removeItem("bypass_registration_until");
      sessionStorage.removeItem("bypass_role_check");
      sessionStorage.removeItem("temp_selected_role");
    } catch (sessionError) {
      console.error("Session storage clearing error:", sessionError);
    }

    try {
      sessionStorage.setItem("force_wallet_reconnect", "true");
    } catch (flagError) {
      console.error("Error setting reconnect flag:", flagError);
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("Redirecting to login page...");
    window.location.href = "/login";

    // Fallback redirect in case the above doesn't trigger immediately
    setTimeout(() => {
      console.log("Fallback redirect triggered");
      window.location.replace("/login");
    }, 100);

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

    try {
      // Completely clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Still try to specifically clear role to prevent role selection redirect
      localStorage.removeItem("healthmint_user_role");

      // Force redirect to login
      window.location.href = "/login";
    } catch (redirectError) {
      console.error("Redirect error:", redirectError);

      // Absolute last resort
      window.location.href = "/login";
    }

    return false;
  }
};

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

      // clear session-related state without making API calls
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
