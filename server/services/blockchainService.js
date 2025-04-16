// Verify the refresh token
import { ethers } from "ethers";
import transactionService from "./transactionService.js";
import { logger } from "../config/loggerConfig.js";
import { createError } from "../errors/index.js";
import fs from "fs";
import path from "path";

class BlockchainService {
  constructor() {
    this.transactionService = transactionService;
    logger.info("BlockchainService initialized");
  }

  // Get provider from the existing service
  getProvider() {
    if (!this.transactionService || !this.transactionService.provider) {
      // This is a fallback if transactionService isn't available
      const network = process.env.NETWORK_ID || "11155111"; // Default to Sepolia
      const rpcUrl = process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"; 
      return new ethers.providers.JsonRpcProvider(rpcUrl);
    }
    return this.transactionService.provider;
  }

  // Verify message signature (for wallet authentication)
  verifySignature(message, signature, address) {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error("Signature verification failed", { error: error.message });
      return false;
    }
  }

  // Generate a challenge message for user authentication
  generateChallengeMessage(address) {
    const timestamp = Date.now();
    return `Sign this message to authenticate with Healthmint: ${address.toLowerCase()} at ${timestamp}`;
  }

  // Access multiple contracts beyond the marketplace
  async getContract(contractName, contractAddress, abi) {
    try {
      return new ethers.Contract(contractAddress, abi, this.getProvider());
    } catch (error) {
      logger.error(`Failed to create contract instance for ${contractName}`, {
        error: error.message,
      });
      throw createError.api(
        "CONTRACT_CREATION_FAILED",
        `Failed to initialize contract: ${error.message}`
      );
    }
  }

  // Get a patient's consent records
  async getPatientConsents(patientAddress) {
    try {
      const marketplaceAddress = process.env.CONTRACT_HEALTH_DATA_MARKETPLACE;
      // Load ABI dynamically
      const abiPath = path.resolve(__dirname, "../../client/src/contracts/HealthDataMarketplace.json");
      const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;
      
      const contract = await this.getContract(
        "HealthDataMarketplace",
        marketplaceAddress,
        abi
      );
      
      // This assumes your contract has this method - adjust to match your actual contract
      return await contract.getPatientConsents(patientAddress);
    } catch (error) {
      logger.error("Failed to retrieve patient consents", {
        error: error.message,
      });
      throw createError.api(
        "CONSENT_RETRIEVAL_FAILED",
        `Failed to get patient consents: ${error.message}`
      );
    }
  }

  // Create a hash of medical data for on-chain reference
  createDataHash(data) {
    try {
      // Create a deterministic hash of the data
      return ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(data))
      );
    } catch (error) {
      logger.error("Failed to create data hash", { error: error.message });
      throw createError.api(
        "HASH_CREATION_FAILED",
        `Failed to create data hash: ${error.message}`
      );
    }
  }

  // Get network details
  async getNetworkInfo() {
    try {
      const network = await this.getProvider().getNetwork();
      return {
        name: network.name,
        chainId: network.chainId,
        ensAddress: network.ensAddress,
      };
    } catch (error) {
      logger.error("Failed to get network info", { error: error.message });
      throw createError.api(
        "NETWORK_INFO_FAILED",
        `Failed to get network information: ${error.message}`
      );
    }
  }
}

const blockchainService = new BlockchainService();
export default blockchainService;
