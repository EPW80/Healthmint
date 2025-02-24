// src/redux/store.js

import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

// Import all reducers
import authReducer from "./slices/authSlice";
import dataReducer from "./slices/dataSlice";
import profileReducer from "./slices/profileSlice";
import uiReducer from "./slices/uiSlice";
import userReducer from "./slices/userSlice";
import walletReducer from "./slices/walletSlice";
import roleReducer from "./slices/roleSlice";
import notificationReducer from "./slices/notificationSlice";

// Define serialization ignore patterns
const IGNORED_ACTIONS = [
  "auth/updateWalletConnection",
  "auth/startWalletConnection",
  "user/updateWalletConnection",
  "wallet/updateWalletConnection",
];

const IGNORED_PATHS = [
  "auth.provider",
  "auth.signer",
  "user.wallet.provider",
  "user.wallet.signer",
  "wallet.provider",
  "wallet.signer",
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
          // Add any extra arguments for thunk middleware if needed
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
    },
    wallet: {
      isConnected: false,
      address: null,
      network: null,
    },
  },
});

// Export store and utilities
export { store };
export const getState = () => store.getState();
export default store;
