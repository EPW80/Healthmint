// src/redux/slices/notificationSlice.js
import { createSlice } from "@reduxjs/toolkit";

export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
};

const initialState = {
  notifications: [],
  maxNotifications: 5, // Maximum number of notifications to show at once
};

const generateId = () => {
  return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id: action.payload.id || generateId(),
        type: action.payload.type || NOTIFICATION_TYPES.INFO,
        message: action.payload.message,
        timestamp: Date.now(),
        duration: action.payload.duration || 5000,
        persistent: action.payload.persistent || false,
        data: action.payload.data || null,
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

    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

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

    updateNotification: (state, action) => {
      const { id, ...updates } = action.payload;
      const index = state.notifications.findIndex((n) => n.id === id);

      if (index !== -1) {
        state.notifications[index] = {
          ...state.notifications[index],
          ...updates,
          timestamp: updates.timestamp || state.notifications[index].timestamp,
        };
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
  updateNotification,
} = notificationSlice.actions;

// Export selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectMaxNotifications = (state) =>
  state.notifications.maxNotifications;
export const selectNotificationById = (id) => (state) =>
  state.notifications.notifications.find(
    (notification) => notification.id === id
  );
export const selectHasNotifications = (state) =>
  state.notifications.notifications.length > 0;
export const selectNotificationsByType = (type) => (state) =>
  state.notifications.notifications.filter(
    (notification) => notification.type === type
  );

export const addInfoNotification =
  (message, options = {}) =>
  (dispatch) => {
    dispatch(
      addNotification({
        type: NOTIFICATION_TYPES.INFO,
        message,
        ...options,
      })
    );
  };

export const addSuccessNotification =
  (message, options = {}) =>
  (dispatch) => {
    dispatch(
      addNotification({
        type: NOTIFICATION_TYPES.SUCCESS,
        message,
        ...options,
      })
    );
  };

export const addWarningNotification =
  (message, options = {}) =>
  (dispatch) => {
    dispatch(
      addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        message,
        ...options,
      })
    );
  };

export const addErrorNotification =
  (message, options = {}) =>
  (dispatch) => {
    dispatch(
      addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        message,
        duration: options.duration || 8000, // default duration for error notifications
        ...options,
      })
    );
  };

export default notificationSlice.reducer;
