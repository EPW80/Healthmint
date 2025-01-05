import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dataReducer from "./slices/dataSlice";
import profileReducer from "./slices/profileSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    profile: profileReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the Redux state
        ignoredActions: ["auth/setWalletConnection"],
        ignoredPaths: ["auth.provider", "auth.signer"],
      },
    }),
});

export default store;
