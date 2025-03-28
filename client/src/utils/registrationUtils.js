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

  // 1. Ensure user is not marked as new
  localStorage.setItem("healthmint_is_new_user", "false");

  // 2. Ensure role is selected
  localStorage.setItem("healthmint_user_role", role);

  // 3. Ensure profile exists with required fields
  const existingProfile = localStorage.getItem("healthmint_user_profile");
  let profile = {};

  try {
    if (existingProfile) {
      profile = JSON.parse(existingProfile);
    }
  } catch (error) {
    console.error("Error parsing profile:", error);
    profile = {};
  }

  // Merge with new data, ensuring critical fields exist
  const updatedProfile = {
    ...profile,
    ...userData,
    name: userData.name || profile.name || "User",
    role: role,
    address: walletAddress,
    registrationComplete: true,
    registrationDate: new Date().toISOString(),
  };

  localStorage.setItem(
    "healthmint_user_profile",
    JSON.stringify(updatedProfile)
  );

  // 4. Add a bypass flag to prevent further checks temporarily
  sessionStorage.setItem("bypass_registration_check", "true");
  sessionStorage.setItem(
    "bypass_registration_until",
    (Date.now() + 30000).toString()
  );

  // 5. Return the complete profile for use in state updates
  return updatedProfile;
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
