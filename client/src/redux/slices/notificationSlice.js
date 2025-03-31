// src/redux/slices/notificationSlice.js
import { createSlice } from "@reduxjs/toolkit";

/**
 * Notification types for use throughout the application
 */
export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
};

/**
 * Initial state for the notifications slice
 */
const initialState = {
  notifications: [],
  maxNotifications: 5, // Maximum number of notifications to show at once
};

/**
 * Generate a unique ID for notifications
 * @returns {string} A unique notification ID
 */
const generateId = () => {
  return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Notification slice to manage application notifications/alerts
 */
const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /**
     * Add a new notification
     * @param {Object} action.payload - Notification data
     * @param {string} action.payload.message - Notification message
     * @param {string} [action.payload.type="info"] - Notification type (info, success, warning, error)
     * @param {number} [action.payload.duration=5000] - Auto-dismiss after duration (in ms)
     * @param {boolean} [action.payload.persistent=false] - Whether notification requires manual dismissal
     * @param {Object} [action.payload.data] - Additional data for the notification
     */
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

    /**
     * Remove a notification by ID
     * @param {string} action.payload - Notification ID to remove
     */
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },

    /**
     * Set the maximum number of notifications
     * @param {number} action.payload - Maximum number of notifications
     */
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

    /**
     * Update an existing notification
     * @param {Object} action.payload - Notification data with ID
     * @param {string} action.payload.id - ID of notification to update
     */
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

/**
 * Action creator to add an info notification
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Function} Thunk action
 */
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

/**
 * Action creator to add a success notification
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Function} Thunk action
 */
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

/**
 * Action creator to add a warning notification
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Function} Thunk action
 */
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

/**
 * Action creator to add an error notification
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Function} Thunk action
 */
export const addErrorNotification =
  (message, options = {}) =>
  (dispatch) => {
    dispatch(
      addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        message,
        duration: options.duration || 8000, // Error notifications last longer by default
        ...options,
      })
    );
  };

// Export reducer
export default notificationSlice.reducer;
