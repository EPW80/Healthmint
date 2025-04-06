// src/components/WalletStatus.js
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  Wallet,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";
import useWalletConnect from "../hooks/useWalletConnect.js";
import mockPaymentService from "../services/mockPaymentService.js";

/**
 * WalletStatus Component
 *
 * Displays the current wallet connection status, balance, and network information
 * with options to copy address, view on explorer, and refresh balance
 */
const WalletStatus = ({
  showBalance = true,
  showNetwork = true,
  showCopy = true,
  showExplorer = true,
  minimal = false,
  className = "",
}) => {
  // Get wallet information from Redux and hook
  const walletAddress = useSelector((state) => state.wallet.address);
  const {
    isConnected,
    network,
    getBalance: walletGetBalance, // Rename to avoid confusion
    disconnectWallet,
    switchNetwork, // Add switchNetwork to destructuring
    loading: walletLoading,
  } = useWalletConnect({
    autoConnect: false, // Don't auto-connect when viewing wallet status
  });

  // Local state
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return "Not Connected";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format balance for display
  const formatBalance = (balanceInWei) => {
    if (balanceInWei === null || balanceInWei === undefined) return "Unknown";

    // Check if it's already in ETH format (string with decimal)
    if (typeof balanceInWei === "string" && balanceInWei.includes(".")) {
      const balanceInEth = parseFloat(balanceInWei);
      // Format based on value
      if (balanceInEth === 0) return "0 ETH";
      if (balanceInEth < 0.001) return "< 0.001 ETH";
      if (balanceInEth < 0.1) return balanceInEth.toFixed(4) + " ETH";
      return balanceInEth.toFixed(3) + " ETH";
    }

    // Convert from Wei to ETH (division by 10^18)
    const balanceInEth = parseFloat(balanceInWei) / 1e18;

    // Format based on value
    if (balanceInEth === 0) return "0 ETH";
    if (balanceInEth < 0.001) return "< 0.001 ETH";
    if (balanceInEth < 0.1) return balanceInEth.toFixed(4) + " ETH";
    return balanceInEth.toFixed(3) + " ETH";
  };

  // Get etherscan link for address
  const getExplorerLink = (address) => {
    if (!address) return "#";

    // Use the appropriate explorer based on network
    const baseUrl =
      network && network.chainId === 1
        ? "https://etherscan.io/address/"
        : "https://sepolia.etherscan.io/address/";

    return `${baseUrl}${address}`;
  };

  // Fetch the wallet balance
  const fetchBalance = useCallback(async () => {
    if (!walletAddress && !isConnected) return;

    try {
      setLoadingBalance(true);
      setError(null);

      // Make sure mockPaymentService is initialized
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      // Try all available methods to get balance, with proper fallbacks
      if (walletGetBalance) {
        try {
          const balanceResult = await walletGetBalance(walletAddress);
          setBalance(balanceResult);
          return;
        } catch (err) {
          console.log("Wallet get balance failed, trying fallback method", err);
          // Continue to next method if this one fails
        }
      }

      // Use mockPaymentService as fallback
      const balanceResult = await mockPaymentService.getBalance();
      setBalance(balanceResult);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
      setError("Failed to fetch balance");

      // Set a fallback balance to prevent UI issues
      setBalance("0.00");
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress, isConnected, walletGetBalance]);

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (!walletAddress) return;

    navigator.clipboard
      .writeText(walletAddress)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy address:", err);
        setError("Failed to copy address");
      });
  };

  // Fetch balance on component mount and when address changes
  useEffect(() => {
    if (showBalance) {
      // Initialize mockPaymentService first to ensure it's ready
      const init = async () => {
        try {
          if (!mockPaymentService.isInitialized) {
            await mockPaymentService.initializeProvider();
          }
          fetchBalance();
        } catch (err) {
          console.error("Error initializing payment service:", err);
          // Set a fallback balance
          setBalance("0.00");
        }
      };

      init();
    }
  }, [fetchBalance, showBalance, walletAddress]);

  // If the component is in minimal mode, render a compact version
  if (minimal) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        ></div>
        <span className="text-sm truncate max-w-[120px]">
          {isConnected ? formatAddress(walletAddress) : "Wallet Disconnected"}
        </span>
      </div>
    );
  }

  // If wallet is not connected, show disconnected state
  if (!isConnected || !walletAddress) {
    return (
      <div
        className={`bg-red-50 border border-red-100 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center">
          <XCircle className="text-red-500 mr-2" size={20} />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Wallet Disconnected
            </h3>
            <p className="text-xs text-red-700 mt-1">
              Connect your wallet to access the application.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Network warning for unsupported networks
  const renderNetworkWarning = () => {
    if (!showNetwork || !network || network.isSupported) return null;

    return (
      <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-md p-2">
        <div className="flex items-center">
          <AlertTriangle className="text-yellow-500 mr-2" size={16} />
          <div>
            <p className="text-xs text-yellow-700">
              Connected to <span className="font-medium">{network.name}</span>.
              Please switch to Sepolia Testnet.
            </p>
            <button
              onClick={switchNetwork} // Now this properly references the function from useWalletConnect
              className="text-xs text-yellow-600 hover:text-yellow-800 font-medium mt-1"
            >
              Switch Network
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Primary component render
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <Wallet className="text-green-600" size={20} />
          </div>
          <div>
            <h3 className="font-medium">Connected Wallet</h3>
            <div className="flex items-center mt-1">
              <span className="text-gray-500 text-sm">
                {formatAddress(walletAddress)}
              </span>

              {/* Copy button */}
              {showCopy && (
                <button
                  onClick={copyAddressToClipboard}
                  className="ml-2 text-gray-400 hover:text-gray-600 p-1"
                  title="Copy address"
                  aria-label="Copy wallet address"
                >
                  {copied ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}

              {/* Explorer link */}
              {showExplorer && (
                <a
                  href={getExplorerLink(walletAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-gray-400 hover:text-gray-600 p-1"
                  title="View on Etherscan"
                  aria-label="View wallet on Etherscan"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Balance information */}
        {showBalance && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Balance</div>
            {loadingBalance ? (
              <LoadingSpinner size="small" />
            ) : error ? (
              <div className="text-red-500 text-sm">Error</div>
            ) : (
              <div className="flex items-center">
                <span className="font-medium">{formatBalance(balance)}</span>
                <button
                  onClick={fetchBalance}
                  className="ml-2 text-gray-400 hover:text-gray-600 p-1"
                  title="Refresh balance"
                  aria-label="Refresh wallet balance"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Network information */}
      {showNetwork && network && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full ${network.isSupported ? "bg-green-500" : "bg-yellow-500"} mr-2`}
            ></div>
            <span className="text-sm text-gray-600">
              Network:{" "}
              <span className="font-medium">{network.name || "Unknown"}</span>
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Chain ID: {network?.chainId || "Unknown"}
          </div>
        </div>
      )}

      {/* Network warning */}
      {renderNetworkWarning()}

      {/* Disconnect option */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center text-xs text-gray-500">
          <Info size={12} className="mr-1" />
          <span>Connected via MetaMask</span>
        </div>

        <button
          onClick={disconnectWallet}
          className="text-xs text-red-500 hover:text-red-700"
          disabled={walletLoading}
        >
          {walletLoading ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    </div>
  );
};

WalletStatus.propTypes = {
  showBalance: PropTypes.bool,
  showNetwork: PropTypes.bool,
  showCopy: PropTypes.bool,
  showExplorer: PropTypes.bool,
  minimal: PropTypes.bool,
  className: PropTypes.string,
};

export default WalletStatus;
