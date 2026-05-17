// client/src/services/mockData.js

// Helper functions for generating dates
const daysAgo = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (hours) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const daysFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

// Generate transaction hash
const generateTxHash = () =>
  `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

// Base transactions factory
const createTransaction = (overrides = {}) => ({
  id: `tx_${Math.random().toString(36).substring(2, 10)}`,
  hash: generateTxHash(),
  timestamp: daysAgo(1),
  status: "completed",
  type: "purchase",
  amount: "0.05",
  description: "Transaction description",
  ...overrides,
});

const mockData = {
  // Mock data for demonstration purposes
  getResearcherTransactions: (address) => {
    return [
      createTransaction({
        id: "tx_purchase_123",
        timestamp: daysAgo(1),
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
      }),
      createTransaction({
        id: "tx_purchase_456",
        timestamp: daysAgo(3),
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
      }),
      createTransaction({
        id: "tx_purchase_789",
        timestamp: daysAgo(7),
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
      }),
      createTransaction({
        id: "tx_purchase_101",
        timestamp: daysAgo(18),
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
      }),
      createTransaction({
        id: "tx_purchase_202",
        timestamp: daysAgo(45),
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
      }),
      createTransaction({
        id: "tx_purchase_pending",
        hash: generateTxHash(),
        timestamp: hoursAgo(2),
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
      }),
      createTransaction({
        id: "tx_purchase_failed",
        timestamp: daysAgo(5),
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
      }),
    ];
  },

  // Get patient transactions with our helper functions
  getPatientTransactions: (address) => {
    return [
      createTransaction({
        id: "tx_share_123",
        timestamp: daysAgo(2),
        type: "share",
        dataId: "health_records_123",
        dataName: "Blood Pressure Records",
        amount: "0.03", // reward amount
        description: "Shared blood pressure data with research group",
        sharedWith: "Cardiac Research Institute",
        permission: "Read-only",
        expiration: daysFromNow(90),
        canRevoke: true,
      }),
      createTransaction({
        id: "tx_share_456",
        timestamp: daysAgo(8),
        type: "share",
        dataId: "health_records_456",
        dataName: "Glucose Monitoring Data",
        amount: "0.05",
        description: "Shared diabetes monitoring data with research group",
        sharedWith: "National Diabetes Research Center",
        permission: "Read-only",
        expiration: daysFromNow(180),
        canRevoke: true,
      }),
      createTransaction({
        id: "tx_consent_789",
        timestamp: daysAgo(15),
        type: "consent",
        dataId: "all_records",
        dataName: "All Health Records",
        amount: "0",
        description: "Updated global data sharing preferences",
        sharedWith: "All Verified Researchers",
        permission: "Anonymous access only",
        expiration: null,
        canRevoke: true,
      }),
      createTransaction({
        id: "tx_upload_101",
        timestamp: daysAgo(20),
        type: "upload",
        dataId: "health_records_101",
        dataName: "Annual Physical Results",
        amount: "0",
        description: "Uploaded annual physical examination results",
        sharedWith: "Personal use only",
        permission: "Owner",
        expiration: null,
        canRevoke: false,
      }),
      createTransaction({
        id: "tx_share_202",
        timestamp: daysAgo(40),
        type: "share",
        dataId: "health_records_202",
        dataName: "Sleep Tracking Data",
        amount: "0.02",
        description: "Shared sleep data from wearable device",
        sharedWith: "Sleep Science Institute",
        permission: "Read-only",
        expiration: daysAgo(10),
        canRevoke: false,
      }),
      createTransaction({
        id: "tx_share_pending",
        timestamp: hoursAgo(4),
        status: "pending",
        type: "share",
        dataId: "health_records_303",
        dataName: "Heart Rate Data",
        amount: "0.04",
        description: "Sharing heart rate monitoring data",
        sharedWith: "Cardiac Research Network",
        permission: "Read-only",
        expiration: daysFromNow(365),
        canRevoke: false,
      }),
      createTransaction({
        id: "tx_share_failed",
        timestamp: daysAgo(10),
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
      }),
    ];
  },

  // Get specific transactions by ID with proper error handling
  getResearcherTransactionById: (transactionId, address) => {
    if (!transactionId) {
      console.error("Transaction ID is required");
      return null;
    }

    try {
      const transactions = mockData.getResearcherTransactions(address);
      return transactions.find((tx) => tx.id === transactionId) || null;
    } catch (error) {
      console.error("Error fetching researcher transaction:", error);
      return null;
    }
  },

  getPatientTransactionById: (transactionId, address) => {
    if (!transactionId) {
      console.error("Transaction ID is required");
      return null;
    }

    try {
      const transactions = mockData.getPatientTransactions(address);
      return transactions.find((tx) => tx.id === transactionId) || null;
    } catch (error) {
      console.error("Error fetching patient transaction:", error);
      return null;
    }
  },

  // New helper methods for flexible querying
  getTransactionsByStatus: (address, role, status) => {
    const transactions =
      role === "researcher"
        ? mockData.getResearcherTransactions(address)
        : mockData.getPatientTransactions(address);

    return transactions.filter((tx) => tx.status === status);
  },

  getTransactionsByType: (address, role, type) => {
    const transactions =
      role === "researcher"
        ? mockData.getResearcherTransactions(address)
        : mockData.getPatientTransactions(address);

    return transactions.filter((tx) => tx.type === type);
  },

  getRecentTransactions: (address, role, days = 7) => {
    const transactions =
      role === "researcher"
        ? mockData.getResearcherTransactions(address)
        : mockData.getPatientTransactions(address);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return transactions.filter((tx) => new Date(tx.timestamp) >= cutoffDate);
  },
};

export default mockData;
