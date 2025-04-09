// client/src/services/mockData.js

/**
 * Mock data service for transaction history
 * Provides mock data for both researcher and patient roles
 */
const mockData = {
  /**
   * Generate mock researcher transactions (purchases of health data)
   * @param {string} address - Wallet address
   * @returns {Array} - Array of transaction objects
   */
  getResearcherTransactions: (address) => {
    // Create some mock transactions with realistic data
    return [
      {
        id: "tx_purchase_123",
        hash: "0x7feb9a0a6eb06fb3d170c333bcacb09473e1e468d9c7f7c3b4a93b2aec675bd6",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: "completed",
        type: "purchase",
        dataId: "dataset_123",
        dataName: "Anonymized Blood Pressure Records",
        dataType: "Clinical Metrics",
        amount: "0.05",
        description: "Purchase of anonymized blood pressure data",
        recordCount: 1250,
        fileSize: "2.4 MB",
        dataAvailable: true,
        downloadUrl: "/api/datasets/123/download",
      },
      {
        id: "tx_purchase_456",
        hash: "0x3cba87c8a7fa5a782c1adfe3cbabf9f87b3dd8eee6cf22b7e34fd7e567913456",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        status: "completed",
        type: "purchase",
        dataId: "dataset_456",
        dataName: "Diabetes Monitoring Data",
        dataType: "Time Series",
        amount: "0.08",
        description: "Diabetes monitoring dataset for research",
        recordCount: 850,
        fileSize: "3.7 MB",
        dataAvailable: true,
        downloadUrl: "/api/datasets/456/download",
      },
      {
        id: "tx_purchase_789",
        hash: "0x9a52d34e4c2f67e890bcc8b14a7b5971c7e8b7b1b3f4a5de1aa2b3c7e8d9f6a5",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        status: "completed",
        type: "purchase",
        dataId: "dataset_789",
        dataName: "Sleep Patterns Dataset",
        dataType: "Time Series",
        amount: "0.04",
        description: "Anonymized sleep pattern data from wearable devices",
        recordCount: 520,
        fileSize: "1.8 MB",
        dataAvailable: true,
        downloadUrl: "/api/datasets/789/download",
      },
      {
        id: "tx_purchase_101",
        hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        timestamp: new Date(
          Date.now() - 18 * 24 * 60 * 60 * 1000
        ).toISOString(), // 18 days ago
        status: "completed",
        type: "purchase",
        dataId: "dataset_101",
        dataName: "Heart Rate Variability",
        dataType: "Clinical Metrics",
        amount: "0.07",
        description: "Heart rate variability data for cardiac research",
        recordCount: 975,
        fileSize: "4.2 MB",
        dataAvailable: true,
        downloadUrl: "/api/datasets/101/download",
      },
      {
        id: "tx_purchase_202",
        hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        timestamp: new Date(
          Date.now() - 45 * 24 * 60 * 60 * 1000
        ).toISOString(), // 45 days ago
        status: "completed",
        type: "purchase",
        dataId: "dataset_202",
        dataName: "Cholesterol Measurements",
        dataType: "Lab Results",
        amount: "0.06",
        description: "Anonymized cholesterol data from lab tests",
        recordCount: 650,
        fileSize: "1.5 MB",
        dataAvailable: true,
        downloadUrl: "/api/datasets/202/download",
      },
      {
        id: "tx_purchase_pending",
        hash: "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: "pending",
        type: "purchase",
        dataId: "dataset_303",
        dataName: "COVID-19 Recovery Metrics",
        dataType: "Clinical Study",
        amount: "0.12",
        description: "Anonymized COVID-19 recovery data",
        recordCount: 420,
        fileSize: "6.8 MB",
        dataAvailable: false,
      },
      {
        id: "tx_purchase_failed",
        hash: "0x0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        status: "failed",
        type: "purchase",
        dataId: "dataset_404",
        dataName: "Genetic Markers Dataset",
        dataType: "Genomic Data",
        amount: "0.15",
        description: "Transaction failed due to insufficient funds",
        recordCount: 0,
        fileSize: "0 KB",
        dataAvailable: false,
      },
    ];
  },

  /**
   * Get a specific researcher transaction by ID
   * @param {string} transactionId - Transaction ID
   * @param {string} address - Wallet address
   * @returns {Object|null} - Transaction object or null if not found
   */
  getResearcherTransactionById: (transactionId, address) => {
    const transactions = mockData.getResearcherTransactions(address);
    return transactions.find((tx) => tx.id === transactionId) || null;
  },

  /**
   * Generate mock patient transactions (data sharing, consent, uploads)
   * @param {string} address - Wallet address
   * @returns {Array} - Array of transaction objects
   */
  getPatientTransactions: (address) => {
    // Create some mock transactions with realistic data
    return [
      {
        id: "tx_share_123",
        hash: "0x8feb9a0a6eb06fb3d170c333bcacb09473e1e468d9c7f7c3b4a93b2aec675bd7",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: "completed",
        type: "share",
        dataId: "health_records_123",
        dataName: "Blood Pressure Records",
        amount: "0.03", // reward amount
        description: "Shared blood pressure data with research group",
        sharedWith: "Cardiac Research Institute",
        permission: "Read-only",
        expiration: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(), // 90 days from now
        canRevoke: true,
      },
      {
        id: "tx_share_456",
        hash: "0x4cba87c8a7fa5a782c1adfe3cbabf9f87b3dd8eee6cf22b7e34fd7e567913457",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        status: "completed",
        type: "share",
        dataId: "health_records_456",
        dataName: "Glucose Monitoring Data",
        amount: "0.05", // reward amount
        description: "Shared diabetes monitoring data with research group",
        sharedWith: "National Diabetes Research Center",
        permission: "Read-only",
        expiration: new Date(
          Date.now() + 180 * 24 * 60 * 60 * 1000
        ).toISOString(), // 180 days from now
        canRevoke: true,
      },
      {
        id: "tx_consent_789",
        hash: "0xa52d34e4c2f67e890bcc8b14a7b5971c7e8b7b1b3f4a5de1aa2b3c7e8d9f6a6",
        timestamp: new Date(
          Date.now() - 15 * 24 * 60 * 60 * 1000
        ).toISOString(), // 15 days ago
        status: "completed",
        type: "consent",
        dataId: "all_records",
        dataName: "All Health Records",
        amount: "0", // No direct reward for consent updates
        description: "Updated global data sharing preferences",
        sharedWith: "All Verified Researchers",
        permission: "Anonymous access only",
        expiration: null, // No expiration
        canRevoke: true,
      },
      {
        id: "tx_upload_101",
        hash: "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef",
        timestamp: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000
        ).toISOString(), // 20 days ago
        status: "completed",
        type: "upload",
        dataId: "health_records_101",
        dataName: "Annual Physical Results",
        amount: "0", // No reward for uploads
        description: "Uploaded annual physical examination results",
        sharedWith: "Personal use only",
        permission: "Owner",
        expiration: null,
        canRevoke: false,
      },
      {
        id: "tx_share_202",
        hash: "0xbcdef2345678901abcdef2345678901abcdef2345678901abcdef2345678901a",
        timestamp: new Date(
          Date.now() - 40 * 24 * 60 * 60 * 1000
        ).toISOString(), // 40 days ago
        status: "completed",
        type: "share",
        dataId: "health_records_202",
        dataName: "Sleep Tracking Data",
        amount: "0.02", // reward amount
        description: "Shared sleep data from wearable device",
        sharedWith: "Sleep Science Institute",
        permission: "Read-only",
        expiration: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(), // Expired 10 days ago
        canRevoke: false,
      },
      {
        id: "tx_share_pending",
        hash: "0xef2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcd",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        status: "pending",
        type: "share",
        dataId: "health_records_303",
        dataName: "Heart Rate Data",
        amount: "0.04", // pending reward amount
        description: "Sharing heart rate monitoring data",
        sharedWith: "Cardiac Research Network",
        permission: "Read-only",
        expiration: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1 year from now
        canRevoke: false,
      },
      {
        id: "tx_share_failed",
        hash: "0x1087654321fedcba1087654321fedcba1087654321fedcba1087654321fedcba",
        timestamp: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(), // 10 days ago
        status: "failed",
        type: "share",
        dataId: "health_records_404",
        dataName: "Genetic Test Results",
        amount: "0",
        description:
          "Failed to share genetic data due to consent policy violation",
        sharedWith: "Genomic Research Lab",
        permission: "N/A",
        expiration: null,
        canRevoke: false,
      },
    ];
  },

  /**
   * Get a specific patient transaction by ID
   * @param {string} transactionId - Transaction ID
   * @param {string} address - Wallet address
   * @returns {Object|null} - Transaction object or null if not found
   */
  getPatientTransactionById: (transactionId, address) => {
    const transactions = mockData.getPatientTransactions(address);
    return transactions.find((tx) => tx.id === transactionId) || null;
  },
};

export default mockData;
