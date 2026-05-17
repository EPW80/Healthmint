// src/redux/slices/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  error: null,
  theme: "light",
  modal: {
    isOpen: false,
    type: null,
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

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    openModal: (state, action) => {
      state.modal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data,
      };
    },

    closeModal: (state) => {
      state.modal = {
        isOpen: false,
        type: null,
        data: null,
      };
    },

    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },

    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },

    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },

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
export default uiSlice.reducer;
