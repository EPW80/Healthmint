// src/hooks/useWalletConnect.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ethers } from "ethers";

// Redux actions
import {
  updateWalletConnection,
  clearWalletConnection,
  selectIsConnected,
  selectAddress,
  selectChainId,
  selectNetwork,
} from "../redux/slices/walletSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * Custom hook for wallet connectivity
 *
 * @param {Object} options - Configuration options
 * @returns {Object} Wallet connection methods and state
 */
const useWalletConnect = (options = {}) => {
  const dispatch = useDispatch();

  // Extract options with defaults
  const { autoConnect = false } = options;

  // Get wallet state from Redux
  const isConnected = useSelector(selectIsConnected);
  const address = useSelector(selectAddress);
  const chainId = useSelector(selectChainId);
  const network = useSelector(selectNetwork);

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // References to prevent state updates during cleanup
  const isActive = useRef(true);

  /**
   * Creates network state object from chain ID
   * @param {string} chainId - Hex string chain ID
   */
  const getNetworkFromChainId = useCallback((chainId) => {
    if (!chainId) return { name: "Unknown", isSupported: false };

    const networks = {
      "0x1": { name: "Ethereum Mainnet", isSupported: true },
      "0xaa36a7": { name: "Sepolia Testnet", isSupported: true },
      "0x5": { name: "Goerli Testnet", isSupported: false },
      "0x539": { name: "Local Development", isSupported: true },
    };

    const network = networks[chainId] || {
      name: `Unknown Network (${chainId})`,
      isSupported: false,
    };

    return { ...network, chainId };
  }, []);

  /**
   * Connect to wallet
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const errorMessage = "Please install MetaMask to continue";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    try {
      setIsConnecting(true);
      setLoading(true);
      setError(null);

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      const connectedAddress = accounts[0];

      // Get network info
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const connectedNetwork = await provider.getNetwork();
      const connectedChainId = "0x" + connectedNetwork.chainId.toString(16);

      // Get network details
      const networkDetails = getNetworkFromChainId(connectedChainId);

      // Save wallet information to localStorage immediately
      localStorage.setItem("healthmint_wallet_address", connectedAddress);
      localStorage.setItem("healthmint_wallet_connection", "true");

      // Update Redux state
      dispatch(
        updateWalletConnection({
          address: connectedAddress,
          chainId: connectedChainId,
          isConnected: true,
          walletType: "metamask",
          lastConnected: Date.now(),
        })
      );

      // Update user profile with the wallet address
      dispatch(updateUserProfile({ address: connectedAddress }));

      return {
        success: true,
        address: connectedAddress,
        chainId: connectedChainId,
        network: networkDetails,
      };
    } catch (error) {
      console.error("Wallet connection error:", error);

      let errorMessage = error.message || "Failed to connect wallet";

      if (error.code === 4001) {
        errorMessage = "You rejected the connection request.";
      } else if (error.code === -32002) {
        errorMessage =
          "Connection request already pending. Please check your wallet.";
      }

      setError(errorMessage);

      // Clean up any partial wallet connection data
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      if (isActive.current) {
        setLoading(false);
        setIsConnecting(false);
      }
    }
  }, [dispatch, getNetworkFromChainId]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      setLoading(true);

      // Clear wallet data from localStorage
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");

      // Clear Redux state
      dispatch(clearWalletConnection());

      return { success: true };
    } catch (error) {
      console.error("Wallet disconnect error:", error);
      return { success: false, error: error.message };
    } finally {
      if (isActive.current) {
        setLoading(false);
      }
    }
  }, [dispatch]);

  /**
   * Switch to a specific network
   * @param {string} targetChainId - Chain ID to switch to
   */
  const switchNetwork = useCallback(
    async (targetChainId = "0xaa36a7") => {
      if (!window.ethereum) return false;

      try {
        setLoading(true);

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        });

        return true;
      } catch (error) {
        console.error("Network switch error:", error);

        if (error.code === 4001) {
          // User rejected the request
          dispatch(
            addNotification({
              type: "info",
              message: "Network switch was rejected.",
            })
          );
        } else {
          dispatch(
            addNotification({
              type: "error",
              message: "Failed to switch network. Please try again.",
            })
          );
        }

        return false;
      } finally {
        if (isActive.current) {
          setLoading(false);
        }
      }
    },
    [dispatch]
  );

  /**
   * Get pending transactions (placeholder implementation)
   */
  const getPendingTransactions = useCallback(async () => {
    return []; // Placeholder - in a real app, you would fetch actual pending transactions
  }, []);

  // Set up event listeners for wallet changes
  useEffect(() => {
    if (!window.ethereum?.on) return;

    // Handle account changes
    const handleAccountsChanged = (accounts) => {
      if (!isActive.current) return;

      if (accounts.length === 0) {
        // User disconnected their wallet
        dispatch(clearWalletConnection());

        // Also clear localStorage
        localStorage.removeItem("healthmint_wallet_address");
        localStorage.removeItem("healthmint_wallet_connection");

        dispatch(
          addNotification({
            type: "info",
            message: "Wallet disconnected",
          })
        );
      } else {
        // Account changed
        const newAccount = accounts[0];

        // Update localStorage
        localStorage.setItem("healthmint_wallet_address", newAccount);

        // Update Redux state
        dispatch(updateUserProfile({ address: newAccount }));
        dispatch(updateWalletConnection({ address: newAccount }));

        dispatch(
          addNotification({
            type: "info",
            message: `Account changed to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`,
          })
        );
      }
    };

    // Handle chain/network changes
    const handleChainChanged = (chainId) => {
      if (!isActive.current) return;

      const networkDetails = getNetworkFromChainId(chainId);

      // Update Redux state with new chain ID
      dispatch(
        updateWalletConnection({
          chainId,
          network: networkDetails,
        })
      );

      dispatch(
        addNotification({
          type: networkDetails.isSupported ? "info" : "warning",
          message: networkDetails.isSupported
            ? `Connected to ${networkDetails.name}`
            : `Connected to unsupported network: ${networkDetails.name}`,
        })
      );
    };

    // Set up listeners
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    // Check if there's a wallet address in localStorage but not in Redux
    const storedAddress = localStorage.getItem("healthmint_wallet_address");
    const storedConnection =
      localStorage.getItem("healthmint_wallet_connection") === "true";

    if (storedAddress && storedConnection && !address) {
      // If we have stored wallet data but no Redux state, restore from localStorage
      window.ethereum
        .request({ method: "eth_chainId" })
        .then((chainId) => {
          const networkDetails = getNetworkFromChainId(chainId);

          // Update Redux state
          dispatch(
            updateWalletConnection({
              address: storedAddress,
              chainId,
              isConnected: true,
              network: networkDetails,
              walletType: "metamask",
              lastConnected: Date.now(),
            })
          );

          // Update user profile
          dispatch(updateUserProfile({ address: storedAddress }));
        })
        .catch(console.error);
    }

    // Auto-connect if requested
    if (autoConnect && !isConnected) {
      // Use eth_accounts instead of eth_requestAccounts to avoid popup
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && accounts.length > 0) {
            const connectedAddress = accounts[0];

            // Save to localStorage
            localStorage.setItem("healthmint_wallet_address", connectedAddress);
            localStorage.setItem("healthmint_wallet_connection", "true");

            // Get chain ID
            window.ethereum
              .request({ method: "eth_chainId" })
              .then((chainId) => {
                const networkDetails = getNetworkFromChainId(chainId);

                // Update Redux state
                dispatch(
                  updateWalletConnection({
                    address: connectedAddress,
                    chainId,
                    isConnected: true,
                    network: networkDetails,
                    walletType: "metamask",
                    lastConnected: Date.now(),
                  })
                );

                // Update user profile
                dispatch(updateUserProfile({ address: connectedAddress }));
              })
              .catch(console.error);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isActive.current) {
            setIsInitialized(true);
          }
        });
    } else {
      setIsInitialized(true);
    }

    // Cleanup function
    return () => {
      isActive.current = false;
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [autoConnect, dispatch, getNetworkFromChainId, isConnected, address]);

  return {
    // State
    isInitialized,
    isConnected,
    isConnecting,
    address,
    chainId,
    network,
    loading,
    error,

    // Methods
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getPendingTransactions,
  };
};

export default useWalletConnect;
