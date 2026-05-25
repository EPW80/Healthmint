// client/src/hooks/useWallet.js
//
// Read-only wallet selector hooks. Use these in components that only need to
// READ wallet state — they avoid pulling in the full useWalletConnect (502 LOC)
// with its connect/disconnect machinery, refs, and side effects.
//
// Components that need to mutate (connect, disconnect, switch network) should
// still use useWalletConnect.
//
// Pairs with selectors in redux/slices/walletSlice.js — the hooks just wrap
// useSelector so callers don't have to import both the hook and the selector.

import { useSelector } from "react-redux";
import {
  selectAddress,
  selectIsConnected,
  selectChainId,
  selectNetwork,
  selectIsOnSupportedNetwork,
  selectWalletLoading,
  selectWalletError,
} from "../redux/slices/walletSlice.js";

export const useWalletAddress = () => useSelector(selectAddress);
export const useIsConnected = () => useSelector(selectIsConnected);
export const useWalletChainId = () => useSelector(selectChainId);
export const useWalletNetwork = () => useSelector(selectNetwork);
export const useIsOnSupportedNetwork = () =>
  useSelector(selectIsOnSupportedNetwork);
export const useWalletLoading = () => useSelector(selectWalletLoading);
export const useWalletError = () => useSelector(selectWalletError);
