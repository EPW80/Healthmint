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
import HashDisplay from "./ui/HashDisplay.js";

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

  const handleSwitchNetwork = useCallback(
    () => switchNetwork(),
    [switchNetwork]
  );

  // UI Components
  const renderStepIndicator = () => (
    <ol className="flex items-start w-full mb-8">
      {STEPS.map((step, index) => {
        const isActive = index === 0;
        const isLast = index === STEPS.length - 1;
        return (
          <React.Fragment key={step}>
            <li className="flex flex-col items-center flex-shrink-0">
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold ${
                  isActive
                    ? "bg-accent text-accent-fg border-accent"
                    : "bg-surface text-fg-muted border-line"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isActive ? "text-fg" : "text-fg-muted"
                }`}
              >
                {step}
              </span>
            </li>
            {!isLast && (
              <div
                className="flex-1 h-px bg-line mt-4 mx-2"
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );

  const renderStatusMessages = () => (
    <>
      {isLoading && !combinedError && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 bg-info-soft border border-info/30 text-info px-4 py-3 rounded-token flex items-center gap-2 text-sm"
        >
          <Loader size={18} className="animate-spin" aria-hidden="true" />
          <span>Connecting to your wallet...</span>
        </div>
      )}
      {showNetworkWarning && (
        <div className="mb-6 bg-warning-soft border border-warning/30 text-warning px-4 py-3 rounded-token flex items-center gap-2 text-sm">
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="flex-1">
            Connected to {network.name}. Please switch to Sepolia Testnet.
          </span>
          <button
            onClick={handleSwitchNetwork}
            className="px-3 py-1 bg-warning/20 hover:bg-warning/30 text-warning rounded-token-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Switch
          </button>
        </div>
      )}
      {combinedError && !isErrorDismissed && (
        <div
          role="alert"
          className="mb-6 bg-danger-soft border border-danger/30 text-danger px-4 py-3 rounded-token flex items-center gap-2 text-sm"
        >
          <AlertCircle size={18} aria-hidden="true" />
          <span className="flex-1">{combinedError}</span>
          <button
            onClick={() => setIsErrorDismissed(true)}
            className="p-1 rounded text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Dismiss error"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );

  const renderConnectButton = () => (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-token bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-accent-fg font-semibold shadow-soft-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {isLoading ? (
        <>
          <Loader size={18} className="animate-spin" aria-hidden="true" />
          Connecting...
        </>
      ) : (
        <>
          <WalletIcon size={18} aria-hidden="true" />
          Connect MetaMask
        </>
      )}
    </button>
  );

  const renderConnectedInfo = () =>
    address && (
      <div className="mt-6 p-4 rounded-token bg-surface-raised border border-line flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-fg-muted text-sm">
          <WalletIcon size={14} aria-hidden="true" />
          <span>Connected:</span>
          <HashDisplay value={address} className="text-fg" />
        </div>
        {network && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              network.isSupported
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            {network.isSupported ? (
              <CheckCircle size={12} aria-hidden="true" />
            ) : (
              <AlertTriangle size={12} aria-hidden="true" />
            )}
            {network.name || "Unknown Network"}
          </span>
        )}
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="max-w-md w-full bg-surface border border-line rounded-token-lg shadow-soft-md p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-accent-fg rounded-full" />
          </div>
          <h1 className="text-2xl font-bold text-center text-fg">
            Welcome to Healthmint
          </h1>
          <p className="text-fg-muted text-sm text-center">
            Connect your wallet to continue
          </p>
        </div>

        {renderStepIndicator()}
        {renderStatusMessages()}
        {renderConnectButton()}
        {renderConnectedInfo()}

        <div className="mt-6 text-center text-xs text-fg-subtle">
          By connecting your wallet, you agree to our{" "}
          <a
            href="/terms"
            className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
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
