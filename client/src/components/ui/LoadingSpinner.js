// client/src/components/ui/LoadingSpinner.js
import React, { memo } from "react";
import PropTypes from "prop-types";

const LoadingSpinner = ({
  size = "medium",
  color = "accent",
  label = "Loading...",
  showLabel = false,
  className = "",
  fullScreen = false,
  spinnerStyle = {},
}) => {
  const sizeClasses = {
    small:  "h-4 w-4 border-2",
    medium: "h-8 w-8 border-[3px]",
    large:  "h-12 w-12 border-4",
  };

  // Token-driven colors. Legacy names are aliases so existing callers don't break.
  const colorClasses = {
    accent:       "border-accent border-t-transparent",
    success:      "border-success border-t-transparent",
    current:      "border-current border-t-transparent",
    "on-accent":  "border-accent-fg border-t-transparent",
    muted:        "border-fg-muted border-t-transparent",
    // Legacy aliases
    blue:         "border-accent border-t-transparent",
    green:        "border-success border-t-transparent",
    purple:       "border-accent border-t-transparent",
    gray:         "border-fg-muted border-t-transparent",
    white:        "border-accent-fg border-t-transparent",
  };

  const spinnerClasses = `animate-spin rounded-full ${sizeClasses[size] || sizeClasses.medium} ${colorClasses[color] || colorClasses.accent}`;

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-fg/20 flex items-center justify-center z-50"
        role="status"
        aria-live="polite"
      >
        <div className="bg-surface-raised border border-line shadow-soft-lg p-6 rounded-token flex flex-col items-center">
          <div className={spinnerClasses} style={spinnerStyle} aria-hidden="true" />
          <span className="mt-3 text-fg text-sm">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={spinnerClasses} style={spinnerStyle} aria-hidden="true" />
      {showLabel && (
        <span className="ml-3 text-sm font-medium text-fg-muted">{label}</span>
      )}
      {!showLabel && <span className="sr-only">{label}</span>}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  color: PropTypes.oneOf([
    "accent", "success", "current", "on-accent", "muted",
    "blue", "green", "purple", "gray", "white",
  ]),
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  fullScreen: PropTypes.bool,
  spinnerStyle: PropTypes.object,
};

export default memo(LoadingSpinner);
