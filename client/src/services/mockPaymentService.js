// src/services/mockPaymentService.js

/**
 * Mock Payment Service
 *
 * Simulates blockchain payment functionality without requiring actual blockchain interaction.
 * Designed with the same interface as the real paymentService for easy replacement later.
 */
export const mockPaymentService = {
  // Mock state
  isInitialized: false,
  mockWalletConnected: false,
  mockBalance: "1.5", // Mock ETH balance
  mockTransactions: [],
  mockPaymentProcessTime: 2000, // Simulated transaction time in ms
  mockFailureRate: 0.1, // 10% of transactions will randomly fail for testing

  // Mock dataset pricing
  mockDatasetPrices: {
    // Prepopulate with some example datasets
    "dataset-001": {
      price: "0.05",
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    "dataset-002": {
      price: "0.1",
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    "dataset-003": {
      price: "0.25",
      owner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    },
  },

  // Helper to generate mock transactions
  _generateMockTxHash() {
    return (
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")
    );
  },

  /**
   * Initialize the mock payment service
   * @returns {Promise<boolean>} Success state
   */
  async initializeProvider() {
    return new Promise((resolve) => {
      // Simulate connection delay
      setTimeout(() => {
        this.isInitialized = true;
        this.mockWalletConnected = true;
        console.log("Mock payment provider initialized");
        resolve(true);
      }, 800);
    });
  },

  /**
   * Prepare a dataset for selling (mock)
   * @param {string} datasetId Dataset identifier
   * @param {string} price Price in ETH
   * @param {boolean} isActive Whether the dataset is available
   * @returns {Promise<object>} Operation result
   */
  async prepareDatasetForSale(datasetId, price, isActive = true) {
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        // Add dataset to mock prices
        this.mockDatasetPrices[datasetId] = {
          price: price.toString(),
          owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Mock owner address
          active: isActive,
        };

        const txHash = this._generateMockTxHash();

        console.log(
          `Mock: Dataset ${datasetId} prepared for sale at ${price} ETH`
        );

        resolve({
          success: true,
          transactionHash: txHash,
        });
      }, 1000);
    });
  },

  /**
   * Purchase access to a dataset (mock)
   * @param {string} datasetId Dataset identifier
   * @param {number|string} priceInEth Price in ETH
   * @returns {Promise<object>} Transaction result
   */
  async purchaseDataset(datasetId, priceInEth) {
    if (!this.isInitialized) {
      await this.initializeProvider();
    }

    return new Promise((resolve) => {
      // Simulate blockchain transaction time
      setTimeout(() => {
        // Random failure for testing error handling
        const shouldFail = Math.random() < this.mockFailureRate;

        if (shouldFail) {
          console.log(`Mock: Transaction for ${datasetId} failed`);
          resolve({
            success: false,
            error:
              "Transaction failed. Insufficient funds or rejected by user.",
          });
          return;
        }

        // Generate mock transaction data
        const txHash = this._generateMockTxHash();
        const paymentId = this._generateMockTxHash();
        const timestamp = new Date();

        // Create a mock transaction record
        const txRecord = {
          transactionHash: txHash,
          paymentId: paymentId,
          datasetId: datasetId,
          amount: priceInEth.toString(),
          timestamp: timestamp,
          blockNumber: Math.floor(Math.random() * 10000000) + 1000000,
          gasUsed: Math.floor(Math.random() * 100000) + 50000,
        };

        // Add to mock transaction history
        this.mockTransactions.unshift(txRecord);

        // Reduce mock balance
        const currentBalance = parseFloat(this.mockBalance);
        this.mockBalance = Math.max(
          0,
          currentBalance - parseFloat(priceInEth)
        ).toFixed(4);

        console.log(
          `Mock: Transaction for ${datasetId} succeeded with hash ${txHash.substring(0, 10)}...`
        );

        resolve({
          success: true,
          transactionHash: txHash,
          paymentId: paymentId,
          blockNumber: txRecord.blockNumber,
          gasUsed: txRecord.gasUsed.toString(),
        });
      }, this.mockPaymentProcessTime);
    });
  },

  /**
   * Verify if a user has access to a dataset (mock)
   * @param {string} datasetId Dataset identifier
   * @returns {Promise<boolean>} Access status
   */
  async verifyAccess(datasetId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check if there's a transaction for this dataset
        const hasAccess = this.mockTransactions.some(
          (tx) => tx.datasetId === datasetId
        );
        console.log(`Mock: Verified access to ${datasetId}: ${hasAccess}`);
        resolve(hasAccess);
      }, 500);
    });
  },

  /**
   * Get payment history (mock)
   * @returns {Promise<Array>} Array of payment records
   */
  async getPaymentHistory() {
    return new Promise((resolve) => {
      // If no mock transactions exist, create some sample data
      if (this.mockTransactions.length === 0) {
        // Generate some sample transactions
        const sampleDatasetIds = Object.keys(this.mockDatasetPrices);

        // Generate 5 sample transactions from the past month
        for (let i = 0; i < 5; i++) {
          const randomDatasetId =
            sampleDatasetIds[
              Math.floor(Math.random() * sampleDatasetIds.length)
            ];
          const price = this.mockDatasetPrices[randomDatasetId]?.price || "0.1";

          // Create transaction with date in the past 30 days
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));

          this.mockTransactions.push({
            transactionHash: this._generateMockTxHash(),
            paymentId: this._generateMockTxHash(),
            datasetId: randomDatasetId,
            amount: price,
            timestamp: date,
            blockNumber: Math.floor(Math.random() * 10000000) + 1000000,
            gasUsed: Math.floor(Math.random() * 100000) + 50000,
          });
        }

        // Sort by date, newest first
        this.mockTransactions.sort((a, b) => b.timestamp - a.timestamp);
      }

      setTimeout(() => {
        console.log(
          `Mock: Retrieved ${this.mockTransactions.length} payment records`
        );
        resolve(this.mockTransactions);
      }, 800);
    });
  },

  /**
   * Get the mock ETH balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Mock: Current balance is ${this.mockBalance} ETH`);
        resolve(this.mockBalance);
      }, 300);
    });
  },

  /**
   * Reset mock state (for testing)
   */
  resetMockState() {
    this.isInitialized = false;
    this.mockWalletConnected = false;
    this.mockBalance = "1.5";
    this.mockTransactions = [];
  },
};

export default mockPaymentService;
