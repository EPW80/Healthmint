// src/services/mockPaymentService.js
// This is a mock implementation for a blockchain payment service
class MockPaymentService {
  constructor() {
    this.isInitialized = false;
    this.mockBalance = "10.0";
    this.mockTransactions = [];
    this.pendingTransactions = [];
    this.config = {
      minBalance: 1.0, // Minimum balance threshold for auto-refill
      autoRefill: true, // Auto-refill when balance is low
      defaultGasPrice: 2e-9, // 2 Gwei in ETH
      defaultRefillAmount: "10.0",
      networkLatency: {
        init: 500,
        balance: 300,
        purchase: 1500,
        history: 500,
      },
    };

    // Initialize mock transaction history
    this._generateMockTransactions();
  }

  // Simulates a delay for network latency
  async initializeProvider() {
    if (this.isInitialized) return { success: true };

    try {
      // Simulate network latency
      await this._delay(this.config.networkLatency.init);
      this.isInitialized = true;
      console.log("Mock payment service initialized successfully");
      return { success: true };
    } catch (error) {
      console.error("Failed to initialize payment service:", error);
      return { success: false, error: error.message };
    }
  }

  // Simulates a delay for network latency
  async getBalance() {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.initializeProvider();
      }

      await this._delay(this.config.networkLatency.balance);

      // Check for auto-refill
      if (
        this.config.autoRefill &&
        parseFloat(this.mockBalance) < this.config.minBalance
      ) {
        await this.refillBalance();
      }

      return this.mockBalance;
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  // Simulates a delay for network latency
  async refillBalance(amount = null) {
    try {
      const refillAmount = amount || this.config.defaultRefillAmount;
      const formattedRefillAmount =
        typeof refillAmount === "string"
          ? refillAmount
          : refillAmount.toString();

      // Update balance
      if (amount === null) {
        this.mockBalance = this.config.defaultRefillAmount;
      } else {
        this.mockBalance = (
          parseFloat(this.mockBalance) + parseFloat(refillAmount)
        ).toFixed(6);
      }

      // Create transaction record
      const transaction = this._createTransaction({
        type: "deposit",
        amount: formattedRefillAmount,
        status: "success",
      });

      // Add to transaction history
      this.mockTransactions.unshift(transaction);

      return this.mockBalance;
    } catch (error) {
      console.error("Error refilling balance:", error);
      throw error;
    }
  }

  // Simulates a delay for network latency
  setAutoRefill(enabled) {
    this.config.autoRefill = enabled;
    return { success: true, autoRefill: enabled };
  }

  // Simulates a delay for network latency
  getAutoRefillStatus() {
    return {
      enabled: this.config.autoRefill,
      minBalance: this.config.minBalance,
    };
  }

  // Simulates a delay for network latency
  async purchaseDataset(
    datasetId,
    amount,
    tier = "complete",
    recordCount = null
  ) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.initializeProvider();
      }

      // Input validation
      if (!datasetId) throw new Error("Dataset ID is required");
      if (!amount) throw new Error("Purchase amount is required");

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Invalid purchase amount");
      }

      const currentBalance = parseFloat(this.mockBalance);

      // Check for sufficient funds
      if (currentBalance < parsedAmount) {
        // Handle auto-refill
        if (this.config.autoRefill) {
          await this.refillBalance();
        } else {
          return {
            success: false,
            error: `Insufficient funds. Required: ${amount} ETH, Available: ${this.mockBalance} ETH`,
          };
        }
      }

      // Simulate transaction processing time
      await this._delay(this.config.networkLatency.purchase);

      // Calculate gas cost
      const gasUsed = Math.floor(Math.random() * 50000) + 21000;
      const gasCost = gasUsed * this.config.defaultGasPrice;

      // Update balance (purchase amount + gas cost)
      this.mockBalance = (
        parseFloat(this.mockBalance) -
        parsedAmount -
        gasCost
      ).toFixed(6);

      // Create transaction record
      const transaction = this._createTransaction({
        paymentId: `pay_${Date.now()}`,
        datasetId,
        amount: parsedAmount.toString(),
        tier,
        recordCount,
        gasUsed,
        gasCost: gasCost.toFixed(6),
        status: "success",
      });

      // Add to transaction history
      this.mockTransactions.unshift(transaction);

      return {
        success: true,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        gasUsed,
        gasCost: gasCost.toFixed(6),
        timestamp: transaction.timestamp,
        tier,
        recordCount,
        amount: parsedAmount.toString(),
      };
    } catch (error) {
      console.error("Error purchasing dataset:", error);
      return { success: false, error: error.message };
    }
  }

  // get the mock transaction history
  async getPaymentHistory(filters = {}) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.initializeProvider();
      }

      await this._delay(this.config.networkLatency.history);

      let transactions = [...this.mockTransactions];

      // Apply filters
      if (filters) {
        if (filters.tier) {
          transactions = transactions.filter((tx) => tx.tier === filters.tier);
        }
        if (filters.datasetId) {
          transactions = transactions.filter(
            (tx) => tx.datasetId === filters.datasetId
          );
        }
        if (filters.type) {
          transactions = transactions.filter((tx) => tx.type === filters.type);
        }
        if (filters.status) {
          transactions = transactions.filter(
            (tx) => tx.status === filters.status
          );
        }
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          transactions = transactions.filter((tx) => {
            const txDate = new Date(tx.timestamp);
            return (
              (!start || txDate >= new Date(start)) &&
              (!end || txDate <= new Date(end))
            );
          });
        }
      }

      return transactions;
    } catch (error) {
      console.error("Error getting payment history:", error);
      throw error;
    }
  }

  // get the mock pending transactions
  async getPendingTransactions() {
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    return [...this.pendingTransactions];
  }

  // Create a new pending transaction
  async createPendingTransaction(transactionData) {
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    const pendingTx = this._createTransaction({
      ...transactionData,
      status: "pending",
    });

    this.pendingTransactions.push(pendingTx);
    return pendingTx;
  }

  // Confirm a pending transaction
  async confirmPendingTransaction(transactionId) {
    const index = this.pendingTransactions.findIndex(
      (tx) => tx.paymentId === transactionId
    );

    if (index === -1) {
      return { success: false, error: "Pending transaction not found" };
    }

    const transaction = {
      ...this.pendingTransactions[index],
      status: "success",
    };
    this.mockTransactions.unshift(transaction);
    this.pendingTransactions.splice(index, 1);

    return { success: true, transaction };
  }

  // Private helper methods
  // get
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _generateTransactionHash() {
    return `0x${Array(64)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("")}`;
  }

  // Create a new transaction object
  _createTransaction(data) {
    return {
      paymentId:
        data.paymentId ||
        `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: data.type || "purchase",
      amount: data.amount || "0.00",
      transactionHash: this._generateTransactionHash(),
      blockNumber: 14000000 + Math.floor(Math.random() * 1000000),
      gasUsed: data.gasUsed || 21000,
      gasCost: data.gasCost || "0.000042",
      timestamp: new Date().toISOString(),
      status: data.status || "pending",
      ...data,
    };
  }

  // Initialize the mock provider
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

    // Generate 5-10 mock transactions
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
        transactionHash: this._generateTransactionHash(),
        blockNumber: 14000000 + Math.floor(Math.random() * 1000000),
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        gasCost: (
          this.config.defaultGasPrice *
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
