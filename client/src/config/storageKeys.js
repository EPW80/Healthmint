// client/src/config/storageKeys.js
//
// Centralized localStorage / sessionStorage key registry.
//
// Why: keys were duplicated as string literals across 30+ files. Typos
// (e.g. "token" instead of "healthmint_auth_token" in useHealthData) silently
// broke auth flows. Importing from here makes typos a compile-time miss and
// lets us rename keys atomically.

export const STORAGE_KEYS = Object.freeze({
  // Auth / identity (localStorage)
  AUTH_TOKEN: "healthmint_auth_token",
  REFRESH_TOKEN: "healthmint_refresh_token",
  TOKEN_EXPIRY: "healthmint_token_expiry",
  USER_PROFILE: "healthmint_user_profile",
  USER_ROLE: "healthmint_user_role",
  IS_NEW_USER: "healthmint_is_new_user",
  USER_SETTINGS: "healthmint_user_settings",

  // Wallet (localStorage)
  WALLET_ADDRESS: "healthmint_wallet_address",
  WALLET_CONNECTION: "healthmint_wallet_connection",
  WALLET_STATE: "healthmint_wallet_state",

  // HIPAA / audit (localStorage)
  AUDIT_TRAIL: "healthmint_audit_trail",
  CONSENT_HISTORY: "healthmint_consent_history",
  USER_CONSENT: "healthmint_user_consent",

  // Data cache (localStorage)
  CACHED_DATA: "healthmint_cached_data",
  FAVORITE_DATASETS: "healthmint_favorite_datasets",

  // Mock data fixtures (localStorage)
  MOCK_HEALTH_DATA: "healthmint_mock_health_data",
  MOCK_RESEARCH_DATA: "healthmint_mock_research_data",
  MOCK_USER_RECORDS: "healthmint_mock_user_records",

  // Session ephemeral (sessionStorage)
  LOGOUT_IN_PROGRESS: "logout_in_progress",
  TEMP_SELECTED_ROLE: "temp_selected_role",
  FORCE_WALLET_RECONNECT: "force_wallet_reconnect",
});

// Per-wallet user profile key. Each connected wallet has its own profile slot
// in localStorage so multi-account devices don't clobber each other.
export const userProfileKey = (walletAddress) =>
  `healthmint_user_${walletAddress}`;
