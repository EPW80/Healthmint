// src/services/mockPaymentService.js
class MockPaymentService {
  constructor() {
    this.isInitialized = false;
    this.mockBalance = "10.0";
    this.mockTransactions = [];
    this.pendingTransactions = [];
    this.MIN_BALANCE = 1.0; // Minimum balance to maintain
    this.AUTO_REFILL = true; // Auto refill when balance is low

    // Generate some mock transactions for testing
    this._generateMockTransactions();
  }

  async initializeProvider() {
    console.log("Initializing mock payment service...");

    // Simulate a slight delay to mimic actual blockchain connection
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.isInitialized = true;
    console.log("Mock payment service initialized successfully");

    return { success: true };
  }

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

  // Set auto-refill option
  setAutoRefill(enabled) {
    this.AUTO_REFILL = enabled;
    console.log(`Auto-refill ${enabled ? "enabled" : "disabled"}`);
  }

  // Get auto-refill status
  async purchaseDataset(
    datasetId,
    amount,
    tier = "complete",
    recordCount = null
  ) {
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

    console.log(
      `Mock purchasing dataset ${datasetId} (${tier} tier) for ${amount} ETH`
    );

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

    // Create transaction record with tier information
    const transaction = {
      paymentId: `pay_${Date.now()}`,
      datasetId,
      amount,
      tier, // Add tier information
      recordCount, // Add record count information
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
      tier,
      recordCount,
      amount,
    };
  }

  async getPaymentHistory(filters = {}) {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    let transactions = [...this.mockTransactions];

    // Apply filters if provided
    if (filters) {
      if (filters.tier) {
        transactions = transactions.filter((tx) => tx.tier === filters.tier);
      }
      if (filters.datasetId) {
        transactions = transactions.filter(
          (tx) => tx.datasetId === filters.datasetId
        );
      }
    }

    return transactions;
  }

  async getPendingTransactions() {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    return [...this.pendingTransactions];
  }

  _generateMockTransactions() {
    const categories = [
      "General Health",
      "Cardiology",
      "Neurology",
      "Laboratory",
      "Genetics",
      "Immunization",
    ];

    const tiers = [
      { id: "basic", percentage: 25 },
      { id: "standard", percentage: 50 },
      { id: "complete", percentage: 100 },
    ];

    // Generate 5-10 mock historical transactions
    const count = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < count; i++) {
      // Random date in the last 90 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));

      const amount = (Math.random() * 0.49 + 0.01).toFixed(4);

      const datasetId = `ds_${Math.floor(Math.random() * 1000)}`;

      const category =
        categories[Math.floor(Math.random() * categories.length)];

      const tier = tiers[Math.floor(Math.random() * tiers.length)];

      const baseRecordCount = 1000 + Math.floor(Math.random() * 9000);
      const recordCount = Math.round(baseRecordCount * (tier.percentage / 100));

      this.mockTransactions.push({
        paymentId: `pay_${date.getTime()}`,
        datasetId,
        amount,
        tier: tier.id,
        recordCount,
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

const mockPaymentService = new MockPaymentService();
export default mockPaymentService;
