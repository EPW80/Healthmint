// src/redux/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";

// Import all reducers
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

  // Auth-related actions that might contain non-serializable data
  "auth/loginAsync",
  "auth/loginAsync/fulfilled",
  "auth/refreshTokenAsync/fulfilled",
];

const IGNORED_PATHS = [
  // These paths may contain non-serializable objects like providers or signers
  "wallet.provider",
  "wallet.signer",
  "wallet.network.blockExplorer",
  "auth.authProvider",
];

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  data: dataReducer,
  profile: profileReducer,
  ui: uiReducer,
  user: userReducer,
  wallet: walletReducer,
  role: roleReducer,
  notifications: notificationReducer,
});

/**
 * Creates a persisted wallet state object with only serializable data
 * @param {Object} walletState - The complete wallet state
 * @returns {Object} Serializable wallet state for persistence
 */
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

/**
 * Creates a persisted auth state object with only necessary data
 * @param {Object} authState - The complete auth state
 * @returns {Object} Auth state for persistence
 */
const createPersistableAuthState = (authState) => ({
  token: authState.token,
  refreshToken: authState.refreshToken,
  tokenExpiry: authState.tokenExpiry,
  isAuthenticated: true,
  userRoles: authState.userRoles || [],
  lastAuthActivity: authState.lastAuthActivity,
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
          // Add extra arguments for API calls if needed
        },
      },
    }),
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

    // Persist wallet state if connected
    if (wallet.isConnected) {
      const persistableWalletState = createPersistableWalletState(wallet);
      localStorage.setItem(
        STORAGE_KEYS.WALLET,
        JSON.stringify(persistableWalletState)
      );
    }

    // Persist auth state if authenticated
    if (auth.isAuthenticated && auth.token) {
      const persistableAuthState = createPersistableAuthState(auth);
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify(persistableAuthState)
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

    // Restore auth state
    const restoreAuthState = () => {
      const persistedAuthState = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (persistedAuthState) {
        try {
          const parsedAuthState = JSON.parse(persistedAuthState);

          // Check if token is expired
          const isTokenExpired =
            parsedAuthState.tokenExpiry &&
            Date.now() > parsedAuthState.tokenExpiry;

          if (!isTokenExpired && parsedAuthState.token) {
            // Restore auth state
            store.dispatch({
              type: "auth/loginAsync/fulfilled",
              payload: parsedAuthState,
            });

            // Activate session
            store.dispatch({ type: "auth/startSession" });
            return true;
          } else {
            // Clear expired auth data
            localStorage.removeItem(STORAGE_KEYS.AUTH);
          }
        } catch (parseError) {
          console.warn("Error parsing auth state:", parseError);
          localStorage.removeItem(STORAGE_KEYS.AUTH);
        }
      }
      return false;
    };

    // Attempt to restore states
    const walletRestored = restoreWalletState();
    const authRestored = restoreAuthState();

    // Log restoration status
    if (walletRestored || authRestored) {
      console.log("State restored from localStorage:", {
        wallet: walletRestored,
        auth: authRestored,
      });
    }
  } catch (error) {
    console.error("Failed to initialize store from persisted state:", error);
    // Clear localStorage if there's an error
    localStorage.removeItem(STORAGE_KEYS.WALLET);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
};

// Run initialization
initializeStore();

// Export store and utilities
export { store };
export const getState = () => store.getState();
export default store;
