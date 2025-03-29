// client/src/utils/authUtils.js
/**
 * Authentication and Registration Utilities
 *
 * Centralized utilities for managing user authentication, registration status,
 * and ensuring consistent auth state throughout the application.
 *
 * HIPAA Compliance Note: These functions maintain user authentication status
 * which is important for access control and audit trail requirements under
 * HIPAA Security Rule provisions for access management.
 */

/**
 * Check if a user is a new user based on localStorage and profile state
 * @param {string} address - User wallet address
 * @returns {boolean} Whether the user is new
 */
export const isNewUser = (address) => {
  // Default to true if we can't determine
  if (!address) return true;

  try {
    // Check explicit flag first
    const isNewUserFlag = localStorage.getItem("healthmint_is_new_user");
    if (isNewUserFlag === "false") return false;

    // If flag is explicitly true, double-check profile
    if (isNewUserFlag === "true") {
      try {
        const userProfileStr = localStorage.getItem("healthmint_user_profile");
        if (userProfileStr && userProfileStr !== "{}") {
          const userProfile = JSON.parse(userProfileStr);
          // If profile has name and role, it's not really a new user despite the flag
          if (userProfile.name && userProfile.role) {
            // Fix the inconsistency
            localStorage.setItem("healthmint_is_new_user", "false");
            return false;
          }
        }
      } catch (e) {
        console.error(
          "Error checking profile while verifying new user flag:",
          e
        );
      }

      return true;
    }

    // Check for profile completeness
    const userProfileStr = localStorage.getItem("healthmint_user_profile");
    if (!userProfileStr || userProfileStr === "{}") return true;

    try {
      const userProfile = JSON.parse(userProfileStr);
      // Profile is incomplete if missing name or role
      if (!userProfile.name || !userProfile.role) return true;

      // If we have a profile with a name and role, not a new user
      return false;
    } catch (parseError) {
      console.error("Error parsing user profile:", parseError);
      return true; // Assume new user if we can't parse the profile
    }
  } catch (error) {
    console.error("Error checking new user status:", error);
    return true; // Assume new user on error for safety
  }
};

/**
 * Force redirect to the appropriate page based on auth state
 * @param {Object} authState - Current auth state
 */
export const redirectToAppropriateRoute = (authState) => {
  const { isConnected, needsRegistration, isRoleSelected } = authState;
  const currentPath = window.location.pathname;

  // Already at the correct path
  if (
    (currentPath === "/login" && !isConnected) ||
    (currentPath === "/register" && needsRegistration) ||
    (currentPath === "/select-role" &&
      isConnected &&
      !needsRegistration &&
      !isRoleSelected) ||
    (currentPath === "/dashboard" &&
      isConnected &&
      !needsRegistration &&
      isRoleSelected)
  ) {
    return;
  }

  // Determine redirect path
  let redirectPath;
  if (!isConnected) {
    redirectPath = "/login";
  } else if (needsRegistration) {
    redirectPath = "/register";
  } else if (!isRoleSelected) {
    redirectPath = "/select-role";
  } else {
    redirectPath = "/dashboard";
  }

  // Perform the redirect
  if (redirectPath && currentPath !== redirectPath) {
    console.log(`Redirecting from ${currentPath} to ${redirectPath}`);
    window.location.replace(redirectPath);
  }
};

/**
 * Helper to determine if a user needs to complete registration
 * @param {Object} user - User object
 * @param {string} address - Wallet address
 * @returns {boolean} Whether registration is needed
 */
export const needsRegistration = (user, address) => {
  // If no user or address, then yes need registration
  if (!user && !address) return true;

  // Check explicit new user flag
  const isNewUserFlag = localStorage.getItem("healthmint_is_new_user");
  if (isNewUserFlag === "true") {
    // Double-check profile
    try {
      const profileStr = localStorage.getItem("healthmint_user_profile");
      if (profileStr && profileStr !== "{}") {
        const profile = JSON.parse(profileStr);
        // If profile is complete despite flag, fix inconsistency
        if (profile.name && profile.role) {
          localStorage.setItem("healthmint_is_new_user", "false");
          return false;
        }
      }
    } catch (e) {
      console.error("Error checking profile in needsRegistration:", e);
    }
    return true;
  }

  // Check for complete profile
  const profileIncomplete = !user?.name || !user?.role;
  return profileIncomplete;
};

/**
 * Set up local storage for a new connection
 * @param {string} address - Wallet address
 */
export const initializeNewConnection = (address) => {
  if (!address) return;

  try {
    // Check if this is a first-time connection by examining profile
    const userProfileStr = localStorage.getItem("healthmint_user_profile");
    let existingProfile = null;

    // Try to parse existing profile
    try {
      if (userProfileStr && userProfileStr !== "{}") {
        existingProfile = JSON.parse(userProfileStr);
      }
    } catch (e) {
      console.error("Error parsing user profile during initialization:", e);
    }

    // Determine if this is a new user
    const newUser =
      !existingProfile || !existingProfile.name || !existingProfile.role;

    // Set new user flag
    localStorage.setItem("healthmint_is_new_user", newUser.toString());

    // Initialize profile if needed
    if (newUser) {
      let profile = existingProfile || {};
      profile.address = address;
      localStorage.setItem("healthmint_user_profile", JSON.stringify(profile));
    } else if (existingProfile) {
      // Make sure existing profile has the address
      if (existingProfile.address !== address) {
        existingProfile.address = address;
        localStorage.setItem(
          "healthmint_user_profile",
          JSON.stringify(existingProfile)
        );
      }
    }

    console.log(`Connection initialized. New user: ${newUser}`);
    return { isNewUser: newUser, profile: existingProfile || { address } };
  } catch (e) {
    console.error("Error initializing connection:", e);

    // Fallback: initialize minimal profile
    localStorage.setItem(
      "healthmint_user_profile",
      JSON.stringify({ address })
    );
    return { isNewUser: true, profile: { address } };
  }
};

/**
 * Forces the system to recognize a user as registered and with a selected role
 * This should be called after successful registration to prevent redirect loops
 * @param {string} role - The selected role
 * @param {string} walletAddress - The user's wallet address
 * @param {Object} userData - User profile data
 * @returns {Object|null} The updated user profile or null if failed
 */
export const forceRegistrationComplete = (
  role,
  walletAddress,
  userData = {}
) => {
  console.log("⚡ FORCING REGISTRATION COMPLETE ⚡");
  console.log("Role:", role);
  console.log("Address:", walletAddress);

  if (!role || !walletAddress) {
    console.error("Missing required parameters for forceRegistrationComplete");
    return null;
  }

  try {
    // 1. Ensure user is not marked as new
    localStorage.setItem("healthmint_is_new_user", "false");

    // 2. Ensure role is selected
    localStorage.setItem("healthmint_user_role", role);

    // 3. Ensure profile exists with required fields
    const existingProfileStr = localStorage.getItem("healthmint_user_profile");
    let existingProfile = {};

    try {
      if (existingProfileStr && existingProfileStr !== "{}") {
        existingProfile = JSON.parse(existingProfileStr);
      }
    } catch (error) {
      console.error("Error parsing profile:", error);
      existingProfile = {};
    }

    // Merge with new data, ensuring critical fields exist
    const updatedProfile = {
      ...existingProfile,
      ...userData,
      name: userData.name || existingProfile.name || "User",
      role: role,
      address: walletAddress,
      registrationComplete: true,
      registrationDate: new Date().toISOString(),
    };

    localStorage.setItem(
      "healthmint_user_profile",
      JSON.stringify(updatedProfile)
    );

    // 4. Add a bypass flag in sessionStorage for temporary bypass of checks
    sessionStorage.setItem("bypass_registration_check", "true");
    sessionStorage.setItem(
      "bypass_registration_until",
      (Date.now() + 60000).toString() // 1 minute
    );

    // 5. Create audit log for HIPAA compliance
    logAuthAction("REGISTRATION_COMPLETED", {
      role,
      walletAddress,
      timestamp: new Date().toISOString(),
    });

    // 6. Return the complete profile for use in state updates
    return updatedProfile;
  } catch (error) {
    console.error("Error in forceRegistrationComplete:", error);

    // Still try to set the minimum required values
    localStorage.setItem("healthmint_is_new_user", "false");
    localStorage.setItem("healthmint_user_role", role);
    localStorage.setItem(
      "healthmint_user_profile",
      JSON.stringify({
        name: userData.name || "User",
        role: role,
        address: walletAddress,
        registrationComplete: true,
      })
    );

    return {
      name: userData.name || "User",
      role: role,
      address: walletAddress,
    };
  }
};

/**
 * Checks if registration bypass is active
 * @returns {boolean} Whether bypass is active
 */
export const isRegistrationBypassActive = () => {
  const bypass = sessionStorage.getItem("bypass_registration_check");
  const bypassUntil = sessionStorage.getItem("bypass_registration_until");

  if (bypass === "true" && bypassUntil) {
    const expiryTime = parseInt(bypassUntil, 10);
    return Date.now() < expiryTime;
  }

  return false;
};

/**
 * Check if a user has completed registration
 * @returns {boolean} Whether registration is complete
 */
export const isRegistrationComplete = () => {
  // Check for bypass first
  if (isRegistrationBypassActive()) {
    return true;
  }

  // Then check if marked as a new user
  const isNewUserFlag =
    localStorage.getItem("healthmint_is_new_user") === "true";
  if (isNewUserFlag) {
    // Double-check profile
    try {
      const profileStr = localStorage.getItem("healthmint_user_profile");
      if (profileStr && profileStr !== "{}") {
        const profile = JSON.parse(profileStr);
        if (profile.name && profile.role) {
          // Fix inconsistency
          localStorage.setItem("healthmint_is_new_user", "false");
          return true;
        }
      }
    } catch (e) {
      console.error("Error checking profile in isRegistrationComplete:", e);
    }
    return false;
  }

  // Check if a role is selected
  const role = localStorage.getItem("healthmint_user_role");
  if (!role) {
    return false;
  }

  // Check if profile exists with name
  try {
    const profileStr = localStorage.getItem("healthmint_user_profile");
    if (!profileStr) {
      return false;
    }

    const profile = JSON.parse(profileStr);
    return !!profile.name && !!profile.role;
  } catch (error) {
    console.error("Error checking registration status:", error);
    return false;
  }
};

/**
 * Sanitize auth-related data to ensure HIPAA compliance
 * @param {Object} userData - User data to sanitize
 * @returns {Object} Sanitized user data
 */
export const sanitizeAuthData = (userData) => {
  if (!userData) return {};

  // Create a copy to avoid modifying the original
  const sanitized = { ...userData };

  // Remove sensitive fields
  const sensitiveFields = [
    "ssn",
    "dob",
    "dateOfBirth",
    "medicalRecordNumber",
    "fullAddress",
  ];
  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
};

/**
 * Create an audit log entry for authentication actions (HIPAA compliance)
 * @param {string} action - The auth action performed
 * @param {Object} details - Additional details about the action
 */
export const logAuthAction = (action, details = {}) => {
  try {
    // In a real app, this would send to a secure audit logging service
    // For now, we'll just console log in non-production environments
    if (process.env.NODE_ENV !== "production") {
      console.log(`Auth Action Logged: ${action}`, {
        timestamp: new Date().toISOString(),
        ...details,
      });
    }

    // Store in local audit trail
    const auditTrail = JSON.parse(
      localStorage.getItem("healthmint_audit_trail") || "[]"
    );
    auditTrail.push({
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });

    // Limit size to prevent localStorage issues
    if (auditTrail.length > 100) {
      auditTrail.splice(0, auditTrail.length - 100);
    }

    localStorage.setItem("healthmint_audit_trail", JSON.stringify(auditTrail));
  } catch (error) {
    console.error("Error logging auth action:", error);
  }
};

/**
 * Clear all authentication data (for logout)
 * Complies with HIPAA by ensuring proper session termination
 */
export const clearAuthData = () => {
  try {
    // Log the logout action for HIPAA compliance
    logAuthAction("USER_LOGOUT", {
      timestamp: new Date().toISOString(),
    });

    // Clear auth-related localStorage items
    const authKeys = [
      "healthmint_auth_token",
      "healthmint_refresh_token",
      "healthmint_token_expiry",
      "healthmint_wallet_state",
      "healthmint_wallet_connection",
    ];

    authKeys.forEach((key) => localStorage.removeItem(key));

    // Don't clear profile or role information - that persists across sessions

    // Clear any bypass flags
    sessionStorage.removeItem("bypass_registration_check");
    sessionStorage.removeItem("bypass_registration_until");

    return true;
  } catch (error) {
    console.error("Error clearing auth data:", error);
    return false;
  }
};

// Create a single object with all functions for default export
const authUtils = {
  isNewUser,
  redirectToAppropriateRoute,
  needsRegistration,
  initializeNewConnection,
  forceRegistrationComplete,
  isRegistrationBypassActive,
  isRegistrationComplete,
  sanitizeAuthData,
  logAuthAction,
  clearAuthData,
};

export default authUtils;
