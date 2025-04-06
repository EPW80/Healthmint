// src/services/mockPaymentService.js
/**
 * Mock Payment Service
 *
 * Provides mock implementations of blockchain and payment interactions
 * for testing and development without requiring actual blockchain connections.
 */

class MockPaymentService {
  constructor() {
    this.isInitialized = false;
    this.mockBalance = "1.5"; // Default mock balance in ETH
    this.mockTransactions = [];
    this.pendingTransactions = [];

    // Generate some mock transactions for testing
    this._generateMockTransactions();
  }

  /**
   * Initialize the provider - always succeeds in mock implementation
   */
  async initializeProvider() {
    console.log("Initializing mock payment service...");

    // Simulate a slight delay to mimic actual blockchain connection
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.isInitialized = true;
    console.log("Mock payment service initialized successfully");

    return { success: true };
  }

  /**
   * Get wallet balance - always returns the mock balance
   * @returns {Promise<string>} The mocked wallet balance
   */
  async getBalance() {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(`Mock balance: ${this.mockBalance} ETH`);
    return this.mockBalance;
  }

  /**
   * Purchase a dataset with mock transaction
   * @param {string} datasetId - ID of the dataset to purchase
   * @param {string|number} amount - Amount to pay for the dataset
   * @returns {Promise<Object>} Transaction result
   */
  async purchaseDataset(datasetId, amount) {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    console.log(`Mock purchasing dataset ${datasetId} for ${amount} ETH`);

    // Simulate network delay and processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate a mock transaction hash
    const transactionHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    // Generate mock block number
    const blockNumber = 14000000 + Math.floor(Math.random() * 1000000);

    // Update mock balance (simple subtraction without validation)
    this.mockBalance = (
      parseFloat(this.mockBalance) - parseFloat(amount)
    ).toFixed(6);

    // Create transaction record
    const transaction = {
      paymentId: `pay_${Date.now()}`,
      datasetId,
      amount,
      transactionHash,
      blockNumber,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      timestamp: new Date().toISOString(),
      status: "success",
    };

    // Add to mock transactions
    this.mockTransactions.unshift(transaction);

    return {
      success: true,
      transactionHash,
      blockNumber,
      gasUsed: transaction.gasUsed,
      timestamp: transaction.timestamp,
    };
  }

  /**
   * Get payment history
   * @returns {Promise<Array>} List of transactions
   */
  async getPaymentHistory() {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [...this.mockTransactions];
  }

  /**
   * Get pending transactions
   * @returns {Promise<Array>} List of pending transactions
   */
  async getPendingTransactions() {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    return [...this.pendingTransactions];
  }

  /**
   * Generate mock transaction history
   * @private
   */
  _generateMockTransactions() {
    const categories = [
      "General Health",
      "Cardiology",
      "Neurology",
      "Laboratory",
      "Genetics",
      "Immunization",
    ];

    // Generate 5-10 mock historical transactions
    const count = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < count; i++) {
      // Random date in the last 90 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));

      // Random amount between 0.01 and 0.5 ETH
      const amount = (Math.random() * 0.49 + 0.01).toFixed(4);

      // Random dataset ID
      const datasetId = `ds_${Math.floor(Math.random() * 1000)}`;

      // Random category
      const category =
        categories[Math.floor(Math.random() * categories.length)];

      this.mockTransactions.push({
        paymentId: `pay_${date.getTime()}`,
        datasetId,
        amount,
        transactionHash: `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`,
        blockNumber: 14000000 + Math.floor(Math.random() * 1000000),
        gasUsed: Math.floor(Math.random() * 100000) + 50000,
        timestamp: date.toISOString(),
        status: "success",
        category,
      });
    }

    // Sort by date (newest first)
    this.mockTransactions.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }
}

// Create and export a singleton instance
const mockPaymentService = new MockPaymentService();
export default mockPaymentService;
