// src/hooks/useWalletConnect.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// Redux actions and selectors
import {
  updateWalletConnection,
  clearWalletConnection,
  setLoading,
  setError,
  updateNetwork,
  selectIsConnected,
  selectAddress,
  selectChainId,
  selectNetwork,
  selectWalletLoading,
  selectWalletError,
} from "../redux/slices/walletSlice.js";

import { updateUserProfile, clearUserProfile } from "../redux/slices/userSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

// Network configuration
import { requiredNetwork } from "../config/networks.js";

/**
 * Custom hook to manage wallet connection with Redux integration
 *
 * This hook centralizes all wallet connection logic and state management
 * while providing a clean API for components to use.
 *
 * @param {Object} options - Configuration options
 * @param {Function} [options.onConnect] - Callback function when connection succeeds
 * @param {Function} [options.onDisconnect] - Callback function when disconnection succeeds
 * @param {boolean} [options.autoConnect=false] - Whether to attempt connection on mount
 * @returns {Object} Wallet connection API
 */
const useWalletConnection = (options = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cleanupRef = useRef();

  // Extract options with defaults
  const {
    onConnect = () => {},
    onDisconnect = () => {},
    autoConnect = false,
  } = options;

  // Get wallet state from Redux
  const isConnected = useSelector(selectIsConnected);
  const address = useSelector(selectAddress);
  const chainId = useSelector(selectChainId);
  const network = useSelector(selectNetwork);
  const loading = useSelector(selectWalletLoading);
  const error = useSelector(selectWalletError);

  // Local state for connection status
  const [connectionStatus, setConnectionStatus] = useState(
    isConnected ? "connected" : "disconnected"
  );

  // Network helper function
  const getNetworkName = (chainId) => {
    // Use a more compatible approach instead of ethers.utils.getNetwork
    const networkNames = {
      "0x1": "Ethereum Mainnet",
      "0x3": "Ropsten Testnet",
      "0x4": "Rinkeby Testnet",
      "0x5": "Goerli Testnet",
      "0xaa36a7": "Sepolia Testnet",
      "0x2a": "Kovan Testnet",
      "0x89": "Polygon Mainnet",
      "0x13881": "Polygon Mumbai",
      "0xa86a": "Avalanche Mainnet",
      "0xa869": "Avalanche Testnet",
      "0x38": "Binance Smart Chain",
      "0x61": "Binance Smart Chain Testnet",
      "0x539": "Local Development",
    };

    return networkNames[chainId] || "Unknown Network";
  };

  /**
   * Handles disconnecting wallet and cleanup
   */
  const disconnectWallet = useCallback(() => {
    setConnectionStatus("disconnected");
    dispatch(clearWalletConnection());
    dispatch(clearUserProfile());
    dispatch(addNotification({ type: "info", message: "Wallet disconnected" }));

    // Clean up listeners
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Execute onDisconnect callback
    onDisconnect();

    // Navigate to login if requested
    if (options.navigateOnDisconnect) {
      navigate("/login");
    }
  }, [dispatch, navigate, onDisconnect, options.navigateOnDisconnect]);

  /**
   * Sets up wallet event listeners
   */
  const setupWalletListeners = useCallback(() => {
    if (!window.ethereum?.on) return null;

    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAccount = accounts[0];
        dispatch(updateUserProfile({ address: newAccount }));
        dispatch(
          addNotification({
            type: "info",
            message: `Account changed to ${newAccount.substring(0, 6)}...${newAccount.substring(38)}`,
          })
        );
      }
    };

    const handleChainChange = (chainId) => {
      // Update network information in state
      dispatch(updateNetwork(chainId));

      // Check if new network is supported
      const isSupported = chainId === requiredNetwork.CHAIN_ID;

      dispatch(
        addNotification({
          type: isSupported ? "info" : "warning",
          message: isSupported
            ? "Network changed successfully"
            : "Connected to unsupported network. Please switch to Sepolia Testnet.",
        })
      );

      if (!isSupported) {
        // If not on supported network, show warning but don't disconnect
        // This allows the UI to prompt for network switching
      }
    };

    const handleDisconnect = (error) => {
      console.log("Wallet disconnected event:", error);
      disconnectWallet();
    };

    // Set up listeners
    window.ethereum.on("accountsChanged", handleAccountChange);
    window.ethereum.on("chainChanged", handleChainChange);
    window.ethereum.on("disconnect", handleDisconnect);

    // Return cleanup function
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountChange);
      window.ethereum.removeListener("chainChanged", handleChainChange);
      window.ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [dispatch, disconnectWallet]);

  /**
   * Connects to wallet
   * @param {string} walletType - Type of wallet to connect to (e.g., "metamask")
   * @returns {Promise<Object>} Connection result
   */
  const connectWallet = useCallback(
    async (walletType = "metamask") => {
      if (!window.ethereum) {
        const errorMessage = "Please install MetaMask to continue";
        dispatch(setError(errorMessage));
        dispatch(addNotification({ type: "error", message: errorMessage }));
        return { success: false, error: errorMessage };
      }

      try {
        setConnectionStatus("connecting");
        dispatch(setLoading(true));
        dispatch(setError(null));

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (!accounts?.length) {
          throw new Error("No accounts found. Please connect your wallet.");
        }

        const account = accounts[0];
        let chainId = await window.ethereum.request({ method: "eth_chainId" });

        // Check if on required network
        const isOnRequiredNetwork = chainId === requiredNetwork.CHAIN_ID;

        if (!isOnRequiredNetwork) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: requiredNetwork.CHAIN_ID }],
            });
            // After switching, get the new chain ID
            chainId = await window.ethereum.request({ method: "eth_chainId" });
          } catch (switchError) {
            // Only throw if user rejected - otherwise we'll continue with current network
            // and show a warning in the UI
            if (switchError.code === 4001) {
              throw new Error(
                "Please switch to the Sepolia Testnet to continue."
              );
            }

            // Log the error but continue
            console.warn("Network switch failed:", switchError);
            dispatch(
              addNotification({
                type: "warning",
                message:
                  "Please switch to Sepolia Testnet for full functionality.",
              })
            );
          }
        }

        // Set up the cleanup function for wallet listeners
        cleanupRef.current = setupWalletListeners();

        // Update wallet state in Redux
        dispatch(
          updateWalletConnection({
            isConnected: true,
            address: account,
            walletType: walletType,
            chainId,
            lastConnected: Date.now(),
          })
        );

        // Show success notification
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully!",
          })
        );

        // Update status
        setConnectionStatus("connected");

        // Call onConnect callback with account
        onConnect(account, chainId);

        return {
          success: true,
          address: account,
          chainId,
        };
      } catch (error) {
        console.error("Wallet connection error:", error);

        let errorMessage = error.message || "Failed to connect wallet.";
        if (error.code === 4001) {
          errorMessage = "You rejected the connection request.";
        } else if (error.code === -32002) {
          errorMessage =
            "Connection request already pending. Please check your wallet.";
        }

        setConnectionStatus("error");
        dispatch(setError(errorMessage));
        dispatch(
          addNotification({
            type: "error",
            message: errorMessage,
          })
        );

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, setupWalletListeners, onConnect]
  );

  /**
   * Switches to a different network
   * @param {string} targetChainId - Chain ID to switch to
   * @returns {Promise<boolean>} Success status
   */
  const switchNetwork = useCallback(
    async (targetChainId = requiredNetwork.CHAIN_ID) => {
      if (!window.ethereum) return false;

      try {
        dispatch(setLoading(true));

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        });

        return true;
      } catch (error) {
        // Handle the case where the chain has not been added to MetaMask
        if (error.code === 4902 || error.code === -32603) {
          try {
            const networkConfig = Object.values(requiredNetwork.networks).find(
              (network) => network.CHAIN_ID === targetChainId
            );

            if (!networkConfig) {
              throw new Error("Network configuration not found");
            }

            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainId,
                  chainName: networkConfig.NAME,
                  rpcUrls: [networkConfig.RPC_URL],
                  blockExplorerUrls: [networkConfig.EXPLORER_URL],
                  nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                },
              ],
            });

            // Try switching again after adding
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetChainId }],
            });

            return true;
          } catch (addError) {
            console.error("Failed to add network:", addError);
            dispatch(
              addNotification({
                type: "error",
                message: "Failed to add network. Please try again.",
              })
            );
            return false;
          }
        } else if (error.code === 4001) {
          // User rejected the request
          dispatch(
            addNotification({
              type: "info",
              message: "Network switch was rejected.",
            })
          );
        } else {
          console.error("Error switching network:", error);
          dispatch(
            addNotification({
              type: "error",
              message: "Failed to switch network. Please try again.",
            })
          );
        }

        return false;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (autoConnect && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            // Already connected, just update status
            setConnectionStatus("connected");
          }
        } catch (error) {
          console.error("Error checking existing connection:", error);
        }
      }
    };

    checkExistingConnection();
  }, [autoConnect]);

  // Clean up effect for wallet listeners
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Return hook API
  return {
    // Connection state
    isConnected,
    isConnecting: connectionStatus === "connecting",
    connectionStatus,
    address,
    chainId,
    network,
    loading,
    error,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,

    // Utilities
    getNetworkName,
  };
};

export default useWalletConnection;
