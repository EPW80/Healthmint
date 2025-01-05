import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dataReducer from "./slices/dataSlice";
import profileReducer from "./slices/profileSlice";
import uiReducer from "./slices/uiSlice";
import userReducer from "./slices/userSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    profile: profileReducer,
    ui: uiReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in the Redux state
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