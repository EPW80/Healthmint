// client/src/components/ui/ErrorDisplay.js
import React from "react";
import PropTypes from "prop-types";
import { AlertCircle, X, RefreshCw } from "lucide-react";

/**
 * ErrorDisplay Component
 *
 * A standardized error display component for consistent error handling across the application
 */
const ErrorDisplay = ({
  error,
  onDismiss,
  onRetry,
  showRetry = true,
  className = "",
  size = "default", // 'small', 'default', 'large'
}) => {
  const message =
    typeof error === "string" ? error : error?.message || "An error occurred";

  // Define classes based on size
  const containerClasses = {
    small: "p-2 text-xs",
    default: "p-4 text-sm",
    large: "p-6 text-base",
  };

  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start ${containerClasses[size]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle
        className={`text-red-500 flex-shrink-0 ${size === "small" ? "w-4 h-4 mr-1" : size === "large" ? "w-6 h-6 mr-3" : "w-5 h-5 mr-2"}`}
      />

      <div className="flex-1 pr-2">
        <p className={size === "large" ? "font-medium" : ""}>{message}</p>

        {/* Show stack trace in development */}
        {process.env.NODE_ENV !== "production" && error?.stack && (
          <details className="mt-1">
            <summary className="text-xs text-red-600 cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-red-600 overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}
      </div>

      <div className="flex items-center flex-shrink-0">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 ${size === "small" ? "mr-1" : ""}`}
            aria-label="Retry"
            title="Retry"
          >
            <RefreshCw size={size === "small" ? 14 : 16} />
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
            aria-label="Dismiss error"
          >
            <X size={size === "small" ? 14 : 16} />
          </button>
        )}
      </div>
    </div>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  onDismiss: PropTypes.func,
  onRetry: PropTypes.func,
  showRetry: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(["small", "default", "large"]),
};

export default ErrorDisplay;
