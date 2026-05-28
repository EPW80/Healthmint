// src/components/ui/NotificationsContainer.js
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Check, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { removeNotification } from "../../redux/slices/notificationSlice.js";

const TYPE_ICONS = {
  success: Check,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

// Soft-tinted panels keyed by notification type.
const TYPE_CLASSES = {
  success: "bg-success-soft border-success/30 text-success",
  error:   "bg-danger-soft border-danger/30 text-danger",
  warning: "bg-warning-soft border-warning/30 text-warning",
  info:    "bg-info-soft border-info/30 text-info",
};

const NotificationsContainer = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(
    (state) => state.notifications.notifications
  );

  // Auto-dismiss after duration.
  useEffect(() => {
    const timers = {};

    notifications.forEach((notification) => {
      if (!notification.persistent && !timers[notification.id]) {
        timers[notification.id] = setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, notification.duration || 5000);
      }
    });

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  const handleClose = (id) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full"
      aria-label="Notifications"
    >
      {notifications.map((notification) => {
        const Icon = TYPE_ICONS[notification.type] || Info;
        const typeClass = TYPE_CLASSES[notification.type] || TYPE_CLASSES.info;

        return (
          <div
            key={notification.id}
            className={`rounded-token border shadow-soft-md overflow-hidden ${typeClass}`}
            style={{ maxWidth: "calc(100vw - 48px)" }}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center p-4 gap-3">
              <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
              <p className="flex-1 font-medium text-sm">{notification.message}</p>
              <button
                onClick={() => handleClose(notification.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-current/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Close notification"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationsContainer;
