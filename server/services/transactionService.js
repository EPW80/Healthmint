// server/services/transactionService.js
const ethers = require("ethers");
const HealthData = require("../models/HealthData");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const { AUDIT_TYPES, NETWORK_CONFIG } = require("../constants");
const contractABI =
  require("../../client/src/contracts/HealthDataMarketplace.json").abi;

class TransactionServiceError extends Error {
  constructor(message, code = "TRANSACTION_ERROR", details = {}) {
    super(message);
    this.name = "TransactionServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

class TransactionService {
  constructor() {
    this.initializeProvider();
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000; // 1 second
  }

  // Enhanced provider initialization
  initializeProvider() {
    try {
      const rpcUrl =
        process.env.SEPOLIA_RPC_URL || NETWORK_CONFIG.SEPOLIA.RPC_URL;

      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
        timeout: 10000,
        retry: {
          retries: 3,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 10000,
        },
      });

      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        this.provider
      );

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Provider initialization error:", error);
      throw new TransactionServiceError(
        "Failed to initialize provider",
        "INITIALIZATION_ERROR",
        { originalError: error.message }
      );
    }
  }

  // Validate transaction with enhanced checks
  async validateTransaction(txHash, options = {}) {
    const session = await HealthData.startSession();
    session.startTransaction();

    try {
      if (!ethers.utils.isHexString(txHash, 32)) {
        throw new TransactionServiceError(
          "Invalid transaction hash format",
          "INVALID_TX_HASH"
        );
      }

      // Retry mechanism for transaction retrieval
      const tx = await this.retryOperation(() =>
        this.provider.getTransaction(txHash)
      );

      if (!tx) {
        throw new TransactionServiceError(
          "Transaction not found",
          "TX_NOT_FOUND"
        );
      }

      // Wait for confirmations
      const receipt = await tx.wait(
        options.confirmations || NETWORK_CONFIG.DEFAULT_CONFIRMATIONS
      );

      // Enhanced validation
      await this.validateTransactionReceipt(receipt, options);

      // Add audit log
      await hipaaCompliance.createAuditLog(AUDIT_TYPES.TX_VALIDATION, {
        transactionHash: txHash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
        validator: options.userId || "system",
      });

      await session.commitTransaction();

      return {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        events: receipt.events,
        timestamp: new Date(),
        confirmations: await receipt.confirmations(),
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction validation error:", {
        error,
        txHash,
        timestamp: new Date(),
      });
      throw new TransactionServiceError(
        "Failed to validate transaction",
        "VALIDATION_FAILED",
        { originalError: error.message }
      );
    } finally {
      session.endSession();
    }
  }

  // Record transaction with enhanced security
  async recordTransaction(data, options = {}) {
    const session = await HealthData.startSession();
    session.startTransaction();

    try {
      const { txHash, seller, buyer, price, dataId } = data;

      // Validate input data
      this.validateTransactionData(data);

      // Validate the blockchain transaction
      const validationResult = await this.validateTransaction(txHash, {
        confirmations: options.confirmations,
        userId: options.userId,
      });

      if (!validationResult.status) {
        throw new TransactionServiceError(
          "Transaction failed on blockchain",
          "TX_FAILED"
        );
      }

      // Get health data with session
      const healthData = await HealthData.findById(dataId).session(session);
      if (!healthData) {
        throw new TransactionServiceError(
          "Health data not found",
          "DATA_NOT_FOUND"
        );
      }

      // Verify transaction hasn't been recorded
      if (await healthData.hasTransaction(txHash)) {
        throw new TransactionServiceError(
          "Transaction already recorded",
          "DUPLICATE_TX"
        );
      }

      // Update health data record
      healthData.transactions.push({
        buyer: buyer.toLowerCase(),
        seller: seller.toLowerCase(),
        price,
        transactionHash: txHash,
        timestamp: new Date(),
        metadata: {
          blockNumber: validationResult.blockNumber,
          gasUsed: validationResult.gasUsed,
          network: options.network || "sepolia",
        },
      });

      // Update statistics
      healthData.statistics.purchaseCount += 1;
      healthData.statistics.totalRevenue =
        (healthData.statistics.totalRevenue || 0) + parseFloat(price);

      // Add audit log
      await healthData.addAuditLog(
        AUDIT_TYPES.TX_RECORD,
        options.userId || "system",
        {
          transactionHash: txHash,
          buyer: buyer.toLowerCase(),
          price,
          timestamp: new Date(),
        }
      );

      await healthData.save({ session });
      await session.commitTransaction();

      return {
        success: true,
        transactionDetails: validationResult,
        healthData: await hipaaCompliance.sanitizeResponse(healthData),
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction recording error:", {
        error,
        data,
        timestamp: new Date(),
      });
      throw new TransactionServiceError(
        "Failed to record transaction",
        "RECORD_FAILED",
        { originalError: error.message }
      );
    } finally {
      session.endSession();
    }
  }

  // Get transaction history with enhanced features
  async getTransactionHistory(address, options = {}) {
    try {
      // Validate address
      if (!ethers.utils.isAddress(address)) {
        throw new TransactionServiceError(
          "Invalid address format",
          "INVALID_ADDRESS"
        );
      }

      // Create event filter
      const filter = this.contract.filters.DataPurchased(
        null,
        address.toLowerCase(),
        null
      );

      // Get events with retry
      const events = await this.retryOperation(() =>
        this.contract.queryFilter(filter, options.fromBlock, options.toBlock)
      );

      // Process events with enhanced details
      const eventDetails = await Promise.all(
        events.map(async (event) => {
          const block = await this.retryOperation(() => event.getBlock());

          return {
            dataId: event.args.id.toString(),
            buyer: event.args.buyer.toLowerCase(),
            seller: event.args.seller.toLowerCase(),
            price: ethers.utils.formatEther(event.args.price),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(block.timestamp * 1000),
            metadata: {
              network: options.network || "sepolia",
              eventName: event.event,
              logIndex: event.logIndex,
            },
          };
        })
      );

      // Add audit log
      await hipaaCompliance.createAuditLog(AUDIT_TYPES.TX_HISTORY, {
        address: address.toLowerCase(),
        eventCount: eventDetails.length,
        timestamp: new Date(),
        requestedBy: options.userId || "system",
      });

      return eventDetails;
    } catch (error) {
      console.error("Transaction history error:", {
        error,
        address,
        timestamp: new Date(),
      });
      throw new TransactionServiceError(
        "Failed to get transaction history",
        "HISTORY_FAILED",
        { originalError: error.message }
      );
    }
  }

  // Estimate gas with enhanced accuracy
  async estimateGas(functionName, args = [], options = {}) {
    try {
      // Validate function name
      if (!this.contract.interface.getFunction(functionName)) {
        throw new TransactionServiceError(
          "Invalid function name",
          "INVALID_FUNCTION"
        );
      }

      // Get gas estimate with buffer
      const gasEstimate = await this.retryOperation(() =>
        this.contract.estimateGas[functionName](...args)
      );

      // Add safety buffer
      const bufferedEstimate = gasEstimate.mul(120).div(100); // 20% buffer

      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();

      // Calculate costs
      const gasCost = bufferedEstimate.mul(gasPrice);
      const gasCostEth = ethers.utils.formatEther(gasCost);

      return {
        gasEstimate: bufferedEstimate.toString(),
        gasPrice: gasPrice.toString(),
        totalCost: gasCostEth,
        network: options.network || "sepolia",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Gas estimation error:", {
        error,
        functionName,
        args,
        timestamp: new Date(),
      });
      throw new TransactionServiceError(
        "Failed to estimate gas",
        "GAS_ESTIMATION_FAILED",
        { originalError: error.message }
      );
    }
  }

  // Utility methods
  async retryOperation(operation, maxRetries = this.MAX_RETRIES) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY * attempt)
          );
        }
      }
    }
    throw lastError;
  }

  async validateTransactionReceipt(receipt, options) {
    // Implement additional receipt validation
    if (!receipt.status) {
      throw new TransactionServiceError("Transaction reverted", "TX_REVERTED");
    }

    const minConfirmations =
      options.confirmations || NETWORK_CONFIG.DEFAULT_CONFIRMATIONS;

    if (receipt.confirmations < minConfirmations) {
      throw new TransactionServiceError(
        "Insufficient confirmations",
        "INSUFFICIENT_CONFIRMATIONS"
      );
    }

    return true;
  }

  validateTransactionData(data) {
    const requiredFields = ["txHash", "seller", "buyer", "price", "dataId"];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      throw new TransactionServiceError(
        "Missing required fields",
        "INVALID_DATA",
        { missingFields }
      );
    }

    // Validate address formats
    if (
      !ethers.utils.isAddress(data.buyer) ||
      !ethers.utils.isAddress(data.seller)
    ) {
      throw new TransactionServiceError(
        "Invalid address format",
        "INVALID_ADDRESS"
      );
    }

    return true;
  }

  setupEventListeners() {
    this.provider.on("block", (blockNumber) => {
      console.log("New block:", blockNumber);
    });

    this.contract.on("DataPurchased", (id, buyer, seller, price, event) => {
      console.log("Data purchased:", {
        id: id.toString(),
        buyer,
        seller,
        price: ethers.utils.formatEther(price),
        transactionHash: event.transactionHash,
      });
    });
  }
}

module.exports = new TransactionService();
