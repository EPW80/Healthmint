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
    this.mockBalance = "10.0"; // Increased default mock balance for more purchasing power
    this.mockTransactions = [];
    this.pendingTransactions = [];
    this.MIN_BALANCE = 1.0; // Minimum balance to maintain
    this.AUTO_REFILL = true; // Auto refill when balance is low

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

    // Check if balance is low and auto-refill is enabled
    if (this.AUTO_REFILL && parseFloat(this.mockBalance) < this.MIN_BALANCE) {
      await this.refillBalance();
    }

    console.log(`Mock balance: ${this.mockBalance} ETH`);
    return this.mockBalance;
  }

  /**
   * Refill wallet balance - useful when testing many purchases
   * @param {number} amount - Amount to add (default: refill to 10 ETH)
   * @returns {Promise<string>} The new balance
   */
  async refillBalance(amount = null) {
    // If amount is null, refill to 10 ETH
    if (amount === null) {
      this.mockBalance = "10.0";
    } else {
      // Otherwise add the specified amount
      this.mockBalance = (
        parseFloat(this.mockBalance) + parseFloat(amount)
      ).toFixed(6);
    }

    // Create a transaction record for the deposit
    const transaction = {
      paymentId: `deposit_${Date.now()}`,
      type: "deposit",
      amount: amount === null ? "10.0" : amount.toString(),
      transactionHash: `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`,
      blockNumber: 14000000 + Math.floor(Math.random() * 1000000),
      gasUsed: 21000, // Standard gas for a transfer
      timestamp: new Date().toISOString(),
      status: "success",
    };

    // Add to mock transactions
    this.mockTransactions.unshift(transaction);

    console.log(`Balance refilled. New balance: ${this.mockBalance} ETH`);
    return this.mockBalance;
  }

  /**
   * Set auto-refill option
   * @param {boolean} enabled - Whether to enable auto-refill
   */
  setAutoRefill(enabled) {
    this.AUTO_REFILL = enabled;
    console.log(`Auto-refill ${enabled ? "enabled" : "disabled"}`);
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

    // Parse amounts for comparison
    const parsedAmount = parseFloat(amount);
    const currentBalance = parseFloat(this.mockBalance);

    // Check if user has sufficient funds
    if (currentBalance < parsedAmount) {
      // If auto-refill is enabled, refill and continue
      if (this.AUTO_REFILL) {
        console.log("Insufficient funds. Auto-refilling wallet...");
        await this.refillBalance();
      } else {
        // Otherwise, return an error
        console.error(
          `Insufficient funds. Required: ${amount} ETH, Available: ${this.mockBalance} ETH`
        );
        return {
          success: false,
          error: `Insufficient funds. Required: ${amount} ETH, Available: ${this.mockBalance} ETH`,
        };
      }
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

    // Calculate gas cost (much lower than before - more realistic for testnet)
    const gasUsed = Math.floor(Math.random() * 50000) + 21000;
    const gasPrice = 0.000000002; // 2 Gwei
    const gasCost = gasUsed * gasPrice;

    // Update mock balance (subtraction with gas costs)
    this.mockBalance = (currentBalance - parsedAmount - gasCost).toFixed(6);

    // Create transaction record
    const transaction = {
      paymentId: `pay_${Date.now()}`,
      datasetId,
      amount,
      transactionHash,
      blockNumber,
      gasUsed,
      gasCost: gasCost.toFixed(6),
      timestamp: new Date().toISOString(),
      status: "success",
    };

    // Add to mock transactions
    this.mockTransactions.unshift(transaction);

    return {
      success: true,
      transactionHash,
      blockNumber,
      gasUsed,
      gasCost: gasCost.toFixed(6),
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

      // Random amount between 0.01 and 0.5 ETH (ensuring it's below 0.7 ETH)
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
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        gasCost: (
          0.000000002 *
          (Math.floor(Math.random() * 50000) + 21000)
        ).toFixed(6),
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
