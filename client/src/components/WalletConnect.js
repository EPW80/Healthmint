// src/components/WalletConnect.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { WalletIcon, AlertCircle } from "../icons/index.js";
import { X, CheckCircle, AlertTriangle, Loader } from "lucide-react";
import useWalletConnection from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";

// Constants
const STEPS = ["Connect Wallet", "Registration", "Complete Profile"];

// WalletConnect component
const WalletConnect = ({ onConnect }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState(null); // Added local error state

  // Get wallet connection state
  const {
    connectWallet,
    switchNetwork,
    error: walletError,
    loading: walletLoading,
    address,
    isConnected,
    network,
  } = useWalletConnection({
    autoConnect: true, // Try to auto-connect on page load
  });

  // Get auth state with registration info
  const {
    login,
    isRegistrationComplete,
    isNewUser,
    error: authError,
    loading: authLoading,
  } = useAuth();

  // Combined error and loading states
  const error = localError || walletError || authError;
  const loading = walletLoading || authLoading || isConnecting;

  // If auto-connect fails, we want to make it easy for the user to initiate the connection
  const showNetworkWarning = isConnected && network && !network.isSupported;

  // Clear reconnection flags and clean up wallet state
  useEffect(() => {
    // Clear any forced reconnect flags when we reach this component
    sessionStorage.removeItem("force_wallet_reconnect");

    // If we're on the login page and the wallet is not connected,
    // clean up any potentially stale connection data
    if (!isConnected) {
      console.log("WalletConnect: Wallet not connected, cleaning up state");
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      // Reset connection state
      setIsConnecting(false);
      setErrorDismissed(false);
    }

    console.log("WalletConnect mounted, connection state:", {
      isConnected,
      address: address || "none",
      isNewUser,
      isRegistrationComplete,
    });
  }, [isConnected, address, isNewUser, isRegistrationComplete]);

  // Handle redirection after successful connection
  useEffect(() => {
    if (isConnected && !loading) {
      console.log("WalletConnect: Connection successful, preparing redirect", {
        isRegistrationComplete,
        isNewUser,
      });

      const redirectUser = async () => {
        if (isRegistrationComplete) {
          // If registration is complete, go to role selection or dashboard
          console.log("WalletConnect: Redirecting to role selection");
          navigate("/select-role", { replace: true });
        } else if (isNewUser) {
          // If new user, go to registration
          console.log("WalletConnect: Redirecting to registration");
          navigate("/register", { replace: true });
        }
      };

      redirectUser();
    }
  }, [isConnected, loading, isRegistrationComplete, isNewUser, navigate]);

  // Handle connect button click
  const handleConnect = async () => {
    setErrorDismissed(false);
    setIsConnecting(true);
    setLocalError(null); // Clear any previous local errors

    try {
      console.log("WalletConnect: Initiating wallet connection...");

      // First connect wallet
      const walletResult = await connectWallet();

      if (walletResult && walletResult.success) {
        console.log("WalletConnect: Wallet connected successfully");

        // Show success notification
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully!",
            duration: 3000,
          })
        );

        // Then handle authentication and user state
        const authResult = await login();

        if (authResult && authResult.success) {
          console.log("WalletConnect: Authentication successful");

          // Navigation is handled by the useEffect above based on user state
          if (onConnect) {
            onConnect(authResult);
          }
        } else {
          console.error(
            "WalletConnect: Authentication failed after wallet connection"
          );

          // Set an appropriate error message
          setLocalError(
            authResult?.message || "Authentication failed. Please try again."
          );
        }
      } else {
        console.error(
          "WalletConnect: Wallet connection failed",
          walletResult?.error
        );

        // Set an appropriate error message
        setLocalError(
          walletResult?.error || "Failed to connect wallet. Please try again."
        );

        // Clean up any partial state
        localStorage.removeItem("healthmint_wallet_address");
        localStorage.removeItem("healthmint_wallet_connection");
      }
    } catch (err) {
      console.error("WalletConnect: Connection error:", err);
      setLocalError(
        err.message || "Failed to connect wallet. Please try again."
      );

      // Show error notification for better visibility
      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to connect wallet. Please try again.",
          duration: 5000,
        })
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/30 transition-all duration-300 hover:shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Welcome to Healthmint
          </h1>

          {/* Steps Indicator */}
          <div className="mb-8">
            <ol className="flex items-center w-full">
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`flex items-center ${index < STEPS.length - 1 ? "w-full" : ""}`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                      index === 0
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-100 text-gray-500 border-gray-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="ml-2 text-sm font-medium truncate">
                    {step}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div className="w-full flex items-center ml-2">
                      <div className="h-[2px] w-full bg-gray-200"></div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Status Message - Loading */}
          {loading && !error && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Loader
                size={20}
                className="text-blue-500 animate-spin flex-shrink-0"
              />
              <span className="flex-1">Connecting to your wallet...</span>
            </div>
          )}

          {/* Network Warning */}
          {showNetworkWarning && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertTriangle
                size={20}
                className="text-yellow-500 flex-shrink-0"
              />
              <span className="flex-1">
                You're connected to {network.name}. Please switch to Sepolia
                Testnet.
              </span>
              <button
                onClick={() => switchNetwork()}
                className="ml-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
              >
                Switch
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && !errorDismissed && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                className="text-red-500 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full"
                onClick={() => setErrorDismissed(true)}
                aria-label="Dismiss error"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={loading || isConnecting}
            className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold ${
              loading || isConnecting
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            } shadow-md hover:shadow-lg transition-all duration-300`}
          >
            {loading || isConnecting ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connecting...
              </div>
            ) : (
              <div className="flex items-center">
                <WalletIcon className="mr-2" size={20} />
                Connect MetaMask
              </div>
            )}
          </button>

          {/* Connected Account Info */}
          {address && (
            <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center">
                  <WalletIcon size={16} className="text-blue-500 mr-2" />
                  <span className="text-blue-600 font-medium text-sm">
                    Connected: {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>

                {network && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      network.isSupported
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {network.isSupported ? (
                      <CheckCircle size={12} className="inline" />
                    ) : (
                      <AlertTriangle size={12} className="inline" />
                    )}
                    {network.name || "Unknown Network"}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By connecting your wallet, you agree to our{" "}
              <a href="/terms" className="text-blue-500 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-blue-500 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

WalletConnect.propTypes = {
  onConnect: PropTypes.func,
};

export default WalletConnect;
