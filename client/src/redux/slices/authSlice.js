// src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authService from "../../services/authService.js";
import { addNotification } from "./notificationSlice.js";

// Initial state
const initialState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  authLoading: false,
  authError: null,
  sessionActive: false,
  lastAuthActivity: null,
  userRoles: [],
  userId: null,
};

export const loginAsync = createAsyncThunk(
  "auth/login",
  async ({ address }, { rejectWithValue, dispatch }) => {
    try {
      // Validate wallet address
      if (!address) {
        throw new Error("Wallet address is required");
      }

      // Authenticate with wallet service
      const result = await authService.authenticateWithWallet(address);

      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: "Successfully authenticated",
          duration: 3000,
        })
      );

      // Extract roles properly, handling various response formats
      let userRoles = [];
      if (result.user?.roles && Array.isArray(result.user.roles)) {
        userRoles = result.user.roles;
      } else if (result.user?.role) {
        userRoles = [result.user.role];
      } else {
        userRoles = ["user"]; // Default role
      }

      return {
        token: result.token,
        refreshToken: result.refreshToken,
        tokenExpiry: result.expiresAt,
        userRoles,
        userId: result.user?.id,
        isNewUser: result.isNewUser,
      };
    } catch (error) {
      // Error notification
      dispatch(
        addNotification({
          type: "error",
          message: error.message || "Authentication failed",
          duration: 5000,
        })
      );

      return rejectWithValue(error.message || "Authentication failed");
    }
  }
);

export const refreshTokenAsync = createAsyncThunk(
  "auth/refreshToken",
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      const { auth } = getState();

      // If there's no refresh token, fail immediately
      if (!auth.refreshToken) {
        return rejectWithValue("No refresh token available");
      }

      // Use auth service to refresh token
      const result = await authService.refreshToken();

      // Extract roles from the refresh response or keep existing roles
      const userRoles =
        result.userRoles ||
        result.roles ||
        result.user?.roles ||
        (result.user?.role ? [result.user.role] : null) ||
        auth.userRoles;

      return {
        token: result.token,
        refreshToken: result.refreshToken,
        tokenExpiry: Date.now() + result.expiresIn * 1000,
        userRoles,
      };
    } catch (error) {
      if (error.message !== "No refresh token available") {
        dispatch(
          addNotification({
            type: "warning",
            message: "Session expired. Please log in again.",
            duration: 5000,
          })
        );
      }

      return rejectWithValue(error.message || "Failed to refresh token");
    }
  }
);

export const logoutAsync = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      // Use auth service to log out
      await authService.logout();

      // Success notification
      dispatch(
        addNotification({
          type: "info",
          message: "Successfully logged out",
          duration: 3000,
        })
      );

      return true;
    } catch (error) {
      console.error("Logout error:", error);

      return true;
    }
  }
);

export const updateRoleAsync = createAsyncThunk(
  "auth/updateRole",
  async ({ role, address }, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!role) {
        throw new Error("Role is required");
      }

      const { auth } = getState();
      const authToken = auth.token;

      if (!authToken) {
        throw new Error("Authentication required");
      }

      // Call API to update role
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role, address }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update role");
      }

      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: `Role updated to ${role}`,
          duration: 3000,
        })
      );

      // Return roles from API or create array with the new role
      const userRoles = result.roles || [role];

      return { userRoles };
    } catch (error) {
      dispatch(
        addNotification({
          type: "error",
          message: error.message || "Failed to update role",
          duration: 5000,
        })
      );

      return rejectWithValue(error.message || "Failed to update role");
    }
  }
);

// Create auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Start session (after wallet connection is verified)
    startSession: (state) => {
      state.sessionActive = true;
      state.lastAuthActivity = Date.now();
    },

    // End session
    endSession: (state) => {
      state.sessionActive = false;
      state.lastAuthActivity = null;
    },

    // Update last activity timestamp to prevent session timeout
    updateActivity: (state) => {
      state.lastAuthActivity = Date.now();
    },

    // Update auth state from localStorage on app init
    initializeAuth: (state) => {
      const token = authService.getToken();
      const refreshToken = authService.getRefreshToken();
      const tokenExpiry = localStorage.getItem(authService.tokenExpiryKey);
      const userData = localStorage.getItem(authService.userKey);

      if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10)) {
        state.isAuthenticated = true;
        state.token = token;
        state.refreshToken = refreshToken;
        state.tokenExpiry = parseInt(tokenExpiry, 10);
        state.sessionActive = true;
        state.lastAuthActivity = Date.now();

        if (userData) {
          try {
            const user = JSON.parse(userData);
            state.userRoles = user.roles || (user.role ? [user.role] : []);
            state.userId = user.id;
          } catch (e) {
            console.error("Error parsing user data:", e);
          }
        }
      }
    },

    // Update user roles - important for role-based access control
    updateUserRoles: (state, action) => {
      // Ensure roles are always in array format and contain unique values
      const uniqueRoles = Array.from(new Set(action.payload.filter(Boolean)));
      state.userRoles = uniqueRoles;

      // Update localStorage to persist roles
      try {
        const userData = localStorage.getItem(authService.userKey);
        if (userData) {
          const user = JSON.parse(userData);
          user.roles = uniqueRoles;
          localStorage.setItem(authService.userKey, JSON.stringify(user));
        }
      } catch (e) {
        console.error("Error updating user roles in localStorage:", e);
      }
    },

    // Add a single role to the roles array
    addUserRole: (state, action) => {
      const newRole = action.payload;
      if (newRole && !state.userRoles.includes(newRole)) {
        state.userRoles = [...state.userRoles, newRole];

        // Update localStorage to persist roles
        try {
          const userData = localStorage.getItem(authService.userKey);
          if (userData) {
            const user = JSON.parse(userData);
            user.roles = state.userRoles;
            localStorage.setItem(authService.userKey, JSON.stringify(user));
          }
        } catch (e) {
          console.error("Error adding user role in localStorage:", e);
        }
      }
    },

    // Manually reset auth state
    resetAuthState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Login async thunk handling
      .addCase(loginAsync.pending, (state) => {
        state.authLoading = true;
        state.authError = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.tokenExpiry;
        state.authLoading = false;
        state.sessionActive = true;
        state.lastAuthActivity = Date.now();
        state.userRoles = action.payload.userRoles || [];
        state.userId = action.payload.userId;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.authLoading = false;
        state.authError = action.payload || "Authentication failed";
        state.isAuthenticated = false;
      })

      // Refresh token async thunk handling
      .addCase(refreshTokenAsync.pending, (state) => {
        state.authLoading = true;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiry = action.payload.tokenExpiry;
        if (action.payload.userRoles) {
          state.userRoles = action.payload.userRoles;
        }
        state.authLoading = false;
        state.lastAuthActivity = Date.now();
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        state.authLoading = false;
        state.authError = action.payload || "Failed to refresh token";
        // Don't reset authentication state here to allow retry
      })

      // Update role async thunk handling
      .addCase(updateRoleAsync.pending, (state) => {
        state.authLoading = true;
      })
      .addCase(updateRoleAsync.fulfilled, (state, action) => {
        state.userRoles = action.payload.userRoles;
        state.authLoading = false;
      })
      .addCase(updateRoleAsync.rejected, (state, action) => {
        state.authLoading = false;
        state.authError = action.payload || "Failed to update role";
      })

      // Logout async thunk handling
      .addCase(logoutAsync.pending, (state) => {
        state.authLoading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        return initialState;
      })
      .addCase(logoutAsync.rejected, (state) => {
        // Still reset state even if API call fails
        return initialState;
      });
  },
});

// Export actions
export const {
  startSession,
  endSession,
  updateActivity,
  initializeAuth,
  resetAuthState,
  updateUserRoles,
  addUserRole,
} = authSlice.actions;

// Export selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.authLoading;
export const selectAuthError = (state) => state.auth.authError;
export const selectSessionActive = (state) => state.auth.sessionActive;
export const selectTokenExpiry = (state) => state.auth.tokenExpiry;
export const selectUserRoles = (state) => state.auth.userRoles;
export const selectUserId = (state) => state.auth.userId;
export const selectHasRole = (role) => (state) =>
  state.auth.userRoles.includes(role);

export default authSlice.reducer;
