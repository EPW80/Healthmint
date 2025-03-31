// src/redux/slices/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";

/**
 * Initial state for the UI slice
 * Manages application UI state like loading indicators, modals, and appearance settings
 */
const initialState = {
  loading: false,
  error: null,
  theme: "light",
  modal: {
    isOpen: false,
    type: null, // 'purchase', 'upload', 'error', etc.
    data: null,
  },
  searchQuery: "",
  sortBy: "date",
  sortOrder: "desc",
  sidebar: {
    isOpen: true,
    activeTab: "browse",
  },
};

/**
 * UI slice reducer
 * Controls UI-related state like modals, loading states, and theme
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    /**
     * Set the global loading state
     * @param {boolean} action.payload - Loading state
     */
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    /**
     * Set the global error state
     * @param {string|null} action.payload - Error message
     */
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    /**
     * Clear the global error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Set the application theme
     * @param {string} action.payload - Theme name (e.g., 'light', 'dark')
     */
    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    /**
     * Open a modal dialog
     * @param {Object} action.payload - Modal configuration
     * @param {string} action.payload.type - Modal type
     * @param {Object} action.payload.data - Modal data
     */
    openModal: (state, action) => {
      state.modal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data,
      };
    },

    /**
     * Close the currently open modal
     */
    closeModal: (state) => {
      state.modal = {
        isOpen: false,
        type: null,
        data: null,
      };
    },

    /**
     * Set the search query
     * @param {string} action.payload - Search query
     */
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },

    /**
     * Set the sort field
     * @param {string} action.payload - Sort field
     */
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },

    /**
     * Set the sort order
     * @param {string} action.payload - Sort order ('asc' or 'desc')
     */
    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },

    /**
     * Toggle the sidebar visibility
     */
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },

    /**
     * Set the active sidebar tab
     * @param {string} action.payload - Tab name
     */
    setActiveTab: (state, action) => {
      state.sidebar.activeTab = action.payload;
    },
  },
});

// Export action creators
export const {
  setLoading,
  setError,
  clearError,
  setTheme,
  openModal,
  closeModal,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  toggleSidebar,
  setActiveTab,
} = uiSlice.actions;

/**
 * Thunk action creator to set error and show notification
 * Use this to display errors to the user via both error state and notification
 * @param {string} errorMessage - Error message to display
 */
export const setErrorWithNotification =
  (errorMessage) => (dispatch, getState) => {
    // Import at function level to avoid circular dependencies
    const { addNotification } = require("../slices/notificationSlice");

    // Set the error in the UI state
    dispatch(setError(errorMessage));

    // Also create a notification for the user
    dispatch(
      addNotification({
        type: "error",
        message: errorMessage,
        duration: 5000,
      })
    );
  };

// Export these for backward compatibility
// These will use the notification slice internally
export const addNotification = (payload) => (dispatch) => {
  const { addNotification } = require("../slices/notificationSlice");
  dispatch(addNotification(payload));
};

export const removeNotification = (payload) => (dispatch) => {
  const { removeNotification } = require("../slices/notificationSlice");
  dispatch(removeNotification(payload));
};

export const clearNotifications = () => (dispatch) => {
  const { clearNotifications } = require("../slices/notificationSlice");
  dispatch(clearNotifications());
};

// Export selectors
export const selectLoading = (state) => state.ui.loading;
export const selectError = (state) => state.ui.error;
export const selectTheme = (state) => state.ui.theme;
export const selectModal = (state) => state.ui.modal;
export const selectSearchQuery = (state) => state.ui.searchQuery;
export const selectSortBy = (state) => state.ui.sortBy;
export const selectSortOrder = (state) => state.ui.sortOrder;
export const selectSidebar = (state) => state.ui.sidebar;

// Export reducer
export default uiSlice.reducer;
