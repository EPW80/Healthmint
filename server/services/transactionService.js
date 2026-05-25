// server/services/transactionService.js
import { ethers } from "ethers";
import { NETWORK_CONFIG } from "../constants/index.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../config/loggerConfig.js";

// Load environment variables
dotenv.config();

// Get directory path and load JSON file using ES Module compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractJsonPath = path.resolve(
  __dirname,
  "../../client/src/contracts/HealthDataMarketplace.json"
);
let contractABI = null;
try {
  const contractJson = JSON.parse(fs.readFileSync(contractJsonPath, "utf8"));
  contractABI = contractJson.abi;
} catch {
  logger.warn(
    "HealthDataMarketplace.json not found — run `truffle compile` to generate it. " +
      "Blockchain transaction features will be unavailable until the contract is compiled."
  );
}

// Debug logs for troubleshooting
logger.debug("Loaded ENV Variables:", JSON.stringify(process.env, null, 2));
logger.debug("NETWORK_CONFIG:", JSON.stringify(NETWORK_CONFIG, null, 2));

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
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000; // 1 second
    this.initializeProvider();
  }

  // Initialize provider and contract
  initializeProvider() {
    try {
      const rpcUrl = process.env.SEPOLIA_RPC_URL;
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      logger.info("Provider successfully initialized:", rpcUrl);

      // Only try to initialize contract if address is available
      const contractAddress = process.env.CONTRACT_HEALTH_DATA_MARKETPLACE;

      if (
        !contractAddress ||
        contractAddress === "0x0000000000000000000000000000000000000000"
      ) {
        logger.info(
          "No valid contract address provided, skipping contract initialization"
        );
        // Set a flag that contract is not initialized
        this.contractInitialized = false;
        return true;
      }

      this.contract = new ethers.Contract(
        contractAddress,
        contractABI, // Pass the ABI, not the contract itself
        this.provider
      );

      this.contractInitialized = true;
      logger.info("Contract initialized at address:", contractAddress);
      return true;
    } catch (error) {
      logger.error("Provider initialization error:", error.message);
      throw new TransactionServiceError(
        "Failed to initialize provider",
        "INITIALIZATION_ERROR",
        { originalError: error.message }
      );
    }
  }

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

  setupEventListeners() {
    this.provider.on("block", (blockNumber) => {
      logger.info("New block:", blockNumber);
    });

    this.contract.on("DataPurchased", (id, buyer, seller, price, event) => {
      logger.info("Data purchased:", {
        id: id.toString(),
        buyer,
        seller,
        price: ethers.utils.formatEther(price),
        transactionHash: event.transactionHash,
      });
    });
  }

  // Method to purchase data
  async purchaseData(buyerAddress, dataId, purpose) {
    if (!this.contractInitialized) {
      logger.warn("Contract not initialized. Method unavailable.");
      throw new TransactionServiceError(
        "Contract not initialized",
        "CONTRACT_NOT_INITIALIZED"
      );
    }

    try {
      // Validate inputs
      if (!buyerAddress || !dataId || !purpose) {
        throw new TransactionServiceError(
          "Missing required parameters for data purchase",
          "INVALID_PURCHASE_PARAMS"
        );
      }

      // Get the signer (you might need to provide a wallet or signer)
      const signer = this.provider.getSigner(buyerAddress);

      // Create contract instance with signer for transactions
      const contractWithSigner = this.contract.connect(signer);

      // Call contract method to purchase data
      const transaction = await contractWithSigner.purchaseData(
        dataId,
        purpose,
        { gasLimit: 300000 } // Adjust gas limit as needed
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? "success" : "failed",
      };
    } catch (error) {
      logger.error("Data purchase error:", error);
      throw new TransactionServiceError(
        "Failed to purchase data",
        "PURCHASE_FAILED",
        { originalError: error.message }
      );
    }
  }
}

const transactionService = new TransactionService();
export default transactionService;
