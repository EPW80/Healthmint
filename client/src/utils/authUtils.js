// src/utils/authUtils.js

/**
 * Utility functions for authentication and HIPAA compliance
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

// Create an object with all exported functions
const authUtils = {
  isNewUser,
  redirectToAppropriateRoute,
  needsRegistration,
  initializeNewConnection,
};

// Export the object as default
export default authUtils;
