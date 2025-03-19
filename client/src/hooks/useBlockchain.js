// src/hooks/useBlockchain.js
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useDispatch } from "react-redux";
import web3Service, { Web3Error } from "../services/web3Service.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { NETWORKS } from "../config/networkConfig.js";
const useBlockchain = (options = {}) => {
  const dispatch = useDispatch();

  // Default options
  const {
    autoConnect = false,
    requireNetwork = true,
    showNotifications = true,
  } = options;

  // State
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);
  const [txStatus, setTxStatus] = useState({ status: "idle", message: null });

  /**
   * Initialize blockchain connection
   */
  const initializeBlockchain = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        // Initialize blockchain provider
        await web3Service.initialize({
          force: forceRefresh,
          requestAccounts: autoConnect,
          requireNetwork: requireNetwork,
        });

        // Get network information
        if (web3Service.network) {
          const chainId = web3Service.network.chainId;
          setNetworkId(chainId);

          // Get network name
          const networkInfo = web3Service.getNetworkByChainId(chainId);
          setNetworkName(networkInfo?.NAME || "Unknown Network");

          // Check if supported
          const supported = web3Service.isNetworkSupported(chainId);
          setIsNetworkSupported(supported);

          if (requireNetwork && !supported) {
            throw new Web3Error(
              `Please connect to ${NETWORKS.SEPOLIA.NAME}`,
              "UNSUPPORTED_NETWORK",
              { current: networkInfo?.NAME || "Unknown Network" }
            );
          }
        }

        // Get connected account
        if (autoConnect) {
          const address = await web3Service.getAccount();
          setAccount(address);
        }

        return true;
      } catch (error) {
        console.error("Blockchain initialization error:", error);
        setError(
          error instanceof Web3Error ? error : new Web3Error(error.message)
        );

        if (showNotifications) {
          dispatch(
            addNotification({
              type: "error",
              message:
                error.message || "Failed to initialize blockchain connection",
            })
          );
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [autoConnect, dispatch, requireNetwork, showNotifications]
  );

  /**
   * Connect wallet
   */
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Request accounts from the wallet
      await web3Service.initialize({
        requestAccounts: true,
        requireNetwork: requireNetwork,
      });

      // Get connected account
      const address = await web3Service.getAccount();
      setAccount(address);

      if (showNotifications) {
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully",
          })
        );
      }

      return { success: true, address };
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError(
        error instanceof Web3Error ? error : new Web3Error(error.message)
      );

      if (showNotifications) {
        dispatch(
          addNotification({
            type: "error",
            message: error.message || "Failed to connect wallet",
          })
        );
      }

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [dispatch, requireNetwork, showNotifications]);

  /**
   * Switch blockchain network
   */
  const switchNetwork = useCallback(
    async (targetChainId = NETWORKS.SEPOLIA.CHAIN_ID) => {
      try {
        setLoading(true);
        setError(null);

        // Switch network
        const success = await web3Service.switchNetwork(targetChainId);

        if (success) {
          // Refresh state with new network
          await initializeBlockchain(true);

          if (showNotifications) {
            dispatch(
              addNotification({
                type: "success",
                message: `Network switched successfully`,
              })
            );
          }
        }

        return success;
      } catch (error) {
        console.error("Network switch error:", error);
        setError(
          error instanceof Web3Error ? error : new Web3Error(error.message)
        );

        if (showNotifications && error.code !== "USER_REJECTED") {
          dispatch(
            addNotification({
              type: "error",
              message: error.message || "Failed to switch network",
            })
          );
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, initializeBlockchain, showNotifications]
  );

  /**
   * Execute a blockchain transaction
   */
  const executeTransaction = useCallback(
    async (transactionFunction, options = {}) => {
      try {
        setLoading(true);
        setError(null);
        setTxStatus({
          status: "preparing",
          message: "Preparing transaction...",
        });

        // Custom transaction status updates
        const onStatus = (status) => {
          setTxStatus(status);
        };

        // Execute transaction with status updates
        const txResult = await web3Service.executeTransaction(
          transactionFunction,
          {
            ...options,
            onStatus,
          }
        );

        // Show success notification
        if (showNotifications) {
          dispatch(
            addNotification({
              type: "success",
              message: "Transaction successful",
            })
          );
        }

        return txResult;
      } catch (error) {
        console.error("Transaction error:", error);
        setError(
          error instanceof Web3Error ? error : new Web3Error(error.message)
        );
        setTxStatus({ status: "error", message: error.message });

        // Don't show notification for user rejections
        if (showNotifications && error.code !== "USER_REJECTED") {
          dispatch(
            addNotification({
              type: "error",
              message: error.message || "Transaction failed",
            })
          );
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, showNotifications]
  );

  /**
   * Fetch health records from blockchain
   */
  const getHealthRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get contract
      const contract = await web3Service.getHealthMarketplaceContract();

      // Call the getPatientRecords function
      const records = await contract.getPatientRecords(account);

      // Transform the data
      return records.map((record) => ({
        id: record.id.toString(),
        owner: record.owner,
        ipfsHash: record.ipfsHash,
        price: ethers.utils.formatEther(record.price),
        category: record.category,
        isVerified: record.verified,
        timestamp: new Date(record.timestamp.toNumber() * 1000).toISOString(),
      }));
    } catch (error) {
      console.error("Error fetching health records:", error);
      setError(
        error instanceof Web3Error ? error : new Web3Error(error.message)
      );

      if (showNotifications) {
        dispatch(
          addNotification({
            type: "error",
            message: error.message || "Failed to fetch health records",
          })
        );
      }

      return [];
    } finally {
      setLoading(false);
    }
  }, [account, dispatch, showNotifications]);

  /**
   * Purchase a health record
   */
  const purchaseRecord = useCallback(
    async (recordId, priceInEth) => {
      try {
        // Convert price to wei
        const priceInWei = ethers.utils.parseEther(priceInEth.toString());

        // Execute transaction
        return await executeTransaction(
          async (contract) => {
            return contract.purchaseData(recordId, { value: priceInWei });
          },
          {
            estimateGas: true,
            gasLimitMultiplier: 1.3, // Add 30% to estimated gas as buffer
          }
        );
      } catch (error) {
        // Error handled by executeTransaction
        throw error;
      }
    },
    [executeTransaction]
  );

  /**
   * Upload health data to the blockchain
   */
  const uploadHealthData = useCallback(
    async (ipfsHash, category, priceInEth, description) => {
      try {
        // Convert price to wei
        const priceInWei = ethers.utils.parseEther(priceInEth.toString());

        // Execute transaction
        return await executeTransaction(
          async (contract) => {
            return contract.uploadData(
              ipfsHash,
              category,
              priceInWei,
              description
            );
          },
          {
            estimateGas: true,
            gasLimitMultiplier: 1.3, // Add 30% to estimated gas
          }
        );
      } catch (error) {
        // Error handled by executeTransaction
        throw error;
      }
    },
    [executeTransaction]
  );

  /**
   * Grant access to a health record
   */
  const grantAccess = useCallback(
    async (recordId, recipient, accessLevel, duration) => {
      try {
        // Execute transaction
        return await executeTransaction(
          async (contract) => {
            return contract.grantAccess(
              recordId,
              recipient,
              accessLevel,
              duration
            );
          },
          {
            estimateGas: true,
          }
        );
      } catch (error) {
        // Error handled by executeTransaction
        throw error;
      }
    },
    [executeTransaction]
  );

  /**
   * Revoke access to a health record
   */
  const revokeAccess = useCallback(
    async (recordId, recipient) => {
      try {
        // Execute transaction
        return await executeTransaction(
          async (contract) => {
            return contract.revokeAccess(recordId, recipient);
          },
          {
            estimateGas: true,
          }
        );
      } catch (error) {
        // Error handled by executeTransaction
        throw error;
      }
    },
    [executeTransaction]
  );

  // Initialize on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      initializeBlockchain();
    }
  }, [autoConnect, initializeBlockchain]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // Listen for network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (chainId) => {
      // Chain changed, reinitialize
      initializeBlockchain(true);
    };

    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [initializeBlockchain]);

  // Return hook API
  return {
    // State
    account,
    loading,
    error,
    networkId,
    networkName,
    isNetworkSupported,
    txStatus,

    // Methods
    initializeBlockchain,
    connectWallet,
    switchNetwork,
    executeTransaction,
    getHealthRecords,
    purchaseRecord,
    uploadHealthData,
    grantAccess,
    revokeAccess,

    // Utilities
    web3Service, // Expose the service for advanced usage
    isConnected: !!account,
  };
};

export default useBlockchain;
