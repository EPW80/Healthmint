// client/src/components/WalletErrorNotification.js
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// WalletErrorNotification: A component to display a notification when wallet connection fails
const WalletErrorNotification = ({
  message = "Wallet address not found. Please reconnect your wallet.",
  isVisible = true,
  onClose,
  autoRedirect = false,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Memoize handleReconnect to avoid recreating it on each render
  const handleReconnect = useCallback(() => {
    // Clear any stale wallet data
    localStorage.removeItem("healthmint_wallet_address");
    localStorage.removeItem("healthmint_wallet_connection");

    // Redirect to login page
    navigate("/login", { replace: true });
  }, [navigate]);

  // Effect to handle auto-redirect
  useEffect(() => {
    let timeoutId;

    if (isVisible && autoRedirect && !dismissed) {
      timeoutId = setTimeout(() => {
        handleReconnect();
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, autoRedirect, dismissed, handleReconnect]);

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  if (!isVisible || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center items-center px-4">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-md flex items-center gap-2 max-w-md w-full">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
        <span className="flex-1">{message}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReconnect}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
          >
            Reconnect
          </button>
          <button
            onClick={handleDismiss}
            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
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
};

export default WalletErrorNotification;
