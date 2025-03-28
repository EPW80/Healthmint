// src/utils/registrationUtils.js

/**
 * Utility functions for fixing registration state inconsistencies
 */

/**
 * Forces the system to recognize a user as registered and with a selected role
 * This should be called after successful registration to prevent redirect loops
 * @param {string} role - The selected role
 * @param {string} walletAddress - The user's wallet address
 * @param {Object} userData - User profile data
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
      (Date.now() + 60000).toString() // Increased to 1 minute
    );

    // 5. Return the complete profile for use in state updates
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
  const isNewUser = localStorage.getItem("healthmint_is_new_user") === "true";
  if (isNewUser) {
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

export default {
  forceRegistrationComplete,
  isRegistrationComplete,
  isRegistrationBypassActive,
};
