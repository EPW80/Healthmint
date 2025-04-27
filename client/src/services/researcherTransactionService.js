// client/src/services/researcherTransactionService.js
import mockData from "./mockData";

// Mock delays for demonstration purposes
const DELAYS = {
  TRANSACTIONS: 800,
  DATASET_DETAILS: 600,
  PURCHASE: 1500,
  DOWNLOAD: 1000,
  ANALYSIS: 1200,
};

// error codes for different scenarios
const ERROR_CODES = {
  MISSING_ADDRESS: "MISSING_ADDRESS",
  MISSING_TRANSACTION: "MISSING_TRANSACTION",
  MISSING_PURCHASE_DETAILS: "MISSING_PURCHASE_DETAILS",
  DATASET_NOT_FOUND: "DATASET_NOT_FOUND",
  SERVER_ERROR: "SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
};

// service to manage researcher transactions
const researcherTransactionService = {
  // fetch dataset details
  getTransactions: async (address, options = {}) => {
    if (!address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_ADDRESS,
        message: "No wallet address provided",
      };
    }

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, DELAYS.TRANSACTIONS));

      // Get mock data
      let transactions = mockData.getResearcherTransactions(address);

      // Apply filters if specified
      if (options.type) {
        transactions = transactions.filter((tx) => tx.type === options.type);
      }

      if (options.status) {
        transactions = transactions.filter(
          (tx) => tx.status === options.status
        );
      }

      // Apply sorting
      if (options.sort === "oldest") {
        transactions.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      } else {
        // Default: newest first
        transactions.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      }

      // Apply limit if specified
      if (
        options.limit &&
        Number.isInteger(options.limit) &&
        options.limit > 0
      ) {
        transactions = transactions.slice(0, options.limit);
      }

      return {
        success: true,
        data: transactions,
        count: transactions.length,
        message: "Transactions loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching researcher transactions:", error);

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to load transaction history",
      };
    }
  },

  // get dataset details
  getRecentTransactions: async (address, days = 7) => {
    if (!address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_ADDRESS,
        message: "No wallet address provided",
      };
    }

    try {
      const result =
        await researcherTransactionService.getTransactions(address);

      if (!result.success) return result;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentTransactions = result.data.filter(
        (tx) => new Date(tx.timestamp) >= cutoffDate
      );

      return {
        success: true,
        data: recentTransactions,
        count: recentTransactions.length,
        message: `Transactions from the last ${days} days loaded successfully`,
      };
    } catch (error) {
      console.error(
        `Error fetching recent transactions (${days} days):`,
        error
      );

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to load recent transactions",
      };
    }
  },

  // get dataset details
  getDatasetDetails: async (transactionId, address, options = {}) => {
    if (!transactionId || !address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_TRANSACTION,
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // Simulate API call with delay
      await new Promise((resolve) =>
        setTimeout(resolve, DELAYS.DATASET_DETAILS)
      );

      // Get mock data for the specific dataset
      const transaction = mockData.getResearcherTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          code: ERROR_CODES.DATASET_NOT_FOUND,
          message: "Dataset not found or access denied",
        };
      }

      // Initialize additional details
      const datasetDetails = {
        ...transaction,
        accessExpiration: transaction.accessExpiration || null,
        purchaseDate: transaction.timestamp,
        dataAvailable: transaction.dataAvailable || false,
        downloadUrl: transaction.downloadUrl || null,
        metadata: {
          format: transaction.dataType || "Unknown",
          totalSize: transaction.fileSize || "Unknown",
          recordCount: transaction.recordCount || 0,
          lastUpdated: transaction.lastUpdated || transaction.timestamp,
          source: transaction.source || "Anonymous Provider",
          license: transaction.license || "Research use only",
        },
      };

      // Include schema information if requested
      if (options.includeSchema) {
        datasetDetails.schema = transaction.schema || [
          {
            name: "patient_id",
            type: "string",
            description: "Anonymized patient identifier",
          },
          { name: "measurement", type: "float", description: "Measured value" },
          {
            name: "timestamp",
            type: "datetime",
            description: "Time of measurement",
          },
        ];
      }

      // Include sample data if requested
      if (options.includeSample) {
        datasetDetails.sampleData = transaction.sampleData || [
          {
            patient_id: "anon_12345",
            measurement: 120.5,
            timestamp: "2025-01-15T08:30:00Z",
          },
          {
            patient_id: "anon_67890",
            measurement: 118.2,
            timestamp: "2025-01-16T09:45:00Z",
          },
        ];
      }

      return {
        success: true,
        data: datasetDetails,
        message: "Dataset details loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching dataset details:", error);

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to load dataset details",
      };
    }
  },

  // purchase dataset
  purchaseDataset: async (purchaseDetails, address, options = {}) => {
    if (!purchaseDetails || !address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_PURCHASE_DETAILS,
        message: "Missing purchase details or wallet address",
      };
    }

    // Validate purchase details
    if (!purchaseDetails.dataId || !purchaseDetails.price) {
      return {
        success: false,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Dataset ID and price are required",
      };
    }

    try {
      // Simulate blockchain transaction with delay
      await new Promise((resolve) => setTimeout(resolve, DELAYS.PURCHASE));

      // Generate a random transaction hash
      const transactionHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      // Set default tier if not specified
      const tier = options.tier || "complete";

      // Generate random block number and gas used
      const blockNumber = 14000000 + Math.floor(Math.random() * 1000000);
      const gasUsed = Math.floor(Math.random() * 50000) + 21000;

      // Create transaction record
      const mockTransaction = {
        id: `tx_${Date.now().toString(36).substring(2, 10)}`,
        hash: transactionHash,
        timestamp: new Date().toISOString(),
        status: "completed",
        type: "purchase",
        dataId: purchaseDetails.dataId,
        dataName: purchaseDetails.dataName || "Health Dataset",
        dataType: purchaseDetails.dataType || "Clinical Data",
        amount: purchaseDetails.price,
        description: `Purchase of ${purchaseDetails.dataName || "health dataset"} (${tier} tier)`,
        recordCount: purchaseDetails.recordCount || 0,
        fileSize: purchaseDetails.fileSize || "0 KB",
        dataAvailable: true,
        downloadUrl: `/api/datasets/${purchaseDetails.dataId}/download`,
        tier,
        blockNumber,
        gasUsed,
        purchaser: address,
      };

      return {
        success: true,
        data: mockTransaction,
        message: `Dataset purchased successfully with ${tier} access`,
      };
    } catch (error) {
      console.error("Error purchasing dataset:", error);

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to purchase dataset",
      };
    }
  },

  // download dataset
  downloadDataset: async (transactionId, address) => {
    if (!transactionId || !address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_TRANSACTION,
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, DELAYS.DOWNLOAD));

      // Get transaction details to verify purchase
      const transaction = mockData.getResearcherTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          code: ERROR_CODES.DATASET_NOT_FOUND,
          message: "Dataset not found or access denied",
        };
      }

      if (!transaction.dataAvailable) {
        return {
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Dataset is not available for download yet",
        };
      }

      // Generate a temporary download URL with token
      const downloadToken = `token_${Math.random().toString(36).substring(2, 15)}`;
      const downloadUrl = `${transaction.downloadUrl}?token=${downloadToken}&address=${address}`;

      return {
        success: true,
        data: {
          downloadUrl,
          expiresIn: "30 minutes",
          fileFormat: transaction.dataType === "Imaging" ? "DICOM" : "CSV",
          fileSize: transaction.fileSize,
          recordCount: transaction.recordCount,
          filename: `${transaction.dataName.replace(/\s+/g, "_").toLowerCase()}_${transaction.tier}.csv`,
        },
        message: "Dataset ready for download",
      };
    } catch (error) {
      console.error("Error downloading dataset:", error);

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to prepare dataset for download",
      };
    }
  },

  // generate access token
  getPurchaseStats: async (address) => {
    if (!address) {
      return {
        success: false,
        code: ERROR_CODES.MISSING_ADDRESS,
        message: "No wallet address provided",
      };
    }

    try {
      // Get all transactions
      const result =
        await researcherTransactionService.getTransactions(address);

      if (!result.success) return result;

      const transactions = result.data;
      const purchaseTransactions = transactions.filter(
        (tx) => tx.type === "purchase"
      );

      // Calculate statistics
      const totalSpent = purchaseTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
        .toFixed(4);

      const totalRecords = purchaseTransactions.reduce(
        (sum, tx) => sum + (tx.recordCount || 0),
        0
      );

      // Group by data type
      const dataTypeBreakdown = purchaseTransactions.reduce((types, tx) => {
        const dataType = tx.dataType || "Unknown";
        types[dataType] = (types[dataType] || 0) + 1;
        return types;
      }, {});

      return {
        success: true,
        data: {
          totalPurchases: purchaseTransactions.length,
          totalSpent,
          totalRecords,
          activePurchases: purchaseTransactions.filter(
            (tx) => tx.status === "completed" && tx.dataAvailable
          ).length,
          dataTypeBreakdown,
          recentPurchase:
            purchaseTransactions.length > 0
              ? purchaseTransactions.sort(
                  (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                )[0]
              : null,
        },
        message: "Purchase statistics loaded successfully",
      };
    } catch (error) {
      console.error("Error calculating purchase statistics:", error);

      return {
        success: false,
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || "Failed to calculate purchase statistics",
      };
    }
  },
};

export default researcherTransactionService;
