// src/components/LogoutButton.js
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
import useWalletConnection from "../hooks/useWalletConnect.js";

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
  ...rest
}) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { disconnectWallet } = useWalletConnection();

  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-2.5 text-lg",
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    text: "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
  };

  const getSpinnerColor = () => {
    switch (variant) {
      case "primary":
      case "danger":
        return "white";
      case "secondary":
      case "text":
      default:
        return "gray";
    }
  };

  const baseClasses =
    "rounded-lg font-medium inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const buttonClasses = `${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`;

  const handleLogout = async () => {
    if (confirmLogout && !window.confirm("Are you sure you want to log out?"))
      return;

    try {
      setLoading(true);

      dispatch(
        addNotification({
          type: "info",
          message: "Logging you out...",
          duration: 2000,
        })
      );

      // Clear Redux state first
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      // Try to disconnect the wallet
      try {
        if (disconnectWallet) {
          await disconnectWallet();
          console.log("Wallet disconnected successfully");
        }
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        // Continue with the logout process regardless
      }

      // Set flag to ensure we're redirected to login page
      sessionStorage.setItem("force_wallet_reconnect", "true");

      // Explicitly clear role-related storage items
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_is_new_user");
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");

      // Clear any bypass flags that might interfere with routing
      sessionStorage.removeItem("bypass_route_protection");
      sessionStorage.removeItem("temp_selected_role");
      sessionStorage.removeItem("bypass_role_check");
      sessionStorage.removeItem("auth_verification_override");

      // Call the performLogout function with explicit redirection to login
      await performLogout({
        redirectToLogin: true,
        clearLocalStorage: true,
        clearSessionStorage: true,
        useHardRedirect: true,
      });

      // If we get here, perform a hard redirect as a fallback
      window.location.href = "/login";

      setLoading(false); // This won't be hit if the redirect works
    } catch (error) {
      console.error("Logout error:", error);

      // Fallback - force redirect to login page
      window.location.replace("/login");
    }
  };

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleLogout}
      disabled={loading}
      aria-busy={loading}
      {...rest}
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
