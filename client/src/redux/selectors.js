// client/src/redux/selectors.js
//
// Cross-cutting Redux selectors. Prefer these over inline `(state) => state.foo.bar`
// so state-shape renames stay atomic. Use createSelector (reselect, bundled with
// @reduxjs/toolkit) for *derived* state — selectors that combine multiple slices
// or compute new values. Memoization there prevents component re-renders when
// inputs haven't actually changed.

import { createSelector } from "@reduxjs/toolkit";

// Wallet
export const selectWalletAddress = (state) => state.wallet.address;
export const selectIsConnected = (state) => state.wallet.isConnected;
export const selectWalletNetwork = (state) => state.wallet.network;
export const selectWalletChainId = (state) => state.wallet.chainId;

// User
export const selectUserProfile = (state) => state.user?.profile ?? null;

// Re-exports — one-stop selector imports
export { selectRole, selectIsRoleSelected } from "./slices/roleSlice.js";
export {
  selectIsAuthenticated,
  selectAuthToken,
  selectUserRoles,
} from "./slices/authSlice.js";

// --- Derived selectors (memoized via reselect) ---

// Combined session readiness: a single check for the wallet-connected +
// has-role + authenticated triad that is currently repeated across
// ProtectedRoute, AppContent, RoleSelector, etc.
export const selectSessionReady = createSelector(
  [
    (state) => state.wallet.isConnected,
    (state) => state.wallet.address,
    (state) => state.role.role,
    (state) => state.auth?.isAuthenticated ?? false,
  ],
  (isConnected, address, role, isAuthenticated) =>
    Boolean(isConnected && address && role && isAuthenticated)
);

// Effective role: prefer the role slice; fall back to the auth slice's
// userRoles array. Mirrors the inline logic in ProtectedRoute.
export const selectEffectiveRole = createSelector(
  [(state) => state.role.role, (state) => state.auth?.userRoles ?? []],
  (sliceRole, userRoles) => sliceRole || userRoles[0] || null
);
