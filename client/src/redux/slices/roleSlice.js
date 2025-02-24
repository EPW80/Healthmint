import { createSlice } from "@reduxjs/toolkit";

// Role types enum - matching your project's needs
export const USER_ROLES = {
  PATIENT: "patient",
  RESEARCHER: "researcher",
  PROVIDER: "provider",
  ADMIN: "admin",
};

// Initial state with validation
const initialState = {
  role: null,
  isRoleSelected: false,
  permissions: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

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
    },

    clearRole: (state) => {
      state.role = null;
      state.isRoleSelected = false;
      state.permissions = [];
      state.error = null;
      state.lastUpdated = new Date().toISOString();
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

// Thunks for async operations
export const setRoleWithValidation = (role) => (dispatch) => {
  try {
    dispatch(setLoading(true));

    if (!isValidRole(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Add any async validation or API calls here

    dispatch(setRole(role));

    // Example of setting default permissions based on role
    const permissions = getRolePermissions(role);
    dispatch(setPermissions(permissions));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

// Helper function to get default permissions based on role
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

export default roleSlice.reducer;
