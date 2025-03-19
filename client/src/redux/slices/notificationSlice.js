// src/redux/slices/notificationSlice.js
import * as pkg from "@reduxjs/toolkit";

const { createSlice } = pkg;

// Initial state for notifications
const initialState = {
  notifications: [],
  maxNotifications: 5, // Maximum number of notifications to show at once
};

// Generate a unique ID for notifications
const generateId = () => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create the notification slice
const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Add a new notification
    addNotification: (state, action) => {
      const notification = {
        id: generateId(),
        type: action.payload.type || "info", // info, success, warning, error
        message: action.payload.message,
        timestamp: Date.now(),
        duration: action.payload.duration || 5000, // Auto-dismiss after 5s by default
        persistent: action.payload.persistent || false, // Whether notification requires manual dismissal
      };

      // Add to the beginning of the array (newest first)
      state.notifications.unshift(notification);

      // Limit the number of notifications
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(
          0,
          state.maxNotifications
        );
      }
    },

    // Remove a notification by ID
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Set the maximum number of notifications
    setMaxNotifications: (state, action) => {
      state.maxNotifications = action.payload;

      // Apply the limit immediately if needed
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(
          0,
          state.maxNotifications
        );
      }
    },
  },
});

// Export actions
export const {
  addNotification,
  removeNotification,
  clearNotifications,
  setMaxNotifications,
} = notificationSlice.actions;

// Export selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectMaxNotifications = (state) =>
  state.notifications.maxNotifications;

// Export reducer
export default notificationSlice.reducer;
