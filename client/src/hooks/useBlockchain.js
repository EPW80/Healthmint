// src/hooks/useBlockchain.js
/* global BigInt */
import { useState, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

const useBlockchain = (options = {}) => {
  const {
    showNotifications = true,
    logErrors = true,
    simulateFunctions = true,
  } = options;

  const dispatch = useDispatch();
  const walletAddress = useSelector((state) => state.wallet.address);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear error when component using the hook unmounts or dependencies change
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [walletAddress]);

  const withErrorHandling = useCallback(
    async (operation, operationName) => {
      setLoading(true);
      setError(null);

      try {
        // Log the operation for HIPAA compliance
        if (logErrors) {
          await hipaaComplianceService.createAuditLog("BLOCKCHAIN_OPERATION", {
            operation: operationName,
            timestamp: new Date().toISOString(),
            walletAddress,
          });
        }

        const result = await operation();
        setLoading(false);
        return result;
      } catch (err) {
        console.error(`Error in blockchain operation ${operationName}:`, err);
        setError(err.message || `Failed to perform ${operationName}`);

        // Log error for HIPAA compliance
        if (logErrors) {
          await hipaaComplianceService.createAuditLog("BLOCKCHAIN_ERROR", {
            operation: operationName,
            error: err.message || "Unknown error",
            timestamp: new Date().toISOString(),
            walletAddress,
          });
        }

        // Show notification if enabled
        if (showNotifications) {
          dispatch(
            addNotification({
              type: "error",
              message: `Blockchain error: ${err.message || "Unknown error"}`,
              duration: 5000,
            })
          );
        }

        setLoading(false);
        throw err;
      }
    },
    [dispatch, showNotifications, logErrors, walletAddress]
  );

  const simulatedGetTransactionHistory = useCallback(
    async (filterParams = {}) => {
      console.log(
        "Using simulated getTransactionHistory with filters:",
        filterParams
      );

      // Create some sample transactions
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
        {
          id: "tx-3",
          type: "share",
          status: "pending",
          amount: "0.01",
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          description: "Shared health record",
          blockNumber: "pending",
          gasUsed: "pending",
          hash: "0xpending123456789",
        },
        {
          id: "tx-4",
          type: "upload",
          status: "failed",
          amount: "0",
          timestamp: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          description: "Failed health record upload",
          blockNumber: null,
          gasUsed: null,
          hash: null,
          error: "Out of gas",
        },
        {
          id: "tx-5",
          type: "access",
          status: "success",
          amount: "0",
          timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
          description: "Accessed shared data",
          blockNumber: "123454",
          gasUsed: "18000",
          hash: "0xa1b2c3d4e5f6g7h8i9j0",
        },
        {
          id: "tx-6",
          type: "upload",
          status: "success",
          amount: "0",
          timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
          description: "Uploaded genetic report",
          blockNumber: "123453",
          gasUsed: "30000",
          hash: "0x99887766554433221100",
        },
        {
          id: "tx-7",
          type: "purchase",
          status: "failed",
          amount: "0.03",
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
          description: "Failed dataset purchase",
          blockNumber: null,
          gasUsed: null,
          hash: null,
          error: "Insufficient balance",
        },
        {
          id: "tx-8",
          type: "share",
          status: "success",
          amount: "0.005",
          timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
          description: "Shared lab results",
          blockNumber: "123457",
          gasUsed: "25000",
          hash: "0x3344abcdeffedcba9988",
        },
        {
          id: "tx-9",
          type: "revoke",
          status: "success",
          amount: "0",
          timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
          description: "Revoked data access",
          blockNumber: "123452",
          gasUsed: "21000",
          hash: "0xdeadbeef12345678face",
        },
      ];

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      return mockTransactions;
    },
    []
  );

  const simulatedGetBalance = useCallback(async (address) => {
    console.log("Using simulated getBalance for address:", address);

    // Create a realistic-looking balance (0.1-10 ETH in wei)
    const randomEth = (Math.random() * 9.9 + 0.1).toFixed(4);
    const balanceInWei = BigInt(Math.floor(parseFloat(randomEth) * 1e18));

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return balanceInWei.toString();
  }, []);

  const simulatedUploadHealthData = useCallback(
    async (ipfsHash, category, price, description) => {
      console.log("Using simulated uploadHealthData:", {
        ipfsHash,
        category,
        price,
        description,
      });

      // Simulate network delay and transaction process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substring(2, 34)}`,
        timestamp: new Date().toISOString(),
      };
    },
    []
  );

  const getTransactionHistory = useCallback(
    async (filters = {}) => {
      // Check if window.ethereum is available
      if (!window.ethereum || !window.ethereum.getTransactionHistory) {
        console.warn(
          "Ethereum provider or getTransactionHistory not available"
        );

        // Use simulation in dev/test environments if enabled
        if (simulateFunctions) {
          return simulatedGetTransactionHistory(filters);
        }

        throw new Error("Blockchain functionality not available");
      }

      return withErrorHandling(async () => {
        const transactions = await window.ethereum.request({
          method: "eth_getTransactionHistory",
          params: [walletAddress, filters],
        });
        return transactions;
      }, "getTransactionHistory");
    },
    [
      withErrorHandling,
      walletAddress,
      simulateFunctions,
      simulatedGetTransactionHistory,
    ]
  );

  const getBalance = useCallback(
    async (address = walletAddress) => {
      // Check if window.ethereum is available
      if (!window.ethereum || !window.ethereum.request) {
        console.warn("Ethereum provider not available");

        // Use simulation in dev/test environments if enabled
        if (simulateFunctions) {
          return simulatedGetBalance(address);
        }

        throw new Error("Blockchain functionality not available");
      }

      return withErrorHandling(async () => {
        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });
        return balance;
      }, "getBalance");
    },
    [withErrorHandling, walletAddress, simulateFunctions, simulatedGetBalance]
  );

  const uploadHealthData = useCallback(
    async (ipfsHash, category, price, description) => {
      // Check if window.ethereum is available
      if (!window.ethereum || !window.ethereum.request) {
        console.warn("Ethereum provider not available");

        // Use simulation in dev/test environments if enabled
        if (simulateFunctions) {
          return simulatedUploadHealthData(
            ipfsHash,
            category,
            price,
            description
          );
        }

        throw new Error("Blockchain functionality not available");
      }

      return withErrorHandling(async () => {
        const params = {
          from: walletAddress,
          to: process.env.REACT_APP_CONTRACT_ADDRESS,
          data: window.ethereum.encodeUploadHealthData(
            ipfsHash,
            category,
            price,
            description
          ),
        };

        // Send transaction
        const txHash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [params],
        });

        // Wait for transaction to be mined
        let receipt = null;
        while (!receipt) {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });

          if (!receipt) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        return {
          success: true,
          transactionHash: txHash,
          receipt: receipt,
          ipfsHash: ipfsHash,
          category: category,
          price: price,
        };
      }, "uploadHealthData");
    },
    [
      withErrorHandling,
      walletAddress,
      simulateFunctions,
      simulatedUploadHealthData,
    ]
  );

  const getPendingTransactions = useCallback(async () => {
    // Check if window.ethereum is available
    if (!window.ethereum || !window.ethereum.request) {
      console.warn("Ethereum provider not available");
      return [];
    }

    try {
      const pendingTxs = await window.ethereum.request({
        method: "eth_getPendingTransactions",
        params: [walletAddress],
      });
      return pendingTxs || [];
    } catch (err) {
      console.warn("Error getting pending transactions:", err);
      return [];
    }
  }, [walletAddress]);

  return {
    loading,
    error,
    getTransactionHistory,
    getBalance,
    uploadHealthData,
    getPendingTransactions,
    clearError: () => setError(null),
  };
};

export default useBlockchain;
