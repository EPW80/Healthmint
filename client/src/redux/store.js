// store.js is the file that creates the Redux store and combines all the reducers into one.
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dataReducer from "./slices/dataSlice";
import profileReducer from "./slices/profileSlice";
import uiReducer from "./slices/uiSlice";
import userReducer from "./slices/userSlice";
import notificationReducer from "../redux/slices/store/notificationSlice";

// Create the Redux store with all reducers combined.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    profile: profileReducer,
    ui: uiReducer,
    user: userReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "auth/setWalletConnection",
          "user/setWalletConnection",
        ],
        ignoredPaths: [
          "auth.provider",
          "auth.signer",
          "user.wallet.provider",
          "user.wallet.signer",
        ],
      },
    }),
});

export default store;
