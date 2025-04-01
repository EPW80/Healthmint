// client/src/components/LogoutButton.js
import React, { useState } from "react";
import PropTypes from "prop-types";
import { LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { performLogout } from "../utils/authLoopPrevention.js";
import { clearWalletConnection } from "../redux/slices/walletSlice.js";
import { clearRole } from "../redux/slices/roleSlice.js";
import { clearUserProfile } from "../redux/slices/userSlice.js";
import LoadingSpinner from "./ui/LoadingSpinner";

/**
 * A reliable logout button that properly redirects to login page
 * and prevents authentication loops
 *
 * @param {Object} props Component props
 * @returns {JSX.Element} Logout button component
 */
const LogoutButton = ({
  variant = "primary",
  size = "md",
  showIcon = true,
  confirmLogout = false,
  className = "",
  ...props
}) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Button size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-2.5 text-lg",
  };

  // Button variant classes
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    text: "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
  };

  // Determine the appropriate spinner color based on the button variant
  const getSpinnerColor = () => {
    switch (variant) {
      case "primary":
      case "danger":
        return "white"; // Use white spinner for dark backgrounds
      case "secondary":
      case "text":
      default:
        return "gray"; // Use gray spinner for light backgrounds
    }
  };

  const baseClasses =
    "rounded-lg font-medium inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const buttonClasses = `${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`;

  /**
   * Handle logout click with confirmation option
   */
  const handleLogout = async () => {
    if (confirmLogout) {
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (!confirmed) return;
    }

    try {
      setLoading(true);

      // Show notification first before redirect
      dispatch(
        addNotification({
          type: "info",
          message: "Logging you out...",
          duration: 2000,
        })
      );

      // Clear Redux state before redirecting
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      // Use our enhanced logout function with all options enabled
      await performLogout({
        redirectToLogin: true,
        clearLocalStorage: true,
        clearSessionStorage: true,
        useHardRedirect: true,
      });

      // We won't reach this point because performLogout redirects,
      // but we'll include it for completeness
      setLoading(false);
    } catch (error) {
      console.error("Logout error:", error);

      // If there's an error, force the logout anyway
      performLogout();
    }
  };

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleLogout}
      disabled={loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner
            size="small"
            color={getSpinnerColor()}
            className="mr-2"
          />
          <span>Logging out...</span>
        </>
      ) : (
        <>
          {showIcon && <LogOut size={18} className="mr-2" aria-hidden="true" />}
          <span>Log out</span>
        </>
      )}
    </button>
  );
};

LogoutButton.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "text"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  showIcon: PropTypes.bool,
  confirmLogout: PropTypes.bool,
  className: PropTypes.string,
};

export default LogoutButton;
