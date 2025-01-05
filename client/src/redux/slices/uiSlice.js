import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  error: null,
  notifications: [],
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
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        type: action.payload.type,
        message: action.payload.message,
        timestamp: new Date().toISOString(),
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notif) => notif.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
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

export const {
  setLoading,
  setError,
  clearError,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  openModal,
  closeModal,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  toggleSidebar,
  setActiveTab,
} = uiSlice.actions;

export default uiSlice.reducer;
