// src/hooks/useWalletConnect.js

/*global BigInt*/
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  setWalletAddress,
  clearWalletConnection,
  setWalletConnection,
} from "../redux/slices/walletSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * useWalletConnect Hook
 *
 * A hook for connecting to and interacting with Ethereum wallets,
 * with improved error handling and graceful fallbacks
 */
const useWalletConnect = (options = {}) => {
  const {
    autoConnect = false,
    showNotifications = true,
    logInteractions = true,
    simulateFunctions = true, // For development fallbacks
  } = options;

  const dispatch = useDispatch();

  // State
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [network, setNetwork] = useState(null);

  /**
   * Initialize wallet state from localStorage
   */
  useEffect(() => {
    // Check if user was previously connected
    const wasConnected =
      localStorage.getItem("healthmint_wallet_connection") === "true";
    const storedAddress = localStorage.getItem("healthmint_wallet_address");

    if (wasConnected && storedAddress && !isConnected) {
      setAddress(storedAddress);
      setIsConnected(true);

      // Update Redux state
      dispatch(setWalletAddress(storedAddress));

      // Get network info if we're connected
      if (window.ethereum) {
        getNetworkInfo()
          .then((networkInfo) => {
            setNetwork(networkInfo);
          })
          .catch(console.error);
      }
    }
  }, [dispatch, isConnected]);

  /**
   * Set up event listeners for wallet connection changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        handleDisconnect();
      } else if (accounts[0] !== address) {
        // User switched accounts
        const newAddress = accounts[0];
        setAddress(newAddress);
        setIsConnected(true);
        localStorage.setItem("healthmint_wallet_address", newAddress);
        localStorage.setItem("healthmint_wallet_connection", "true");
        dispatch(setWalletAddress(newAddress));

        // Log account change for HIPAA compliance
        if (logInteractions) {
          hipaaComplianceService.createAuditLog("WALLET_ACCOUNT_CHANGED", {
            previousAddress: address,
            newAddress,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    const handleChainChanged = (chainId) => {
      // Reload page when chain changes to ensure proper state update
      window.location.reload();
    };

    const handleDisconnect = () => {
      setAddress(null);
      setIsConnected(false);
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      dispatch(clearWalletConnection());

      // Log disconnection for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_DISCONNECTED", {
          previousAddress: address,
          timestamp: new Date().toISOString(),
          reason: "User disconnected or account changed",
        });
      }
    };

    // Add event listeners
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("disconnect", handleDisconnect);

    // Try auto connect if enabled
    if (autoConnect && !isConnected) {
      connectWallet().catch(console.error);
    }

    // Clean up event listeners on unmount
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [
    address,
    dispatch,
    autoConnect,
    connectWallet,
    isConnected,
    logInteractions,
  ]);

  /**
   * Get network information
   */
  const getNetworkInfo = useCallback(async () => {
    if (!window.ethereum || !window.ethereum.request) {
      // Use mock network info for development
      if (simulateFunctions) {
        return {
          chainId: "0xaa36a7", // Sepolia testnet
          name: "Sepolia",
          isSupported: true,
          isTestnet: true,
        };
      }

      throw new Error("Ethereum provider not available");
    }

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      let name, isSupported, isTestnet;

      switch (chainId) {
        case "0x1": // Mainnet
          name = "Ethereum Mainnet";
          isSupported = false; // We only want to use testnets for the app
          isTestnet = false;
          break;
        case "0xaa36a7": // Sepolia
          name = "Sepolia";
          isSupported = true;
          isTestnet = true;
          break;
        case "0x5": // Goerli
          name = "Goerli";
          isSupported = false;
          isTestnet = true;
          break;
        default:
          name = "Unknown Network";
          isSupported = false;
          isTestnet = false;
      }

      return { chainId, name, isSupported, isTestnet };
    } catch (error) {
      console.error("Error getting network info:", error);
      throw error;
    }
  }, [simulateFunctions]);

  /**
   * Connect to wallet
   */
  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        // Use simulation for development if enabled
        if (simulateFunctions) {
          console.log("Simulating wallet connection in development mode");
          const mockAddress = "0x" + "1234567890123456789012345678901234567890";
          setAddress(mockAddress);
          setIsConnected(true);

          // Save connection state to localStorage
          localStorage.setItem("healthmint_wallet_address", mockAddress);
          localStorage.setItem("healthmint_wallet_connection", "true");

          // Update Redux state
          dispatch(setWalletAddress(mockAddress));

          // Set simulated network
          setNetwork({
            chainId: "0xaa36a7", // Sepolia testnet
            name: "Sepolia",
            isSupported: true,
            isTestnet: true,
          });

          // Log simulated connection for HIPAA compliance
          if (logInteractions) {
            hipaaComplianceService.createAuditLog("WALLET_CONNECT_SIMULATED", {
              address: mockAddress,
              timestamp: new Date().toISOString(),
            });
          }

          setLoading(false);
          return { success: true, address: mockAddress };
        }

        throw new Error("Please install MetaMask to connect your wallet");
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found. Please connect to MetaMask.");
      }

      const connectedAddress = accounts[0];

      // Get network information
      const networkInfo = await getNetworkInfo();
      setNetwork(networkInfo);

      // Set connected state
      setAddress(connectedAddress);
      setIsConnected(true);

      // Save connection state to localStorage
      localStorage.setItem("healthmint_wallet_address", connectedAddress);
      localStorage.setItem("healthmint_wallet_connection", "true");

      // Update Redux state
      dispatch(setWalletAddress(connectedAddress));

      // Show notification if enabled
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully!",
            duration: 3000,
          })
        );
      }

      // Log connection for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_CONNECTED", {
          address: connectedAddress,
          network: networkInfo.name,
          timestamp: new Date().toISOString(),
        });
      }

      setLoading(false);
      return { success: true, address: connectedAddress };
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err.message || "Failed to connect wallet");
      setIsConnected(false);

      // Show notification if enabled
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "error",
            message: `Wallet connection failed: ${err.message || "Unknown error"}`,
            duration: 5000,
          })
        );
      }

      // Log connection error for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_CONNECT_ERROR", {
          error: err.message || "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }

      setLoading(false);
      return { success: false, error: err.message || "Connection failed" };
    }
  }, [
    dispatch,
    showNotifications,
    getNetworkInfo,
    logInteractions,
    simulateFunctions,
  ]);

  /**
   * Disconnect from wallet
   */
  const disconnectWallet = useCallback(async () => {
    setLoading(true);

    try {
      // Save current address for audit log
      const currentAddress = address;

      // Clear state
      setAddress(null);
      setIsConnected(false);

      // Remove from localStorage
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      // Clear from Redux
      dispatch(clearWalletConnection());

      // Show notification if enabled
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "info",
            message: "Wallet disconnected",
            duration: 3000,
          })
        );
      }

      // Log disconnection for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_DISCONNECTED", {
          previousAddress: currentAddress,
          timestamp: new Date().toISOString(),
          reason: "User initiated disconnect",
        });
      }

      // If MetaMask is available and has disconnect method (newer versions)
      if (window.ethereum && window.ethereum.disconnect) {
        await window.ethereum.disconnect();
      }

      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error disconnecting wallet:", err);

      // Still clear local state even on error
      setAddress(null);
      setIsConnected(false);
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      dispatch(clearWalletConnection());

      // Log error for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_DISCONNECT_ERROR", {
          error: err.message || "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }

      setLoading(false);
      return false;
    }
  }, [address, dispatch, showNotifications, logInteractions]);

  /**
   * Switch to supported network
   */
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum || !window.ethereum.request) {
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "error",
            message: "Ethereum provider not available",
            duration: 5000,
          })
        );
      }
      return false;
    }

    setLoading(true);

    try {
      // Add Sepolia network if needed
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia testnet
      });

      // Update network info
      const networkInfo = await getNetworkInfo();
      setNetwork(networkInfo);

      // Show notification if enabled
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "success",
            message: "Successfully switched to Sepolia testnet",
            duration: 3000,
          })
        );
      }

      // Log network switch for HIPAA compliance
      if (logInteractions) {
        hipaaComplianceService.createAuditLog("WALLET_NETWORK_SWITCHED", {
          address,
          network: "Sepolia",
          timestamp: new Date().toISOString(),
        });
      }

      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error switching network:", err);

      // Check if Sepolia needs to be added
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.sepolia.dev"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });

          // Update network info after adding
          const networkInfo = await getNetworkInfo();
          setNetwork(networkInfo);

          // Show notification if enabled
          if (showNotifications) {
            dispatch(
              addNotification({
                type: "success",
                message: "Successfully added and switched to Sepolia testnet",
                duration: 3000,
              })
            );
          }

          setLoading(false);
          return true;
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);

          if (showNotifications) {
            dispatch(
              addNotification({
                type: "error",
                message: "Failed to add Sepolia network",
                duration: 5000,
              })
            );
          }

          setLoading(false);
          return false;
        }
      }

      // Show notification for other errors if enabled
      if (showNotifications) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to switch network",
            duration: 5000,
          })
        );
      }

      setLoading(false);
      return false;
    }
  }, [address, dispatch, showNotifications, getNetworkInfo, logInteractions]);

  /**
   * Simulated get balance function for development
   */
  const simulatedGetBalance = useCallback(
    async (walletAddress = address) => {
      console.log("Using simulated getBalance for address:", walletAddress);

      // Create a realistic-looking balance (0.1-10 ETH in wei)
      const randomEth = (Math.random() * 9.9 + 0.1).toFixed(4);
      const balanceInWei = BigInt(Math.floor(parseFloat(randomEth) * 1e18));

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return balanceInWei.toString();
    },
    [address]
  );

  /**
   * Get wallet balance
   */
  const getBalance = useCallback(
    async (walletAddress = address) => {
      setLoading(true);

      try {
        if (!window.ethereum || !window.ethereum.request) {
          if (simulateFunctions) {
            const balance = await simulatedGetBalance(walletAddress);
            setLoading(false);
            return balance;
          }

          throw new Error("Ethereum provider not available");
        }

        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [walletAddress, "latest"],
        });

        setLoading(false);
        return balance;
      } catch (err) {
        console.error("Error getting balance:", err);
        setError(err.message || "Failed to get wallet balance");
        setLoading(false);
        throw err;
      }
    },
    [address, simulateFunctions, simulatedGetBalance]
  );

  /**
   * Get pending transactions
   */
  const getPendingTransactions = useCallback(async () => {
    if (!window.ethereum || !window.ethereum.request) {
      if (simulateFunctions) {
        // Return an empty array for simulated environment
        return [];
      }

      console.warn("Ethereum provider not available");
      return [];
    }

    try {
      const pendingTxs = await window.ethereum.request({
        method: "eth_getPendingTransactions",
        params: [address],
      });
      return pendingTxs || [];
    } catch (err) {
      console.warn("Error getting pending transactions:", err);
      return [];
    }
  }, [address, simulateFunctions]);

  return {
    isConnected,
    address,
    network,
    loading,
    error,
    connectWallet,
    useWalletConnect,
    disconnectWallet,
    switchNetwork,
    getBalance,
    getPendingTransactions,
  };
};

export default useWalletConnect;
