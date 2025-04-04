// client/src/hooks/useWalletConnect.js

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  setWalletAddress,
  clearWalletConnection,
} from "../redux/slices/walletSlice.js";

/**
 * useWalletConnect Hook
 *
 * Manages wallet connection state and interactions with blockchain wallets like MetaMask
 *
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.autoConnect - Whether to attempt connection on mount
 * @returns {Object} Wallet connection state and methods
 */
const useWalletConnect = (options = {}) => {
  const { autoConnect = false } = options;
  const dispatch = useDispatch();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize wallet provider (MetaMask in this case)
  const ethereum = useMemo(() => {
    return typeof window !== "undefined" ? window.ethereum : null;
  }, []);

  /**
   * Check if wallet is available
   */
  const isWalletAvailable = useCallback(() => {
    return !!ethereum;
  }, [ethereum]);

  /**
   * Get current connected accounts
   */
  const getConnectedAccounts = useCallback(async () => {
    if (!ethereum) return [];

    try {
      const accounts = await ethereum.request({ method: "eth_accounts" });
      return accounts;
    } catch (err) {
      console.error("Error getting connected accounts:", err);
      return [];
    }
  }, [ethereum]);

  /**
   * Get network details
   */
  const getNetworkDetails = useCallback(async () => {
    if (!ethereum) return null;

    try {
      const chainId = await ethereum.request({ method: "eth_chainId" });
      const chainIdDecimal = parseInt(chainId, 16);

      // Define supported networks
      const networks = {
        1: {
          name: "Ethereum Mainnet",
          isSupported: false,
          chainId: chainIdDecimal,
        },
        11155111: {
          name: "Sepolia Testnet",
          isSupported: true,
          chainId: chainIdDecimal,
        },
        // Add other networks as needed
      };

      return (
        networks[chainIdDecimal] || {
          name: `Unknown Network (${chainIdDecimal})`,
          isSupported: false,
          chainId: chainIdDecimal,
        }
      );
    } catch (err) {
      console.error("Error getting network:", err);
      return null;
    }
  }, [ethereum]);

  /**
   * Request wallet connection
   */
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask.");
      }

      // Request accounts
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        setAddress(userAddress);
        setIsConnected(true);

        // Update Redux state
        dispatch(setWalletAddress(userAddress));

        // Get network details
        const networkInfo = await getNetworkDetails();
        setNetwork(networkInfo);

        return {
          success: true,
          address: userAddress,
          network: networkInfo,
        };
      } else {
        throw new Error("No accounts found or user rejected request");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err.message || "Failed to connect wallet");
      return {
        success: false,
        error: err.message || "Failed to connect wallet",
      };
    } finally {
      setLoading(false);
    }
  }, [ethereum, dispatch, getNetworkDetails]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      setLoading(true);

      // There's no standard disconnect method for MetaMask
      // So we just clear our state
      setAddress(null);
      setIsConnected(false);
      setNetwork(null);

      // Clear Redux state
      dispatch(clearWalletConnection());

      // Clear localStorage
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      return { success: true };
    } catch (err) {
      console.error("Wallet disconnect error:", err);
      setError(err.message || "Failed to disconnect wallet");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * Switch network
   */
  const switchNetwork = useCallback(async () => {
    try {
      if (!ethereum) throw new Error("No Ethereum wallet found");

      // Sepolia Testnet chainId
      const chainId = "0xaa36a7"; // 11155111 in hex

      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });

      // Update network state
      const networkInfo = await getNetworkDetails();
      setNetwork(networkInfo);

      return { success: true, network: networkInfo };
    } catch (err) {
      console.error("Network switch error:", err);
      setError(err.message || "Failed to switch network");
      return { success: false, error: err.message };
    }
  }, [ethereum, getNetworkDetails]);

  /**
   * Get wallet balance
   */
  const getBalance = useCallback(
    async (walletAddress) => {
      try {
        if (!ethereum) throw new Error("No Ethereum wallet found");
        if (!walletAddress) throw new Error("Wallet address is required");

        const balance = await ethereum.request({
          method: "eth_getBalance",
          params: [walletAddress, "latest"],
        });

        return balance;
      } catch (err) {
        console.error("Error getting balance:", err);
        throw err;
      }
    },
    [ethereum]
  );

  /**
   * Get pending transactions
   */
  const getPendingTransactions = useCallback(async () => {
    // This is a simplified implementation
    // In a real app, you'd likely call your backend or use an indexer service
    return []; // Placeholder - no pending transactions by default
  }, []);

  /**
   * Get transaction history
   */
  const getTransactionHistory = useCallback(async (filters = {}) => {
    try {
      // This is a simplified implementation
      // In a real app, you'd likely call your backend or use an indexer service

      // Mock data for demonstration
      const mockTransactions = [
        {
          id: "tx-1",
          type: "upload",
          status: "success",
          amount: "0",
          timestamp: new Date().toISOString(),
          description: "Health record upload",
          blockNumber: "123456",
          gasUsed: "21000",
          hash: "0x123456789abcdef",
        },
        {
          id: "tx-2",
          type: "purchase",
          status: "success",
          amount: "0.05",
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          description: "Purchased dataset",
          blockNumber: "123455",
          gasUsed: "42000",
          hash: "0xabcdef123456789",
        },
      ];

      return mockTransactions;
    } catch (err) {
      console.error("Error getting transaction history:", err);
      throw err;
    }
  }, []);

  // Initialize connection state on mount
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        // Check if we have a stored connection
        const storedAddress = localStorage.getItem("healthmint_wallet_address");
        const storedConnection = localStorage.getItem(
          "healthmint_wallet_connection"
        );

        if (storedAddress && storedConnection === "true") {
          // Check if wallet is still connected
          const accounts = await getConnectedAccounts();

          if (
            accounts &&
            accounts.length > 0 &&
            accounts.includes(storedAddress)
          ) {
            // Still connected - restore state
            setAddress(storedAddress);
            setIsConnected(true);

            // Update Redux state
            dispatch(setWalletAddress(storedAddress));

            // Get network details
            const networkInfo = await getNetworkDetails();
            if (mounted) setNetwork(networkInfo);
          } else if (autoConnect) {
            // Try to reconnect
            await connectWallet();
          }
        } else if (autoConnect) {
          // Try to connect if autoConnect is enabled
          await connectWallet();
        }
      } catch (err) {
        console.error("Error initializing wallet connection:", err);
        if (mounted)
          setError(err.message || "Failed to initialize wallet connection");
      }
    };

    initializeConnection();

    // Setup event listeners for MetaMask
    if (ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setAddress(null);
          setIsConnected(false);
          dispatch(clearWalletConnection());
          localStorage.removeItem("healthmint_wallet_address");
          localStorage.removeItem("healthmint_wallet_connection");
        } else if (mounted) {
          // Update with new account
          setAddress(accounts[0]);
          setIsConnected(true);
          dispatch(setWalletAddress(accounts[0]));
          localStorage.setItem("healthmint_wallet_address", accounts[0]);
          localStorage.setItem("healthmint_wallet_connection", "true");
        }
      };

      const handleChainChanged = async () => {
        const networkInfo = await getNetworkDetails();
        if (mounted) setNetwork(networkInfo);
        window.location.reload();
      };

      if (ethereum) {
        ethereum.on("accountsChanged", handleAccountsChanged);
        ethereum.on("chainChanged", handleChainChanged);
      }

      return () => {
        mounted = false;
        if (ethereum) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }

    initializeConnection();

    return () => {
      mounted = false;
    };
  }, [
    ethereum,
    dispatch,
    autoConnect,
    getConnectedAccounts,
    getNetworkDetails,
    connectWallet,
  ]);

  // Return the hook interface
  return {
    isConnected,
    address,
    network,
    loading,
    error,
    isWalletAvailable,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    getPendingTransactions,
    getTransactionHistory,
  };
};

export default useWalletConnect;
