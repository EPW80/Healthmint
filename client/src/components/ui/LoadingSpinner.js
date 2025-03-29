// client/src/components/ui/LoadingSpinner.js
import React from "react";
import PropTypes from "prop-types";

/**
 * LoadingSpinner Component
 *
 * A standardized loading indicator that can be used throughout the application
 * with configurable size, appearance and proper accessibility attributes.
 */
const LoadingSpinner = ({
  size = "medium",
  color = "blue",
  label = "Loading...",
  showLabel = false,
  className = "",
  fullScreen = false,
}) => {
  // Size mappings
  const sizeClasses = {
    small: "h-4 w-4 border-2",
    medium: "h-8 w-8 border-3",
    large: "h-12 w-12 border-4",
  };

  // Color mappings
  const colorClasses = {
    blue: "border-blue-500 border-t-transparent",
    green: "border-green-500 border-t-transparent",
    purple: "border-purple-500 border-t-transparent",
    gray: "border-gray-500 border-t-transparent",
    white: "border-white border-t-transparent",
  };

  const spinnerClasses = `animate-spin ${sizeClasses[size] || sizeClasses.medium} ${colorClasses[color] || colorClasses.blue} rounded-full ${className}`;

  // If fullScreen, show it centered on the screen with a backdrop
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50"
        role="status"
        aria-live="polite"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
          <div className={spinnerClasses} aria-hidden="true"></div>
          <span className="mt-3 text-gray-700">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className={spinnerClasses} aria-hidden="true"></div>
      {showLabel && (
        <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
      )}
      {!showLabel && <span className="sr-only">{label}</span>}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  color: PropTypes.oneOf(["blue", "green", "purple", "gray", "white"]),
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  fullScreen: PropTypes.bool,
};

export default LoadingSpinner;
