// client/src/services/patientTransactionService.js
import mockData from "./mockData";

const patientTransactionService = {
  getTransactions: async (address) => {
    if (!address) {
      return {
        success: false,
        message: "No wallet address provided",
      };
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const transactions = mockData.getPatientTransactions(address);

      return {
        success: true,
        data: transactions,
        message: "Transactions loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching patient transactions:", error);
      return {
        success: false,
        message: error.message || "Failed to load transaction history",
      };
    }
  },

  getSharingDetails: async (transactionId, address) => {
    if (!transactionId || !address) {
      return {
        success: false,
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // Simulate API call with delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Get mock data for the specific sharing transaction
      const transaction = mockData.getPatientTransactionById(
        transactionId,
        address
      );

      if (!transaction) {
        return {
          success: false,
          message: "Transaction not found or access denied",
        };
      }

      return {
        success: true,
        data: {
          ...transaction,
          accessEvents: transaction.accessEvents || [],
          rewardHistory: transaction.rewardHistory || [],
          consentDetails: transaction.consentDetails || {},
        },
        message: "Sharing details loaded successfully",
      };
    } catch (error) {
      console.error("Error fetching sharing details:", error);
      return {
        success: false,
        message: error.message || "Failed to load sharing details",
      };
    }
  },

  revokeAccess: async (transactionId, address) => {
    if (!transactionId || !address) {
      return {
        success: false,
        message: "Missing transaction ID or wallet address",
      };
    }

    try {
      // Simulate blockchain transaction with delay
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return {
        success: true,
        data: {
          transactionId,
          revoked: true,
          timestamp: new Date().toISOString(),
        },
        message: "Access successfully revoked",
      };
    } catch (error) {
      console.error("Error revoking access:", error);
      return {
        success: false,
        message: error.message || "Failed to revoke access",
      };
    }
  },

  // Example: Updating consent details
  updateConsent: async (consentDetails, address) => {
    if (!consentDetails || !address) {
      return {
        success: false,
        message: "Missing consent details or wallet address",
      };
    }

    try {
      // Simulate blockchain transaction with delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, return a mock transaction
      const mockTransaction = {
        id: "tx_" + Math.random().toString(36).substr(2, 9),
        hash: "0x" + Math.random().toString(36).substr(2, 64),
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
        message: error.message || "Failed to update consent",
      };
    }
  },
};

export default patientTransactionService;
