// client/src/components/WalletErrorNotification.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  AlertCircle,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./WalletErrorNotification.css";

// This component displays a notification when there is an error with the wallet connection.
const WalletErrorNotification = ({
  message = "Wallet address not found. Please reconnect your wallet.",
  isVisible = true,
  onClose,
  autoRedirect = false,
  severity = "error", // 'error', 'warning', or 'info'
  errorDetails = null,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [expanded, setExpanded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);
  const notificationRef = useRef(null);

  // Determine severity-based styles
  const getSeverityStyles = () => {
    switch (severity) {
      case "warning":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          icon: (
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
          ),
          button: "bg-amber-100 hover:bg-amber-200 text-amber-800",
          hoverClose: "hover:text-amber-700",
          ring: "focus:ring-amber-500",
          detailsBg: "bg-amber-100/50",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          icon: (
            <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
          ),
          button: "bg-blue-100 hover:bg-blue-200 text-blue-800",
          hoverClose: "hover:text-blue-700",
          ring: "focus:ring-blue-500",
          detailsBg: "bg-blue-100/50",
        };
      default: // error
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: (
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          ),
          button: "bg-red-100 hover:bg-red-200 text-red-800",
          hoverClose: "hover:text-red-700",
          ring: "focus:ring-red-500",
          detailsBg: "bg-red-100/50",
        };
    }
  };

  const styles = getSeverityStyles();

  // Handle reconnect action
  const handleReconnect = useCallback(() => {
    setIsExiting(true);

    // Allow animation to complete before navigating
    setTimeout(() => {
      // Clear any stale wallet data
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_user_role");

      // Redirect to login page
      navigate("/login", { replace: true });
    }, 300);
  }, [navigate]);

  // Handle dismiss action with animation - wrap with useCallback
  const handleDismiss = useCallback(() => {
    setIsExiting(true);

    // Wait for exit animation to complete
    setTimeout(() => {
      setDismissed(true);
      if (onClose) onClose();
    }, 300);
  }, [onClose]); // Include onClose in the dependency array

  // Handle click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        handleDismiss();
      }
    };

    // Add event listener only if component is visible
    if (isVisible && !dismissed) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, dismissed, handleDismiss]); // Add handleDismiss to the dependency array

  // Effect to handle auto-redirect with countdown
  useEffect(() => {
    if (isVisible && autoRedirect && !dismissed) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleReconnect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isVisible, autoRedirect, dismissed, handleReconnect]);

  // Handle keyboard accessibility
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isVisible && !dismissed) {
        handleDismiss();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, dismissed, handleDismiss]); // Add handleDismiss to the dependency array

  if (!isVisible || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center items-center px-4 pt-4"
      aria-live="assertive"
      role="alert"
    >
      <div
        ref={notificationRef}
        className={`${styles.bg} ${styles.border} ${styles.text} 
                  px-4 py-3 rounded-lg shadow-lg 
                  max-w-md w-full transform transition-all duration-300
                  ${isExiting ? "opacity-0 translate-y-[-20px]" : "opacity-100 translate-y-0"}
                  animate-notification-slide-in`}
      >
        <div className="flex items-start">
          {styles.icon}
          <div className="ml-3 flex-1">
            <p className="font-medium">{message}</p>

            {errorDetails && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`text-sm underline ${styles.text} opacity-80 flex items-center`}
                  aria-expanded={expanded}
                >
                  {expanded ? "Hide details" : "Show details"}
                  <ExternalLink size={14} className="ml-1" />
                </button>

                {expanded && (
                  <div
                    className={`mt-2 p-2.5 rounded text-sm ${styles.detailsBg} font-mono overflow-x-auto max-h-32`}
                  >
                    {errorDetails}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className={`${styles.text} ${styles.hoverClose} ${styles.ring} 
                      focus:outline-none focus:ring-2 focus:ring-opacity-50 rounded-full p-1 ml-1`}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-between items-center mt-3">
          <div className="flex space-x-3">
            <button
              onClick={handleReconnect}
              className={`px-3 py-1.5 ${styles.button} rounded font-medium text-sm transition-colors
                        focus:outline-none ${styles.ring} focus:ring-2 focus:ring-opacity-50`}
            >
              Reconnect Wallet
            </button>

            <button
              onClick={handleDismiss}
              className={`px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
                        rounded font-medium text-sm transition-colors focus:outline-none focus:ring-2
                        focus:ring-gray-400 focus:ring-opacity-50`}
            >
              Dismiss
            </button>
          </div>

          {autoRedirect && (
            <div className="flex items-center">
              <Clock size={14} className="mr-1.5" />
              <span className="text-sm">Redirecting in {countdown}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

WalletErrorNotification.propTypes = {
  message: PropTypes.string,
  isVisible: PropTypes.bool,
  onClose: PropTypes.func,
  autoRedirect: PropTypes.bool,
  severity: PropTypes.oneOf(["error", "warning", "info"]),
  errorDetails: PropTypes.string,
};

export default WalletErrorNotification;
