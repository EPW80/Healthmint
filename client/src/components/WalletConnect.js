// src/components/WalletConnect.js
import React, { useState, useEffect, useCallback } from "react";
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

const WalletConnect = ({ onConnect }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  // Wallet and auth hooks
  const {
    connectWallet,
    switchNetwork,
    error: walletError,
    loading: walletLoading,
    address,
    isConnected,
    network,
  } = useWalletConnection({ autoConnect: true });

  const {
    login,
    isRegistrationComplete,
    isNewUser,
    error: authError,
    loading: authLoading,
  } = useAuth();

  // Derived states
  const isLoading = walletLoading || authLoading || isConnecting;
  const combinedError = error || walletError || authError;
  const showNetworkWarning = isConnected && network && !network.isSupported;

  // Handle logout cleanup on mount
  useEffect(() => {
    const isLogoutInProgress =
      sessionStorage.getItem("logout_in_progress") === "true";
    if (isLogoutInProgress) {
      console.log("WalletConnect: Clearing logout state");
      sessionStorage.removeItem("logout_in_progress");
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
    }

    // Cleanup reconnection flag
    sessionStorage.removeItem("force_wallet_reconnect");

    if (!isConnected) {
      console.log("WalletConnect: No connection detected, resetting state");
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
    }
  }, [isConnected]);

  // Handle redirection after connection
  useEffect(() => {
    if (!isConnected || isLoading || combinedError) return;

    console.log("WalletConnect: Connection established", {
      isRegistrationComplete,
      isNewUser,
    });

    const redirectUser = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure auth state settles
      const userRole = localStorage.getItem("healthmint_user_role");

      if (isRegistrationComplete && userRole) {
        console.log("WalletConnect: Redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      } else if (isRegistrationComplete) {
        console.log("WalletConnect: Redirecting to role selection");
        navigate("/select-role", { replace: true });
      } else if (isNewUser) {
        console.log("WalletConnect: Redirecting to registration");
        navigate("/register", { replace: true });
      }
    };

    redirectUser();
  }, [
    isConnected,
    isLoading,
    isRegistrationComplete,
    isNewUser,
    navigate,
    combinedError,
  ]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsErrorDismissed(false);

    try {
      console.log("WalletConnect: Initiating connection...");
      const walletResult = await connectWallet();

      if (!walletResult?.success) {
        throw new Error(walletResult?.error || "Wallet connection failed");
      }

      const walletAddress = walletResult.address;
      localStorage.setItem("healthmint_wallet_address", walletAddress);
      localStorage.setItem("healthmint_wallet_connection", "true");

      dispatch(
        addNotification({
          type: "success",
          message: "Wallet connected successfully!",
          duration: 3000,
        })
      );

      const authResult = await login(walletAddress);
      if (!authResult?.success) {
        throw new Error(authResult?.message || "Authentication failed");
      }

      console.log("WalletConnect: Authentication successful");
      if (onConnect) onConnect(authResult);
    } catch (err) {
      console.error("WalletConnect: Connection error:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to connect wallet",
          duration: 5000,
        })
      );
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
    } finally {
      setIsConnecting(false);
    }
  }, [connectWallet, login, dispatch, onConnect]);

  // Handle network switch
  const handleSwitchNetwork = useCallback(
    () => switchNetwork(),
    [switchNetwork]
  );

  // UI Components
  const renderStepIndicator = () => (
    <ol className="flex items-center w-full mb-8">
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
          <span className="ml-2 text-sm font-medium truncate">{step}</span>
          {index < STEPS.length - 1 && (
            <div className="w-full h-[2px] bg-gray-200 ml-2" />
          )}
        </li>
      ))}
    </ol>
  );

  const renderStatusMessages = () => (
    <>
      {isLoading && !combinedError && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Loader size={20} className="text-blue-500 animate-spin" />
          <span>Connecting to your wallet...</span>
        </div>
      )}
      {showNetworkWarning && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-500" />
          <span>
            Connected to {network.name}. Please switch to Sepolia Testnet.
          </span>
          <button
            onClick={handleSwitchNetwork}
            className="ml-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-300"
          >
            Switch
          </button>
        </div>
      )}
      {combinedError && !isErrorDismissed && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          <span>{combinedError}</span>
          <button
            onClick={() => setIsErrorDismissed(true)}
            className="text-red-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );

  const renderConnectButton = () => (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold shadow-md transition-all duration-300 ${
        isLoading
          ? "bg-blue-400 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
      }`}
    >
      {isLoading ? (
        <>
          <Loader size={20} className="animate-spin mr-3" />
          Connecting...
        </>
      ) : (
        <>
          <WalletIcon className="mr-2" size={20} />
          Connect MetaMask
        </>
      )}
    </button>
  );

  const renderConnectedInfo = () =>
    address && (
      <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center gap-2">
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
              <CheckCircle size={12} />
            ) : (
              <AlertTriangle size={12} />
            )}
            {network.name || "Unknown Network"}
          </span>
        )}
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-300">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          Welcome to Healthmint
        </h1>

        {renderStepIndicator()}
        {renderStatusMessages()}
        {renderConnectButton()}
        {renderConnectedInfo()}

        <div className="mt-6 text-center text-xs text-gray-500">
          By connecting your wallet, you agree to our{" "}
          <a href="/terms" className="text-blue-500 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-blue-500 hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

WalletConnect.propTypes = {
  onConnect: PropTypes.func,
};

export default WalletConnect;
