// server/services/transactionService.js
import { ethers } from "ethers";
import { NETWORK_CONFIG } from "../constants/index.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Get directory path and load JSON file using ES Module compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractJsonPath = path.resolve(
  __dirname,
  "../../client/src/contracts/HealthDataMarketplace.json"
);
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath, "utf8"));

// Debug logs for troubleshooting
console.log("✅ Loaded ENV Variables:", JSON.stringify(process.env, null, 2));
console.log("✅ NETWORK_CONFIG:", JSON.stringify(NETWORK_CONFIG, null, 2));

const contractABI = contractJson.abi;

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
      // Ensure SEPOLIA RPC URL is retrieved correctly
      const rpcUrl =
        process.env.SEPOLIA_RPC_URL || NETWORK_CONFIG?.SEPOLIA?.RPC_URL;

      if (!rpcUrl) {
        throw new TransactionServiceError(
          "RPC URL is missing. Check your .env file or NETWORK_CONFIG.",
          "MISSING_RPC_URL"
        );
      }

      // Ethers.js v5 provider initialization
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      if (!this.provider) {
        throw new TransactionServiceError(
          "Failed to initialize JsonRpcProvider",
          "PROVIDER_INITIALIZATION_ERROR"
        );
      }

      console.log("✅ Provider successfully initialized:", rpcUrl);

      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        this.provider
      );

      this.setupEventListeners();
    } catch (error) {
      console.error("❌ Provider initialization error:", error.message);
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

  /**
   * Purchase data through the blockchain contract
   * @param {string} buyerAddress - Address of the buyer
   * @param {string} dataId - ID of the data being purchased
   * @param {string} purpose - Purpose of data purchase
   * @param {string} transactionHash - Optional transaction hash
   * @returns {Promise<Object>} Purchase transaction details
   */
  async purchaseData(buyerAddress, dataId, purpose) {
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
      console.error("Data purchase error:", error);
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
