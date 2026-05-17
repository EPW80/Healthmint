// src/redux/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { hipaaAuditMiddleware } from "./middleware/hipaaAuditMiddleware";
import authReducer from "./slices/authSlice.js";
import dataReducer from "./slices/dataSlice.js";
import uiReducer from "./slices/uiSlice.js";
import userReducer from "./slices/userSlice.js";
import walletReducer from "./slices/walletSlice.js";
import roleReducer from "./slices/roleSlice.js";
import notificationReducer from "./slices/notificationSlice.js";

// Local storage keys
const STORAGE_KEYS = {
  WALLET: "healthmint_wallet_state",
  AUTH: "healthmint_auth_state",
};

// Persistence configuration
const PERSISTENCE_CONFIG = {
  WALLET_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
};

// Define serialization ignore patterns
const IGNORED_ACTIONS = [
  // Wallet-related actions
  "wallet/updateWalletConnection",
  "wallet/connectWalletAsync",
  "wallet/connectWalletAsync/fulfilled",
  "wallet/switchNetworkAsync",
  "wallet/switchNetworkAsync/fulfilled",

  // Auth-related actions
  "auth/loginAsync",
  "auth/loginAsync/fulfilled",
  "auth/refreshTokenAsync/fulfilled",
];

const IGNORED_PATHS = [
  // Wallet-related paths
  "wallet.provider",
  "wallet.signer",
  "wallet.network.blockExplorer",
  "auth.authProvider",
];

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  data: dataReducer,
  ui: uiReducer,
  user: userReducer,
  wallet: walletReducer,
  role: roleReducer,
  notifications: notificationReducer,
});

const createPersistableWalletState = (walletState) => ({
  address: walletState.address,
  chainId: walletState.chainId,
  isConnected: walletState.isConnected,
  walletType: walletState.walletType,
  lastConnected: walletState.lastConnected,
  network: {
    chainId: walletState.network?.chainId,
    name: walletState.network?.name,
    isSupported: walletState.network?.isSupported,
  },
});

// Create and configure store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: IGNORED_ACTIONS,
        ignoredPaths: IGNORED_PATHS,
      },
      thunk: {
        extraArgument: {
          apiClient: null,
        },
      },
    }).concat(hipaaAuditMiddleware),
  devTools: process.env.NODE_ENV !== "production",
  preloadedState: {
    ui: {
      loading: false,
      error: null,
    },
    notifications: {
      notifications: [],
      maxNotifications: 5,
    },
    wallet: {
      isConnected: false,
      address: null,
      chainId: null,
      loading: false,
      error: null,
      network: {
        chainId: null,
        name: null,
        isSupported: false,
        blockExplorer: null,
      },
      lastConnected: null,
      walletType: "metamask",
    },
    auth: {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      tokenExpiry: null,
      authLoading: false,
      authError: null,
      sessionActive: false,
      lastAuthActivity: null,
      userRoles: [],
    },
  },
});

// Set up state persistence
store.subscribe(() => {
  try {
    const state = store.getState();
    const { wallet, auth } = state;

    // Persist wallet state for UX continuity.
    if (wallet.isConnected) {
      const persistableWalletState = createPersistableWalletState(wallet);
      localStorage.setItem(
        STORAGE_KEYS.WALLET,
        JSON.stringify(persistableWalletState)
      );
    }

    // Persist auth session so a page refresh keeps the user logged in.
    if (auth.isAuthenticated) {
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify({
          token: auth.token,
          refreshToken: auth.refreshToken,
          tokenExpiry: auth.tokenExpiry,
          userRoles: auth.userRoles,
        })
      );
    }
  } catch (error) {
    console.warn("Error persisting state to localStorage:", error);
  }
});

// Initialize store with persisted state if available
const initializeStore = () => {
  try {
    // Restore wallet state
    const restoreWalletState = () => {
      const persistedWalletState = localStorage.getItem(STORAGE_KEYS.WALLET);
      if (persistedWalletState) {
        try {
          const parsedState = JSON.parse(persistedWalletState);

          // Check if state is expired
          const isExpired =
            parsedState.lastConnected &&
            Date.now() - parsedState.lastConnected >
              PERSISTENCE_CONFIG.WALLET_EXPIRY;

          if (!isExpired) {
            // Update store via dispatch
            store.dispatch({
              type: "wallet/updateWalletConnection",
              payload: parsedState,
            });
            return true;
          } else {
            // Clear expired state
            localStorage.removeItem(STORAGE_KEYS.WALLET);
          }
        } catch (parseError) {
          console.warn("Error parsing wallet state:", parseError);
          localStorage.removeItem(STORAGE_KEYS.WALLET);
        }
      }
      return false;
    };

    // Restore auth session so the user stays logged in across refreshes.
    const restoreAuthState = () => {
      const persistedAuthState = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (persistedAuthState) {
        try {
          const parsedAuth = JSON.parse(persistedAuthState);
          if (parsedAuth.token) {
            store.dispatch({
              type: "auth/restoreSession",
              payload: parsedAuth,
            });
            return true;
          }
        } catch (parseError) {
          console.warn("Error parsing auth state:", parseError);
          localStorage.removeItem(STORAGE_KEYS.AUTH);
        }
      }
      return false;
    };

    const walletRestored = restoreWalletState();
    const authRestored = restoreAuthState();

    if (walletRestored) {
      console.log("Wallet state restored from localStorage");
    }
    if (authRestored) {
      console.log("Auth session restored from localStorage");
    }
  } catch (error) {
    console.error("Failed to initialize store from persisted state:", error);
    localStorage.removeItem(STORAGE_KEYS.WALLET);
  }
};

// Run initialization
initializeStore();

// Export store and utilities
export { store };
export const getState = () => store.getState();
export default store;
