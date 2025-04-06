// src/hooks/useWalletConnect.js
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { 
  connectWallet as connectWalletAction,
  disconnectWallet as disconnectWalletAction,
  clearWalletConnection
} from "../redux/slices/walletSlice.js";
import mockPaymentService from "../services/mockPaymentService.js";

/**
 * Hook for wallet connection management
 * 
 * Handles connecting to MetaMask wallet, switching networks, and fetching balances
 */
function useWalletConnect({
  autoConnect = true,
  requireNetwork = "sepolia",
  onConnectSuccess = null,
  onConnectError = null
} = {}) {
  const dispatch = useDispatch();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize payment service for balance and transaction functionality
  useEffect(() => {
    const initMockService = async () => {
      try {
        if (!mockPaymentService.isInitialized) {
          await mockPaymentService.initializeProvider();
        }
      } catch (err) {
        console.error("Failed to initialize mock payment service:", err);
      }
    };
    
    initMockService();
  }, []);

  // Check if we're in a browser environment with ethereum/window
  const hasEthereum = useCallback(() => {
    return typeof window !== 'undefined' && 
           (window.ethereum !== undefined || 
            window.web3 !== undefined);
  }, []);

  // We'll use this function directly in getNetworkInfo instead of having a separate function

  // Get network info from chain ID
  const getNetworkInfo = useCallback((chainId) => {
    if (!chainId) return { name: "Unknown", chainId: 0, isSupported: false };
    
    // Convert to number if string
    const chainIdNum = typeof chainId === 'string' 
      ? parseInt(chainId, 16) 
      : chainId;
    
    const networks = {
      1: { name: "Ethereum Mainnet", chainId: 1, isSupported: true },
      3: { name: "Ropsten Testnet", chainId: 3, isSupported: false },
      4: { name: "Rinkeby Testnet", chainId: 4, isSupported: false },
      5: { name: "Goerli Testnet", chainId: 5, isSupported: false },
      11155111: { name: "Sepolia Testnet", chainId: 11155111, isSupported: true },
      // Add other networks as needed
    };
    
    // Network is supported if it's mainnet or Sepolia
    const isSupported = chainIdNum === 1 || chainIdNum === 11155111;
    
    return networks[chainIdNum] || { 
      name: `Unknown Network (${chainIdNum})`, 
      chainId: chainIdNum, 
      isSupported
    };
  }, []);

  // Switch network to Sepolia testnet
  const switchNetwork = useCallback(async () => {
    if (!hasEthereum()) {
      console.error("Ethereum provider not available");
      return false;
    }
    
    try {
      setLoading(true);
      
      // Sepolia chainId in hex
      const sepoliaChainId = "0xaa36a7";
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sepoliaChainId }],
      });
      
      return true;
    } catch (error) {
      // If the chain is not added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: "0xaa36a7",
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
          setError("Failed to add Sepolia network");
          return false;
        }
      } else {
        console.error("Error switching network:", error);
        setError("Failed to switch network");
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [hasEthereum]);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    if (!hasEthereum()) {
      const err = new Error("MetaMask not installed");
      setError(err.message);
      
      if (onConnectError) {
        onConnectError(err);
      }
      
      return { 
        success: false, 
        error: err.message 
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Request accounts access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        
        // Get chain ID
        const chainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        const networkInfo = getNetworkInfo(chainId);
        
        // Check if we require a specific network and it's not the current one
        if (requireNetwork === 'sepolia' && 
            (!networkInfo.isSupported || networkInfo.chainId !== 11155111)) {
          
          // Try to switch to Sepolia
          await switchNetwork();
          
          // Get updated chain ID
          const updatedChainId = await window.ethereum.request({ 
            method: 'eth_chainId' 
          });
          
          setNetwork(getNetworkInfo(updatedChainId));
        } else {
          setNetwork(networkInfo);
        }
        
        // Initialize mock payment service
        if (!mockPaymentService.isInitialized) {
          await mockPaymentService.initializeProvider();
        }
        
        // Update state
        setAddress(userAddress);
        setIsConnected(true);
        
        // Update Redux state
        dispatch(connectWalletAction({ address: userAddress }));
        
        // Save to localStorage for persistence
        localStorage.setItem('healthmint_wallet_address', userAddress);
        localStorage.setItem('healthmint_wallet_connection', 'true');
        
        // Callback on success
        if (onConnectSuccess) {
          onConnectSuccess({ address: userAddress, networkInfo });
        }
        
        return { 
          success: true, 
          address: userAddress,
          network: networkInfo
        };
      } else {
        throw new Error("No accounts returned from wallet");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      
      setError(err.message || "Failed to connect wallet");
      setIsConnected(false);
      
      // Remove any stale data
      localStorage.removeItem('healthmint_wallet_address');
      localStorage.removeItem('healthmint_wallet_connection');
      
      // Callback on error
      if (onConnectError) {
        onConnectError(err);
      }
      
      return { 
        success: false, 
        error: err.message || "Failed to connect wallet" 
      };
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [
    dispatch, 
    hasEthereum, 
    getNetworkInfo, 
    requireNetwork, 
    switchNetwork, 
    onConnectSuccess, 
    onConnectError
  ]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    setLoading(true);
    
    try {
      // Clear Redux state
      dispatch(disconnectWalletAction());
      
      // Clear localStorage
      localStorage.removeItem('healthmint_wallet_address');
      localStorage.removeItem('healthmint_wallet_connection');
      
      // Update component state
      setIsConnected(false);
      setAddress(null);
      
      // Set a flag to prevent auto-reconnection
      sessionStorage.setItem('logout_in_progress', 'true');
      
      return true;
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      setError("Failed to disconnect wallet");
      return false;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Get wallet balance
  const getBalance = useCallback(async (walletAddress) => {
    if (!walletAddress && !address) {
      throw new Error("Wallet address is required");
    }
    
    const addressToUse = walletAddress || address;
    
    try {
      // First try with ethereum provider if available
      if (hasEthereum() && window.ethereum) {
        try {
          const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [addressToUse, 'latest'],
          });
          
          // Convert hex to decimal without using BigInt
          // Remove '0x' prefix and convert
          const balanceValue = parseInt(balanceHex.substring(2), 16);
          return balanceValue.toString();
        } catch (ethErr) {
          console.log("Error getting balance from ethereum provider:", ethErr);
          // Fall through to mockPaymentService
        }
      }
      
      // Fallback to mockPaymentService
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }
      
      return await mockPaymentService.getBalance();
    } catch (err) {
      console.error("Error getting wallet balance:", err);
      throw new Error("Failed to fetch balance");
    }
  }, [address, hasEthereum]);

  // Get pending transactions
  const getPendingTransactions = useCallback(async () => {
    try {
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }
      
      return await mockPaymentService.getPendingTransactions();
    } catch (err) {
      console.error("Error getting pending transactions:", err);
      return [];
    }
  }, []);

  // Check for stored wallet on mount and setup event listeners
  useEffect(() => {
    // Skip if already initialized or auto-connect is disabled
    if (initialized || !autoConnect) return;
    
    // Check for stored wallet address in localStorage
    const storedAddress = localStorage.getItem('healthmint_wallet_address');
    const storedConnection = localStorage.getItem('healthmint_wallet_connection');
    
    // Check if logout is in progress
    const isLogoutInProgress = sessionStorage.getItem('logout_in_progress') === 'true';
    
    // Only auto-connect if we have a stored address and connection
    // and logout is not in progress
    if (storedAddress && storedConnection === 'true' && !isLogoutInProgress && hasEthereum()) {
      // We've confirmed we have a stored address, now check if it's still valid
      const checkConnection = async () => {
        try {
          // First let's verify this account is still accessible
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' // This doesn't prompt user, just gets already connected accounts
          });
          
          if (accounts && accounts.length > 0 && accounts.includes(storedAddress)) {
            // Account is still valid and connected
            
            // Get chain ID
            const chainId = await window.ethereum.request({ 
              method: 'eth_chainId' 
            });
            
            const networkInfo = getNetworkInfo(chainId);
            
            // Update state
            setAddress(storedAddress);
            setIsConnected(true);
            setNetwork(networkInfo);
            
            // Update Redux state
            dispatch(useWalletConnect({ address: storedAddress }));
            
            // Initialize mock payment service
            if (!mockPaymentService.isInitialized) {
              await mockPaymentService.initializeProvider();
            }
          } else {
            // Stored address is no longer connected/accessible
            
            // Clear localStorage
            localStorage.removeItem('healthmint_wallet_address');
            localStorage.removeItem('healthmint_wallet_connection');
            
            // Update state
            setIsConnected(false);
            setAddress(null);
          }
        } catch (err) {
          console.error("Error checking stored wallet:", err);
          
          // Clear localStorage on error
          localStorage.removeItem('healthmint_wallet_address');
          localStorage.removeItem('healthmint_wallet_connection');
          
          // Update state
          setIsConnected(false);
          setAddress(null);
        } finally {
          setInitialized(true);
        }
      };
      
      checkConnection();
    } else {
      setInitialized(true);
    }
  }, [initialized, autoConnect, hasEthereum, getNetworkInfo, dispatch]);
  
  // Set up event listeners for wallet events
  useEffect(() => {
    // Only set up if ethereum is available
    if (!hasEthereum() || !window.ethereum) return;
    
    // Account change listener
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        setIsConnected(false);
        setAddress(null);
        
        // Clear localStorage
        localStorage.removeItem('healthmint_wallet_address');
        localStorage.removeItem('healthmint_wallet_connection');
        
        // Update Redux state
        dispatch(clearWalletConnection());
      } else if (accounts[0] !== address) {
        // Account changed
        setAddress(accounts[0]);
        
        // Update localStorage
        localStorage.setItem('healthmint_wallet_address', accounts[0]);
        
        // Update Redux state
        dispatch(connectWalletAction({ address: accounts[0] }));
      }
    };
    
    // Chain change listener
    const handleChainChanged = (chainId) => {
      const networkInfo = getNetworkInfo(chainId);
      setNetwork(networkInfo);
      
      // If we were connected, refresh the page as recommended by MetaMask
      if (isConnected) {
        window.location.reload();
      }
    };
    
    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    // Clean up
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [
    address, 
    dispatch, 
    getNetworkInfo, 
    hasEthereum, 
    isConnected, 
    connectWalletAction, 
    clearWalletConnection
  ]);

  return {
    isConnected,
    address,
    network,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    getPendingTransactions,
    initialized
  };
}

export default useWalletConnect;