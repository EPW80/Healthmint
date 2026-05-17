// src/components/ui/NotificationsContainer.js
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Check, AlertCircle, Info, AlertTriangle } from "lucide-react";

// Import notification actions
import { removeNotification } from "../../redux/slices/notificationSlice.js";

// Icon map for notification types
const NotificationIcon = ({ type, size = 20 }) => {
  switch (type) {
    case "success":
      return <Check size={size} className="text-white" />;
    case "error":
      return <AlertCircle size={size} className="text-white" />;
    case "warning":
      return <AlertTriangle size={size} className="text-white" />;
    case "info":
    default:
      return <Info size={size} className="text-white" />;
  }
};

// Background color map for notification types
const getBackgroundColor = (type) => {
  switch (type) {
    case "success":
      return "bg-green-500";
    case "error":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    case "info":
    default:
      return "bg-blue-500";
  }
};

// Notification container component
const NotificationsContainer = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(
    (state) => state.notifications.notifications
  );

  // Auto-dismiss notifications after a specified duration
  useEffect(() => {
    const timers = {};

    notifications.forEach((notification) => {
      // Only set timer if not persistent and timer doesn't already exist
      if (!notification.persistent && !timers[notification.id]) {
        timers[notification.id] = setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, notification.duration || 5000); // Default to 5 seconds
      }
    });

    // Cleanup timers on unmount or when notifications change
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  // Handle closing a notification
  const handleClose = (id) => {
    dispatch(removeNotification(id));
  };

  // Early return if no notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg shadow-lg overflow-hidden ${getBackgroundColor(notification.type)} transform transition-all duration-500 animate-slideIn`}
          style={{ maxWidth: "calc(100vw - 48px)" }}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center p-4">
            <div className="flex-shrink-0 mr-3">
              <NotificationIcon type={notification.type} />
            </div>
            <div className="flex-1 mr-4">
              <p className="text-white font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => handleClose(notification.id)}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full p-1"
              aria-label="Close notification"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsContainer;
