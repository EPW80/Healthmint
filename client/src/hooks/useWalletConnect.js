// src/hooks/useWalletConnect.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ethers } from "ethers";
import {
  setWalletConnection,
  clearWalletConnection,
} from "../redux/slices/walletSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

// Network configurations
const SUPPORTED_NETWORKS = {
  // Mainnet (not primary focus for this app)
  1: {
    chainId: "0x1",
    name: "Ethereum Mainnet",
    isSupported: false,
    isTestnet: false,
  },
  // Sepolia testnet - primary development network
  11155111: {
    chainId: "0xaa36a7",
    name: "Sepolia Testnet",
    isSupported: true,
    isTestnet: true,
  },
};

/**
 * Custom hook for wallet connection and management
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Whether to attempt auto-connection on mount
 * @param {boolean} options.persistConnection - Whether to persist connection state
 * @param {boolean} options.silentErrors - Whether to suppress error notifications
 * @returns {Object} - Wallet connection state and methods
 */
const useWalletConnect = ({
  autoConnect = true,
  persistConnection = true,
  silentErrors = false,
} = {}) => {
  const dispatch = useDispatch();

  // Component state
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [network, setNetwork] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);

  // Refs to track initialization state and mounted status
  const initialized = useRef(false);
  const isMounted = useRef(true);
  const connectionAttempted = useRef(false);

  // Get Ethereum provider from window object
  const getEthereumProvider = useCallback(() => {
    if (typeof window === "undefined") return null;
    return window.ethereum || null;
  }, []);

  // Check if MetaMask is installed
  const checkMetaMaskInstalled = useCallback(() => {
    const ethereum = getEthereumProvider();
    return !!ethereum && ethereum.isMetaMask;
  }, [getEthereumProvider]);

  // Get current connected network info
  const getNetworkInfo = useCallback(async (provider) => {
    if (!provider) return null;

    try {
      const network = await provider.getNetwork();
      const chainId = network.chainId;

      // Check if we have info for this network
      if (SUPPORTED_NETWORKS[chainId]) {
        return {
          ...SUPPORTED_NETWORKS[chainId],
          chainId,
        };
      }

      // For unknown networks, return basic info
      return {
        chainId,
        name: network.name || `Chain ID: ${chainId}`,
        isSupported: false,
        isTestnet: false,
      };
    } catch (err) {
      console.error("Error getting network:", err);
      return null;
    }
  }, []);

  // Clear wallet connection state
  const clearConnection = useCallback(() => {
    if (!isMounted.current) return;

    setAddress(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setNetwork(null);
    setPendingTransactions([]);

    // Clear from localStorage if configured to persist
    if (persistConnection) {
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
    }

    // Dispatch redux action to clear wallet state
    dispatch(clearWalletConnection());
  }, [dispatch, persistConnection]);

  // Handle account changes
  const handleAccountsChanged = useCallback(
    (accounts) => {
      if (!isMounted.current) return;

      if (accounts.length === 0) {
        // User disconnected their account
        setError("Wallet disconnected. Please connect again.");
        clearConnection();

        // Notification of disconnection
        if (!silentErrors) {
          dispatch(
            addNotification({
              type: "info",
              message: "Wallet disconnected",
              duration: 5000,
            })
          );
        }
      } else {
        // User switched to a different account
        const newAddress = accounts[0];

        // Only update if the address has changed
        if (newAddress !== address) {
          setAddress(newAddress);

          // Save to localStorage if configured to persist
          if (persistConnection) {
            localStorage.setItem("healthmint_wallet_address", newAddress);
          }

          // Dispatch redux action to update wallet state
          dispatch(
            setWalletConnection({
              address: newAddress,
              isConnected: true,
            })
          );

          // Notification of account change
          if (!silentErrors && address) {
            // Only notify if there was a previous address
            dispatch(
              addNotification({
                type: "info",
                message: "Wallet account changed",
                duration: 5000,
              })
            );
          }
        }
      }
    },
    [address, clearConnection, dispatch, silentErrors, persistConnection]
  );

  // Handle chain/network change
  const handleChainChanged = useCallback(
    async (chainIdHex) => {
      if (!isMounted.current) return;

      try {
        // Need to refresh page on chain change according to MetaMask best practices
        // For a better UX, we update state instead of forcing a page refresh
        const ethereum = getEthereumProvider();
        if (!ethereum) return;

        const newProvider = new ethers.providers.Web3Provider(ethereum);
        const newSigner = newProvider.getSigner();
        const newNetwork = await getNetworkInfo(newProvider);

        setProvider(newProvider);
        setSigner(newSigner);
        setNetwork(newNetwork);

        // Update connection status
        setIsConnected(true);

        // Notification of network change
        if (!silentErrors) {
          dispatch(
            addNotification({
              type: "info",
              message: `Network changed to ${newNetwork?.name || "unknown network"}`,
              duration: 5000,
            })
          );
        }

        // If switched to unsupported network, show a warning
        if (newNetwork && !newNetwork.isSupported) {
          dispatch(
            addNotification({
              type: "warning",
              message: `Connected to unsupported network: ${newNetwork.name}. Please switch to Sepolia Testnet.`,
              duration: 8000,
            })
          );
        }
      } catch (err) {
        console.error("Error handling chain change:", err);
        if (!silentErrors) {
          dispatch(
            addNotification({
              type: "error",
              message: "Error updating network connection",
              duration: 5000,
            })
          );
        }
      }
    },
    [getEthereumProvider, getNetworkInfo, dispatch, silentErrors]
  );

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    // Prevent starting a connection if one is in progress or component unmounted
    if (loading)
      return { success: false, error: "Connection already in progress" };
    if (!isMounted.current)
      return { success: false, error: "Component unmounted" };

    // Use an abort controller to handle cancellation
    const abortController = new AbortController();
    const signal = abortController.signal;

    setLoading(true);
    setError(null);
    connectionAttempted.current = true;

    try {
      // Check if request was aborted
      if (signal.aborted) {
        return { success: false, error: "Connection aborted" };
      }

      // Check if MetaMask is installed
      if (!checkMetaMaskInstalled()) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to connect your wallet."
        );
      }

      const ethereum = getEthereumProvider();
      if (!ethereum) {
        throw new Error("No Ethereum provider found");
      }

      // Request accounts from user - wrap in a check for component mounted state
      await ethereum.request({ method: "eth_requestAccounts" });

      // Check again if component is still mounted after user interaction
      if (!isMounted.current || signal.aborted) {
        return {
          success: false,
          error: "Component unmounted during connection",
        };
      }

      // Initialize provider and signer
      const newProvider = new ethers.providers.Web3Provider(ethereum);
      const newSigner = newProvider.getSigner();

      // Get the connected address
      const newAddress = await newSigner.getAddress();

      // Final check if component is still mounted
      if (!isMounted.current || signal.aborted) {
        return {
          success: false,
          error: "Component unmounted during connection",
        };
      }

      // Get network information
      const newNetwork = await getNetworkInfo(newProvider);

      // Setup event listeners - only if component is still mounted
      if (isMounted.current && !signal.aborted) {
        ethereum.on("accountsChanged", handleAccountsChanged);
        ethereum.on("chainChanged", handleChainChanged);

        // Update state - safe to do since we've checked component is mounted
        setProvider(newProvider);
        setSigner(newSigner);
        setAddress(newAddress);
        setIsConnected(true);
        setNetwork(newNetwork);

        // Save to localStorage if configured to persist
        if (persistConnection) {
          localStorage.setItem("healthmint_wallet_address", newAddress);
          localStorage.setItem("healthmint_wallet_connection", "true");
        }

        // Dispatch redux action to update wallet state
        dispatch(
          setWalletConnection({
            address: newAddress,
            isConnected: true,
          })
        );

        // If not on a supported network, warn the user
        if (newNetwork && !newNetwork.isSupported) {
          dispatch(
            addNotification({
              type: "warning",
              message: `Connected to unsupported network: ${newNetwork.name}. Please switch to Sepolia Testnet.`,
              duration: 8000,
            })
          );
        }
      }

      // Always make sure to update loading state
      if (isMounted.current) {
        setLoading(false);
      }

      return {
        success: true,
        address: newAddress,
        network: newNetwork,
      };
    } catch (err) {
      console.error("Wallet connection error:", err);
      const errorMessage = err.message || "Failed to connect wallet";

      // Only update state if component is still mounted
      if (isMounted.current) {
        setError(errorMessage);
        setLoading(false);
        setIsConnected(false);

        // Show notification for connection error
        if (!silentErrors) {
          dispatch(
            addNotification({
              type: "error",
              message: errorMessage,
              duration: 5000,
            })
          );
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [
    loading,
    checkMetaMaskInstalled,
    getEthereumProvider,
    getNetworkInfo,
    handleAccountsChanged,
    handleChainChanged,
    dispatch,
    persistConnection,
    silentErrors,
  ]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!isMounted.current) return { success: false };

    try {
      setLoading(true);

      // Remove event listeners
      const ethereum = getEthereumProvider();
      if (ethereum) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }

      // Clear connection state
      clearConnection();

      // Indicate success
      setLoading(false);

      return { success: true };
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      setError("Failed to disconnect wallet");
      setLoading(false);

      if (!silentErrors) {
        dispatch(
          addNotification({
            type: "error",
            message: "Error disconnecting wallet",
            duration: 5000,
          })
        );
      }

      return { success: false, error: err.message };
    }
  }, [
    getEthereumProvider,
    handleAccountsChanged,
    handleChainChanged,
    clearConnection,
    dispatch,
    silentErrors,
  ]);

  // Switch network
  const switchNetwork = useCallback(async () => {
    if (!isMounted.current || !isConnected) return { success: false };

    try {
      setLoading(true);

      const ethereum = getEthereumProvider();
      if (!ethereum) {
        throw new Error("No Ethereum provider found");
      }

      // Request switch to Sepolia testnet
      const sepoliaChainParams = SUPPORTED_NETWORKS[11155111];

      try {
        // First try to switch to the network
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: sepoliaChainParams.chainId }],
        });
      } catch (switchError) {
        // If the network is not added, try to add it
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: sepoliaChainParams.chainId,
                chainName: sepoliaChainParams.name,
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Network switch was successful, update provider and state
      const newProvider = new ethers.providers.Web3Provider(ethereum);
      const newSigner = newProvider.getSigner();
      const newNetwork = await getNetworkInfo(newProvider);

      setProvider(newProvider);
      setSigner(newSigner);
      setNetwork(newNetwork);
      setLoading(false);

      // Notification of successful network switch
      dispatch(
        addNotification({
          type: "success",
          message: `Switched to network: ${newNetwork.name}`,
          duration: 5000,
        })
      );

      return { success: true, network: newNetwork };
    } catch (err) {
      console.error("Error switching network:", err);
      setError("Failed to switch network");
      setLoading(false);

      if (!silentErrors) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to switch network",
            duration: 5000,
          })
        );
      }

      return { success: false, error: err.message };
    }
  }, [
    isConnected,
    getEthereumProvider,
    getNetworkInfo,
    dispatch,
    silentErrors,
  ]);

  // Get wallet balance
  const getBalance = useCallback(
    async (walletAddress) => {
      if (!provider) return null;

      try {
        const targetAddress = walletAddress || address;
        if (!targetAddress) return null;

        const balance = await provider.getBalance(targetAddress);
        return ethers.utils.formatEther(balance);
      } catch (err) {
        console.error("Error getting balance:", err);
        return null;
      }
    },
    [provider, address]
  );

  // Get pending transactions
  const getPendingTransactions = useCallback(async () => {
    return pendingTransactions;
  }, [pendingTransactions]);

  // Connect to wallet on initialization if autoConnect is true
  // This is a separate function to handle auto-connection logic
  const initializeConnection = useCallback(async () => {
    if (initialized.current || !isMounted.current) return;
    initialized.current = true;

    // Check if we should attempt to connect
    const shouldAutoConnect =
      autoConnect &&
      persistConnection &&
      localStorage.getItem("healthmint_wallet_connection") === "true";

    // If auto-connect is enabled and we have a stored connection, try to connect
    if (shouldAutoConnect) {
      try {
        // First check if MetaMask is installed
        if (!checkMetaMaskInstalled()) {
          throw new Error("MetaMask is not installed");
        }

        const ethereum = getEthereumProvider();
        if (!ethereum) {
          throw new Error("No Ethereum provider found");
        }

        // Check if already connected
        const accounts = await ethereum.request({ method: "eth_accounts" });

        if (accounts && accounts.length > 0) {
          // We have an active connection, initialize provider
          const newProvider = new ethers.providers.Web3Provider(ethereum);
          const newSigner = newProvider.getSigner();
          const newAddress = accounts[0];
          const newNetwork = await getNetworkInfo(newProvider);

          // Setup event listeners
          ethereum.on("accountsChanged", handleAccountsChanged);
          ethereum.on("chainChanged", handleChainChanged);

          // Update state
          setProvider(newProvider);
          setSigner(newSigner);
          setAddress(newAddress);
          setIsConnected(true);
          setNetwork(newNetwork);

          // Update Redux state
          dispatch(
            setWalletConnection({
              address: newAddress,
              isConnected: true,
            })
          );

          // Return true to indicate successful connection
          return true;
        } else {
          // No active connection
          return false;
        }
      } catch (err) {
        console.error("Auto-connection error:", err);
        return false;
      }
    }

    return false;
  }, [
    autoConnect,
    persistConnection,
    checkMetaMaskInstalled,
    getEthereumProvider,
    getNetworkInfo,
    handleAccountsChanged,
    handleChainChanged,
    dispatch,
  ]);

  // Handle cleanup and set isMounted.current to false when component unmounts
  useEffect(() => {
    // Set up an abort controller for ongoing operations
    const abortController = new AbortController();

    // Run initialization if not already done
    if (!initialized.current) {
      initializeConnection().catch((err) => {
        console.warn("Initialization failed:", err);
      });
    }

    // Cleanup function
    return () => {
      // Signal any ongoing operations to abort
      abortController.abort();

      // Set mounted flag to false
      isMounted.current = false;

      // Remove event listeners if ethereum provider exists
      const ethereum = getEthereumProvider();
      if (ethereum) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [
    initializeConnection,
    getEthereumProvider,
    handleAccountsChanged,
    handleChainChanged,
  ]);

  // Return public API
  return {
    // State
    address,
    isConnected,
    loading,
    error,
    provider,
    signer,
    network,
    pendingTransactions,

    // Methods
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    getPendingTransactions,
  };
};

export default useWalletConnect;
