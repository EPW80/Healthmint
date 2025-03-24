// src/hooks/useWalletConnect.js - Simplified version to prevent infinite loops
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
  selectNetwork
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
      "0x539": { name: "Local Development", isSupported: true }
    };
    
    const network = networks[chainId] || { 
      name: `Unknown Network (${chainId})`, 
      isSupported: false 
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
        method: "eth_requestAccounts"
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
      
      // Update Redux state
      dispatch(updateWalletConnection({
        address: connectedAddress,
        chainId: connectedChainId, 
        isConnected: true,
        walletType: "metamask",
        lastConnected: Date.now()
      }));
      
      // Update user profile with the wallet address
      dispatch(updateUserProfile({ address: connectedAddress }));
      
      return {
        success: true,
        address: connectedAddress,
        chainId: connectedChainId,
        network: networkDetails
      };
    } catch (error) {
      console.error("Wallet connection error:", error);
      
      let errorMessage = error.message || "Failed to connect wallet";
      
      if (error.code === 4001) {
        errorMessage = "You rejected the connection request.";
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending. Please check your wallet.";
      }
      
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
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
  const switchNetwork = useCallback(async (targetChainId = "0xaa36a7") => {
    if (!window.ethereum) return false;
    
    try {
      setLoading(true);
      
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }]
      });
      
      return true;
    } catch (error) {
      console.error("Network switch error:", error);
      
      if (error.code === 4001) {
        // User rejected the request
        dispatch(addNotification({
          type: "info",
          message: "Network switch was rejected."
        }));
      } else {
        dispatch(addNotification({
          type: "error",
          message: "Failed to switch network. Please try again."
        }));
      }
      
      return false;
    } finally {
      if (isActive.current) {
        setLoading(false);
      }
    }
  }, [dispatch]);

  // Set up event listeners for wallet changes
  useEffect(() => {
    if (!window.ethereum?.on) return;
    
    // Handle account changes
    const handleAccountsChanged = (accounts) => {
      if (!isActive.current) return;
      
      if (accounts.length === 0) {
        // User disconnected their wallet
        dispatch(clearWalletConnection());
        
        dispatch(addNotification({
          type: "info",
          message: "Wallet disconnected"
        }));
      } else {
        // Account changed
        const newAccount = accounts[0];
        
        dispatch(updateUserProfile({ address: newAccount }));
        dispatch(updateWalletConnection({ address: newAccount }));
        
        dispatch(addNotification({
          type: "info",
          message: `Account changed to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`
        }));
      }
    };
    
    // Handle chain/network changes
    const handleChainChanged = (chainId) => {
      if (!isActive.current) return;
      
      const networkDetails = getNetworkFromChainId(chainId);
      
      // Update Redux state with new chain ID
      dispatch(updateWalletConnection({ 
        chainId,
        network: networkDetails
      }));
      
      dispatch(addNotification({
        type: networkDetails.isSupported ? "info" : "warning",
        message: networkDetails.isSupported 
          ? `Connected to ${networkDetails.name}`
          : `Connected to unsupported network: ${networkDetails.name}`
      }));
    };
    
    // Set up listeners
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    
    // Auto-connect if requested
    if (autoConnect && !isConnected) {
      // Use eth_accounts instead of eth_requestAccounts to avoid popup
      window.ethereum.request({ method: "eth_accounts" })
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            
            // Get chain ID
            window.ethereum.request({ method: "eth_chainId" })
              .then(chainId => {
                const networkDetails = getNetworkFromChainId(chainId);
                
                // Update Redux state
                dispatch(updateWalletConnection({
                  address,
                  chainId,
                  isConnected: true,
                  network: networkDetails,
                  walletType: "metamask",
                  lastConnected: Date.now()
                }));
                
                // Update user profile
                dispatch(updateUserProfile({ address }));
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
  }, [autoConnect, dispatch, getNetworkFromChainId, isConnected]);

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
    switchNetwork
  };
};

export default useWalletConnect;