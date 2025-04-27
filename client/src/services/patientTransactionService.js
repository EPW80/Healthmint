// client/src/services/patientTransactionService.js
import mockData from "./mockData";

// service to handle patient transactions
const DELAYS = {
  TRANSACTIONS: 800,
  SHARING_DETAILS: 600,
  REVOKE_ACCESS: 1200,
  UPDATE_CONSENT: 1000,
};

// Get patient sharing details
const patientTransactionService = {
  // Get patient transactions
  getTransactions: async (address, options = {}) => {
    if (!address) {
      console.error("getTransactions called without an address");
      return {
        success: false,
        error: "ADDRESS_REQUIRED",
        message: "No wallet address provided",
      };
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, DELAYS.TRANSACTIONS));
      let transactions = mockData.getPatientTransactions(address);

      // Apply filters if provided
      if (options.type) {
        transactions = transactions.filter((tx) => tx.type === options.type);
      }

      if (options.status) {
        transactions = transactions.filter(
          (tx) => tx.status === options.status
        );
      }

      // Apply limit if provided
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
      console.error("Error fetching patient transactions:", error);
      return {
        success: false,
        error: "FETCH_ERROR",
        message: error.message || "Failed to load transaction history",
      };
    }
  },

  // get patient sharing details
  getRecentTransactions: async (address, days = 7) => {
    if (!address) {
      return {
        success: false,
        error: "ADDRESS_REQUIRED",
        message: "No wallet address provided",
      };
    }

    try {
      const transactions =
        await patientTransactionService.getTransactions(address);

      if (!transactions.success) {
        return transactions;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentTransactions = transactions.data.filter(
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
        error: "FETCH_ERROR",
        message: error.message || "Failed to load recent transactions",
      };
    }
  },

  // get patient sharing details
  getSharingDetails: async (transactionId, address) => {
    if (!transactionId || !address) {
      console.error("getSharingDetails called with missing parameters", {
        transactionId,
        address,
      });
      return {
        success: false,
        error: "INVALID_PARAMS",
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAYS.SHARING_DETAILS)
      );

      const transaction = mockData.getPatientTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          error: "NOT_FOUND",
          message: "Transaction not found or access denied",
        };
      }

      // Only 'share' type transactions should have sharing details
      if (transaction.type !== "share" && transaction.type !== "consent") {
        return {
          success: false,
          error: "INVALID_TYPE",
          message: "Transaction is not a sharing or consent transaction",
        };
      }

      // Enrich the transaction with additional details
      return {
        success: true,
        data: {
          ...transaction,
          accessEvents: transaction.accessEvents || [],
          rewardHistory: transaction.rewardHistory || [],
          consentDetails: transaction.consentDetails || {
            dataUseRestrictions: [],
            anonymizationLevel: "full",
            auditTrail: [],
          },
          isExpired: transaction.expiration
            ? new Date(transaction.expiration) < new Date()
            : false,
        },
        message: "Sharing details loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching sharing details:", error);
      return {
        success: false,
        error: "FETCH_ERROR",
        message: error.message || "Failed to load sharing details",
      };
    }
  },

  // Update consent details
  revokeAccess: async (transactionId, address, options = {}) => {
    if (!transactionId || !address) {
      console.error("revokeAccess called with missing parameters", {
        transactionId,
        address,
      });
      return {
        success: false,
        error: "INVALID_PARAMS",
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // First check if the transaction exists and is revocable
      const transaction = mockData.getPatientTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          error: "NOT_FOUND",
          message: "Transaction not found or access denied",
        };
      }

      if (!transaction.canRevoke) {
        return {
          success: false,
          error: "CANNOT_REVOKE",
          message: "This access cannot be revoked",
        };
      }

      // Simulate blockchain transaction with delay
      await new Promise((resolve) => setTimeout(resolve, DELAYS.REVOKE_ACCESS));

      const now = new Date();

      return {
        success: true,
        data: {
          transactionId,
          revoked: true,
          timestamp: now.toISOString(),
          reason: options.reason || "User initiated revocation",
          transactionHash: `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("")}`,
          effectiveDate: now.toISOString(),
        },
        message: "Access successfully revoked",
      };
    } catch (error) {
      console.error("Error revoking access:", error);
      return {
        success: false,
        error: "REVOCATION_ERROR",
        message: error.message || "Failed to revoke access",
      };
    }
  },

  // Update consent details
  updateConsent: async (consentDetails, address) => {
    if (!consentDetails || !address) {
      console.error("updateConsent called with missing parameters", {
        consentDetails,
        address,
      });
      return {
        success: false,
        error: "INVALID_PARAMS",
        message: "Missing consent details or wallet address",
      };
    }

    // Validate consent details
    if (!consentDetails.dataId) {
      return {
        success: false,
        error: "INVALID_DATA",
        message: "Data ID is required for consent update",
      };
    }

    try {
      // Simulate blockchain transaction with delay
      await new Promise((resolve) =>
        setTimeout(resolve, DELAYS.UPDATE_CONSENT)
      );

      // Generate a mock transaction
      const mockTransaction = {
        id: `tx_consent_${Date.now().toString(36)}`,
        hash: `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`,
        timestamp: new Date().toISOString(),
        status: "completed",
        type: "consent",
        dataId: consentDetails.dataId,
        dataName: consentDetails.dataName || "Health Records",
        description: "Updated data sharing consent",
        sharedWith: consentDetails.sharedWith || "All Researchers",
        permission: consentDetails.permission || "Read-only",
        expiration: consentDetails.expiration,
        canRevoke: true,
        consentDetails: {
          ...consentDetails,
          lastUpdated: new Date().toISOString(),
          updatedBy: address,
        },
      };

      return {
        success: true,
        data: mockTransaction,
        message: "Consent updated successfully",
      };
    } catch (error) {
      console.error("Error updating consent:", error);
      return {
        success: false,
        error: "CONSENT_UPDATE_ERROR",
        message: error.message || "Failed to update consent",
      };
    }
  },

  // Get sharing statistics
  getSharingStatistics: async (address) => {
    if (!address) {
      return {
        success: false,
        error: "ADDRESS_REQUIRED",
        message: "No wallet address provided",
      };
    }

    try {
      const transactionsResult =
        await patientTransactionService.getTransactions(address);

      if (!transactionsResult.success) {
        return transactionsResult;
      }

      const transactions = transactionsResult.data;
      const shareTransactions = transactions.filter(
        (tx) => tx.type === "share"
      );

      // Calculate statistics
      const totalShared = shareTransactions.length;
      const activeShares = shareTransactions.filter(
        (tx) =>
          tx.status === "completed" &&
          (!tx.expiration || new Date(tx.expiration) > new Date())
      ).length;

      const totalRewards = shareTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
        .toFixed(4);

      // Group by recipient
      const recipientCounts = shareTransactions.reduce((counts, tx) => {
        const recipient = tx.sharedWith || "Unknown";
        counts[recipient] = (counts[recipient] || 0) + 1;
        return counts;
      }, {});

      return {
        success: true,
        data: {
          totalShared,
          activeShares,
          expiredShares: totalShared - activeShares,
          totalRewards,
          recipientCounts,
          lastShared:
            shareTransactions.length > 0
              ? shareTransactions.sort(
                  (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                )[0].timestamp
              : null,
        },
        message: "Sharing statistics loaded successfully",
      };
    } catch (error) {
      console.error("Error calculating sharing statistics:", error);
      return {
        success: false,
        error: "STATS_ERROR",
        message: error.message || "Failed to calculate sharing statistics",
      };
    }
  },
};

export default patientTransactionService;
