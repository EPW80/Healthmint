// client/src/components/ui/ErrorDisplay.js
import React from "react";
import PropTypes from "prop-types";
import { AlertCircle, X, RefreshCw } from "lucide-react";

const ErrorDisplay = ({
  error,
  onDismiss,
  onRetry,
  showRetry = true,
  className = "",
  size = "default",
}) => {
  const message =
    typeof error === "string" ? error : error?.message || "An error occurred";

  const containerClasses = {
    small:   "p-2 text-xs",
    default: "p-4 text-sm",
    large:   "p-6 text-base",
  };

  const iconSize = size === "small" ? "w-4 h-4" : size === "large" ? "w-6 h-6" : "w-5 h-5";
  const iconMargin = size === "small" ? "mr-1" : size === "large" ? "mr-3" : "mr-2";
  const actionSize = size === "small" ? 14 : 16;

  return (
    <div
      className={`bg-danger-soft border border-danger/30 text-danger rounded-token flex items-start ${containerClasses[size]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className={`flex-shrink-0 ${iconSize} ${iconMargin}`} aria-hidden="true" />

      <div className="flex-1 pr-2">
        <p className={size === "large" ? "font-medium" : ""}>{message}</p>

        {process.env.NODE_ENV !== "production" && error?.stack && (
          <details className="mt-1">
            <summary className="text-xs text-danger/80 cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-danger/80 overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}
      </div>

      <div className="flex items-center flex-shrink-0">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`p-1 rounded hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${size === "small" ? "mr-1" : ""}`}
            aria-label="Retry"
            title="Retry"
          >
            <RefreshCw size={actionSize} aria-hidden="true" />
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Dismiss error"
          >
            <X size={actionSize} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

ErrorDisplay.propTypes = {
  error:     PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  onDismiss: PropTypes.func,
  onRetry:   PropTypes.func,
  showRetry: PropTypes.bool,
  className: PropTypes.string,
  size:      PropTypes.oneOf(["small", "default", "large"]),
};

export default ErrorDisplay;
