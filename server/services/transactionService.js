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
      const rpcUrl =
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea";
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      console.log("✅ Provider successfully initialized:", rpcUrl);

      // Only try to initialize contract if address is available
      const contractAddress = process.env.CONTRACT_HEALTH_DATA_MARKETPLACE;

      if (
        !contractAddress ||
        contractAddress === "0x0000000000000000000000000000000000000000"
      ) {
        console.log(
          "ℹ️ No valid contract address provided, skipping contract initialization"
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
      console.log("✅ Contract initialized at address:", contractAddress);
      return true;
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

  // Method to purchase data
  async purchaseData(buyerAddress, dataId, purpose) {
    if (!this.contractInitialized) {
      console.warn("Contract not initialized. Method unavailable.");
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
