import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createError } from "../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load contract ABIs from filesystem
const loadContractAbi = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")).abi;
  } catch (error) {
    console.error(`Failed to load ABI from ${filePath}:`, error);
    return null;
  }
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contracts = {};
    this.networkConfig = null;
    this.contractAddresses = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load network configuration
      this.networkConfig = {
        MAINNET: {
          CHAIN_ID: 1,
          NETWORK_NAME: "Ethereum Mainnet",
          RPC_URL: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR-PROJECT-ID",
          BLOCK_EXPLORER: "https://etherscan.io",
          IS_TESTNET: false,
        },
        SEPOLIA: {
          CHAIN_ID: 11155111,
          NETWORK_NAME: "Sepolia Testnet",
          RPC_URL: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
          BLOCK_EXPLORER: "https://sepolia.etherscan.io",
          IS_TESTNET: true,
        },
        TRANSACTION_CONFIRMATIONS: 3,
        GAS_LIMIT: 3000000,
        GAS_PRICE_STRATEGY: "medium",
        MAX_GAS_PRICE: "100",
        CONTRACT_ADDRESSES: {},
      };
      
      console.log("✅ NETWORK_CONFIG:", this.networkConfig);
      
      // Initialize provider
      const network = process.env.BLOCKCHAIN_NETWORK || "SEPOLIA";
      const rpcUrl = this.networkConfig[network]?.RPC_URL;
      
      if (!rpcUrl) {
        throw new Error(`Invalid network configuration for ${network}`);
      }
      
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      console.log("✅ Provider successfully initialized:", rpcUrl);
      
      // IMPORTANT: Never log the private key!
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        console.warn("⚠️ No private key provided, transaction signing unavailable");
      }
      
      // Load contract addresses
      this.contractAddresses = {
        PATIENT_CONSENT: process.env.CONTRACT_PATIENT_CONSENT,
        HEALTH_DATA_REGISTRY: process.env.CONTRACT_HEALTH_DATA_REGISTRY,
        HEALTH_DATA_MARKETPLACE: process.env.CONTRACT_HEALTH_DATA_MARKETPLACE,
      };
      
      // Initialize contracts if addresses are available
      if (this.wallet && this.contractAddresses.PATIENT_CONSENT) {
        const consentAbi = loadContractAbi(
          path.resolve(__dirname, "../contracts/PatientConsent.json")
        );
        this.contracts.PatientConsent = new ethers.Contract(
          this.contractAddresses.PATIENT_CONSENT,
          consentAbi,
          this.wallet
        );
      }
      
      if (this.wallet && this.contractAddresses.HEALTH_DATA_REGISTRY) {
        const registryAbi = loadContractAbi(
          path.resolve(__dirname, "../contracts/HealthDataRegistry.json")
        );
        this.contracts.HealthDataRegistry = new ethers.Contract(
          this.contractAddresses.HEALTH_DATA_REGISTRY,
          registryAbi,
          this.wallet
        );
      }
      
      if (this.wallet && this.contractAddresses.HEALTH_DATA_MARKETPLACE) {
        const marketplaceAbi = loadContractAbi(
          path.resolve(__dirname, "../../client/src/contracts/HealthDataMarketplace.json")
        );
        this.contracts.HealthDataMarketplace = new ethers.Contract(
          this.contractAddresses.HEALTH_DATA_MARKETPLACE,
          marketplaceAbi,
          this.wallet
        );
      }
      
      if (Object.keys(this.contracts).length === 0) {
        console.log("ℹ️ No valid contract address provided, skipping contract initialization");
      }
      
      this.initialized = true;
      console.log("2025-04-28 01:07:47 info: BlockchainService initialized ");
    } catch (error) {
      console.error("❌ Failed to initialize blockchain service:", error);
      throw error;
    }
  }
  
  // New secure methods for blockchain operations
  async grantConsent(patientAddress, providerAddress, dataId, expiryTime) {
    if (!this.initialized || !this.wallet) {
      throw createError.serviceUnavailable("Blockchain service not initialized");
    }
    
    if (!this.contracts.PatientConsent) {
      throw createError.serviceUnavailable("Patient consent contract not initialized");
    }
    
    try {
      const tx = await this.contracts.PatientConsent.grantConsent(
        providerAddress, 
        dataId,
        expiryTime,
        { 
          gasLimit: this.networkConfig.GAS_LIMIT,
          from: patientAddress  // This acts as a check, not actual signing
        }
      );
      
      const receipt = await tx.wait(this.networkConfig.TRANSACTION_CONFIRMATIONS);
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        events: receipt.events
      };
    } catch (error) {
      console.error("Error granting consent:", error);
      throw createError.badRequest(`Failed to grant consent: ${error.message}`);
    }
  }
  
  async revokeConsent(patientAddress, providerAddress, dataId) {
    if (!this.initialized || !this.wallet) {
      throw createError.serviceUnavailable("Blockchain service not initialized");
    }
    
    try {
      const tx = await this.contracts.PatientConsent.revokeConsent(
        providerAddress,
        dataId,
        { 
          gasLimit: this.networkConfig.GAS_LIMIT,
          from: patientAddress  // For verification
        }
      );
      
      const receipt = await tx.wait(this.networkConfig.TRANSACTION_CONFIRMATIONS);
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error("Error revoking consent:", error);
      throw createError.badRequest(`Failed to revoke consent: ${error.message}`);
    }
  }
  
  async registerDataOnChain(patientAddress, dataHash, metadata, price) {
    if (!this.initialized || !this.wallet) {
      throw createError.serviceUnavailable("Blockchain service not initialized");
    }
    
    try {
      const priceWei = ethers.utils.parseEther(price.toString());
      
      const tx = await this.contracts.HealthDataRegistry.registerData(
        dataHash,
        JSON.stringify(metadata),
        priceWei,
        { 
          gasLimit: this.networkConfig.GAS_LIMIT,
          from: patientAddress  // For verification
        }
      );
      
      const receipt = await tx.wait(this.networkConfig.TRANSACTION_CONFIRMATIONS);
      return {
        transactionHash: receipt.transactionHash,
        dataId: receipt.events.find(e => e.event === "DataRegistered")?.args?.dataId,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error("Error registering data:", error);
      throw createError.badRequest(`Failed to register data: ${error.message}`);
    }
  }
  
  // Utility methods
  getNetworkInfo() {
    if (!this.initialized) {
      throw createError.serviceUnavailable("Blockchain service not initialized");
    }
    
    const network = process.env.BLOCKCHAIN_NETWORK || "SEPOLIA";
    return {
      network: this.networkConfig[network].NETWORK_NAME,
      chainId: this.networkConfig[network].CHAIN_ID,
      isTestnet: this.networkConfig[network].IS_TESTNET,
      blockExplorer: this.networkConfig[network].BLOCK_EXPLORER
    };
  }
  
  createDataHash(data) {
    return ethers.utils.id(JSON.stringify(data));
  }
}

const blockchainService = new BlockchainService();
export default blockchainService;
