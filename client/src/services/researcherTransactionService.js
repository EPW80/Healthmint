// client/src/services/researcherTransactionService.js
import mockData from "./mockData";

/**
 * Service for handling researcher-specific transactions
 * - Fetches purchased data history
 * - Handles purchasing new data sets
 */
const researcherTransactionService = {
  /**
   * Get all transactions for a researcher
   * @param {string} address - Wallet address of the researcher
   * @returns {Promise<Object>} - Transaction data or error
   */
  getTransactions: async (address) => {
    if (!address) {
      return {
        success: false,
        message: "No wallet address provided",
      };
    }

    try {
      // In a production app, we would fetch from the blockchain or API here
      // For this example, we'll use mock data with a delay to simulate network request
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Get mock data for purchases
      const transactions = mockData.getResearcherTransactions(address);

      // If we had a real blockchain connection, we would fetch transaction data like:
      // const provider = getNetworkProvider();
      // const transactionReceipts = await Promise.all(
      //   transactions.map(tx => provider.getTransactionReceipt(tx.hash))
      // );

      return {
        success: true,
        data: transactions,
        message: "Transactions loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching researcher transactions:", error);
      return {
        success: false,
        message: error.message || "Failed to load transaction history",
      };
    }
  },

  /**
   * Get details of a specific purchased dataset
   * @param {string} transactionId - ID of the transaction
   * @param {string} address - Wallet address of the researcher
   * @returns {Promise<Object>} - Dataset details or error
   */
  getDatasetDetails: async (transactionId, address) => {
    if (!transactionId || !address) {
      return {
        success: false,
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // Simulate API call with delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Get mock data for the specific dataset
      const transaction = mockData.getResearcherTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          message: "Dataset not found or access denied",
        };
      }

      return {
        success: true,
        data: {
          ...transaction,
          // Add additional dataset details
          schema: transaction.schema || [],
          sampleData: transaction.sampleData || [],
          downloadUrl: transaction.downloadUrl || null,
          accessExpiration: transaction.accessExpiration || null,
        },
        message: "Dataset details loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching dataset details:", error);
      return {
        success: false,
        message: error.message || "Failed to load dataset details",
      };
    }
  },

  /**
   * Purchase a new dataset
   * @param {Object} purchaseDetails - Details of the purchase
   * @param {string} address - Wallet address of the researcher
   * @returns {Promise<Object>} - Result of the purchase
   */
  purchaseDataset: async (purchaseDetails, address) => {
    if (!purchaseDetails || !address) {
      return {
        success: false,
        message: "Missing purchase details or wallet address",
      };
    }

    try {
      // Simulate blockchain transaction with delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In a real app, we would create a transaction on the blockchain here
      // const provider = getNetworkProvider();
      // const signer = provider.getSigner();
      // const transaction = await signer.sendTransaction({...});

      // For now, return a mock transaction
      const mockTransaction = {
        id: "tx_" + Math.random().toString(36).substr(2, 9),
        hash: "0x" + Math.random().toString(36).substr(2, 64),
        timestamp: new Date().toISOString(),
        status: "completed",
        type: "purchase",
        dataId: purchaseDetails.dataId,
        dataName: purchaseDetails.dataName,
        dataType: purchaseDetails.dataType,
        amount: purchaseDetails.price,
        description: `Purchase of ${purchaseDetails.dataName || "health dataset"}`,
        recordCount: purchaseDetails.recordCount || 0,
        fileSize: purchaseDetails.fileSize || "0 KB",
        dataAvailable: true,
        downloadUrl: `/api/datasets/${purchaseDetails.dataId}/download`,
      };

      return {
        success: true,
        data: mockTransaction,
        message: "Dataset purchased successfully",
      };
    } catch (error) {
      console.error("Error purchasing dataset:", error);
      return {
        success: false,
        message: error.message || "Failed to purchase dataset",
      };
    }
  },
};

export default researcherTransactionService;
