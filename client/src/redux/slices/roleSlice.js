// src/redux/slices/roleSlice.js
import { createSlice } from "@reduxjs/toolkit";

// Define user roles
export const USER_ROLES = {
  PATIENT: "patient",
  RESEARCHER: "researcher",
  PROVIDER: "provider",
  ADMIN: "admin",
};

// Helper function to get permissions based on role
const getRolePermissions = (role) => {
  switch (role) {
    case USER_ROLES.PATIENT:
      return ["view_records", "manage_permissions", "upload_data"];
    case USER_ROLES.RESEARCHER:
      return ["view_anonymized_data", "request_access", "run_analysis"];
    case USER_ROLES.PROVIDER:
      return ["view_records", "add_records", "manage_patients"];
    case USER_ROLES.ADMIN:
      return ["manage_users", "manage_roles", "view_logs", "system_config"];
    default:
      return [];
  }
};

// Try to load role from localStorage
const loadInitialState = () => {
  try {
    const savedRole = localStorage.getItem("healthmint_user_role");
    if (savedRole && Object.values(USER_ROLES).includes(savedRole)) {
      // Production-safe logging
      if (process.env.NODE_ENV !== "production") {
        console.log(`Loaded role from storage: ${savedRole}`);
      }

      return {
        role: savedRole,
        isRoleSelected: true,
        permissions: getRolePermissions(savedRole),
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error("Error loading role from storage:", e);
  }

  return {
    role: null,
    isRoleSelected: false,
    permissions: [],
    loading: false,
    error: null,
    lastUpdated: null,
  };
};

// Initial state with validation and localStorage loading
const initialState = loadInitialState();

// Role validation helper
const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setRole: (state, action) => {
      const role = action.payload;
      if (!isValidRole(role)) {
        state.error = `Invalid role: ${role}`;
        return;
      }
      state.role = role;
      state.isRoleSelected = true;
      state.error = null;
      state.lastUpdated = new Date().toISOString();

      // Save to localStorage for persistence
      try {
        localStorage.setItem("healthmint_user_role", role);

        // Production-safe logging
        if (process.env.NODE_ENV !== "production") {
          console.log(`Saved role to storage: ${role}`);
        }

        // HIPAA audit logging will be handled by middleware
      } catch (e) {
        console.error("Error saving role to storage:", e);
      }

      // Set default permissions for the role
      state.permissions = getRolePermissions(role);
    },

    clearRole: (state) => {
      state.role = null;
      state.isRoleSelected = false;
      state.permissions = [];
      state.error = null;
      state.lastUpdated = new Date().toISOString();

      // Remove from localStorage
      try {
        localStorage.removeItem("healthmint_user_role");
      } catch (e) {
        console.error("Error removing role from storage:", e);
      }
    },

    setPermissions: (state, action) => {
      state.permissions = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

// Action creators
export const { setRole, clearRole, setPermissions, setLoading, setError } =
  roleSlice.actions;

// Selectors
export const selectRole = (state) => state.role.role;
export const selectIsRoleSelected = (state) => state.role.isRoleSelected;
export const selectRolePermissions = (state) => state.role.permissions;
export const selectRoleLoading = (state) => state.role.loading;
export const selectRoleError = (state) => state.role.error;

// Async action creator with validation
export const setRoleWithValidation = (role) => (dispatch) => {
  try {
    dispatch(setLoading(true));

    if (!isValidRole(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    dispatch(setRole(role));

    // Set default permissions based on role
    const permissions = getRolePermissions(role);
    dispatch(setPermissions(permissions));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

export default roleSlice.reducer;
