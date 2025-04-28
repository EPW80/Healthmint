// src/services/web3Service.js
import { ethers } from "ethers";
import { create } from "@web3-storage/w3up-client";
import networkConfig from "../config/networkConfig.js";
import HealthDataMarketplace from "../contracts/HealthDataMarketplace.json";
import hipaaComplianceService from "./hipaaComplianceService";
import CryptoJS from "crypto-js";

// Error handling for Web3-related issues
class Web3Error extends Error {
  constructor(message, code = "WEB3_ERROR", details = {}) {
    super(message);
    this.name = "Web3Error";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Initialize Web3 provider and contract
class Web3Service {
  constructor() {
    // Ethereum-related properties
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.network = null;
    this.initialized = false;

    // Web3.Storage-related properties
    this.w3upClient = null;
    this.storageInitialized = false;

    // Configuration
    this.requiredNetwork = networkConfig.SEPOLIA;
    this.contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    this.contractABI = HealthDataMarketplace.abi;
    this.ipfsGateway =
      process.env.REACT_APP_IPFS_GATEWAY || "https://dweb.link/ipfs/";

    // Initialize retry parameters
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000; // 1 second base delay

    // Bind methods to ensure 'this' context
    this.initialize = this.initialize.bind(this);
    this.getContract = this.getContract.bind(this);
    this.executeTransaction = this.executeTransaction.bind(this);
    this.initializeStorage = this.initializeStorage.bind(this);
    this.storeHealthData = this.storeHealthData.bind(this);
  }

  // Initialize the Web3 provider and contract
  async initialize(options = {}) {
    try {
      if (this.initialized && !options.force) {
        return true;
      }

      // Reset state
      this.provider = null;
      this.signer = null;
      this.contract = null;
      this.network = null;

      // Check for window.ethereum (MetaMask or other injected providers)
      if (!window.ethereum) {
        throw new Web3Error(
          "No Ethereum provider found. Please install MetaMask or another wallet.",
          "NO_PROVIDER"
        );
      }

      try {
        // Create provider
        this.provider = new ethers.providers.Web3Provider(window.ethereum);

        // Get the network
        this.network = await this.provider.getNetwork();

        // Verify network
        if (
          options.requireNetwork &&
          this.network.chainId !== parseInt(this.requiredNetwork.NETWORK_ID)
        ) {
          throw new Web3Error(
            `Wrong network. Please connect to ${this.requiredNetwork.NAME}.`,
            "WRONG_NETWORK",
            {
              current: this.network.name,
              required: this.requiredNetwork.NAME,
            }
          );
        }

        // Get signer (will prompt for connection if not already connected)
        if (options.requestAccounts) {
          await window.ethereum.request({ method: "eth_requestAccounts" });
        }

        this.signer = this.provider.getSigner();

        // Initialize contract if address is available
        if (this.contractAddress) {
          this.contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            options.useSigner ? this.signer : this.provider
          );
        }

        this.initialized = true;
        return true;
      } catch (error) {
        if (error.code === 4001) {
          // User rejected
          throw new Web3Error(
            "Connection request was rejected by the user.",
            "USER_REJECTED",
            { originalError: error }
          );
        }

        throw error;
      }
    } catch (error) {
      console.error("Web3 initialization error:", error);
      this.initialized = false;

      // Format error for consistent handling
      throw this._formatError(error);
    }
  }

  // Initialize Web3.Storage w3up client
  async initializeStorage(options = {}) {
    try {
      if (this.storageInitialized && !options.force) {
        console.log("Storage already initialized");
        return true;
      }

      console.log("Initializing Web3.Storage client...");

      // Create a new w3up client instance
      this.w3upClient = await create();

      // If a proof is provided directly in options, use it
      if (options.proof) {
        console.log("Adding provided proof to w3up client");
        await this.w3upClient.addProof(options.proof);
      }
      // If a delegation is provided, add it to the client
      else if (options.delegation) {
        console.log("Adding delegation to w3up client");
        await this.w3upClient.addSpace(options.delegation);
      }
      // If a principal is provided, authorize with it
      else if (options.principal) {
        console.log("Authorizing with principal");
        await this.w3upClient.authorize(options.principal);
      }
      // Try to load proof from file in public directory
      else {
        try {
          console.log("Loading proof.ucan from public directory");
          const proofResponse = await fetch("/proof.ucan");

          if (!proofResponse.ok) {
            throw new Error(
              `Failed to load proof.ucan: ${proofResponse.status}`
            );
          }

          // Get the proof as array buffer
          const proofData = await proofResponse.arrayBuffer();

          // Add proof to client
          await this.w3upClient.addProof(new Uint8Array(proofData));
          console.log("Successfully loaded and added proof from file");
        } catch (proofError) {
          console.error("Error loading proof file:", proofError);

          // Fall back to checking for token if proof loading fails
          const token = process.env.REACT_APP_WEB3_STORAGE_TOKEN;
          if (!token) {
            throw new Web3Error(
              "No authentication method available for Web3.Storage. Please provide a proof file or token.",
              "STORAGE_AUTH_MISSING"
            );
          }

          console.log("Attempting to authenticate with DID token");
          try {
            // For DID-based authentication
            await this.w3upClient.setCurrentSpace(token);
            console.log("Successfully authenticated with DID token");
          } catch (tokenError) {
            console.error("Failed to authenticate with token:", tokenError);
            throw new Web3Error(
              "All authentication methods for Web3.Storage failed. Check your token or proof file.",
              "STORAGE_AUTH_FAILED",
              { proofError, tokenError }
            );
          }
        }
      }

      this.storageInitialized = true;
      console.log("Web3.Storage client initialized successfully");
      return true;
    } catch (error) {
      console.error("Web3.Storage initialization error:", error);
      this.storageInitialized = false;
      throw this._formatError(error, "STORAGE_INIT_ERROR");
    }
  }

  // Store health data using Web3.Storage with HIPAA compliance
  async storeHealthData(healthData) {
    try {
      if (!this.storageInitialized) {
        console.log("Storage not initialized, attempting initialization...");
        await this.initializeStorage();
      }

      // Generate encryption key
      const encryptionKey = CryptoJS.lib.WordArray.random(32).toString();

      // Check for PHI (Protected Health Information)
      const containsPHI = Object.values(healthData).some((value) => {
        if (typeof value === "string") {
          return hipaaComplianceService.containsPHI(value);
        }
        return false;
      });

      if (containsPHI) {
        // Log access to PHI
        await hipaaComplianceService.createAuditLog("PHI_DETECTED", {
          operation: "IPFS_UPLOAD",
          dataType: "health_data",
          userInfo: hipaaComplianceService.getUserInfo(),
        });

        // Verify user has proper consent
        const hasConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING
        );

        if (!hasConsent) {
          throw new Web3Error(
            "User consent for data sharing is required for uploading PHI data",
            "CONSENT_REQUIRED"
          );
        }
      }

      console.log("Preparing health data for upload:", healthData);

      // Encrypt the data using real encryption (not mock)
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(healthData),
        encryptionKey
      ).toString();

      // Create a Blob from the encrypted data
      const blob = new Blob([encryptedData], {
        type: "application/encrypted+json",
      });

      // Create a File object which w3up-client expects
      const fileName = `health-data-${Date.now()}.enc`;
      const file = new File([blob], fileName, {
        type: "application/encrypted+json",
      });

      // Log the upload attempt (required for HIPAA)
      await hipaaComplianceService.createAuditLog("IPFS_UPLOAD_ATTEMPT", {
        fileName,
        dataType: "health_data",
        encrypted: true,
        userInfo: hipaaComplianceService.getUserInfo(),
      });

      console.log(
        "Uploading encrypted health data to IPFS via Web3.Storage..."
      );
      // Upload to Web3.Storage
      const cid = await this.w3upClient.upload([file]);
      console.log("Upload successful, CID:", cid);

      // Log the successful upload (required for HIPAA)
      await hipaaComplianceService.createAuditLog("IPFS_UPLOAD_SUCCESS", {
        cid: cid.toString(),
        fileName,
        dataType: "health_data",
        encrypted: true,
        userInfo: hipaaComplianceService.getUserInfo(),
      });

      // Return IPFS URL and encryption key
      return {
        cid: cid.toString(),
        ipfsUrl: `${this.ipfsGateway}${cid}`,
        encryptionKey, // The client should store this securely
      };
    } catch (error) {
      console.error("Error storing health data:", error);

      // Log the failure (required for HIPAA)
      await hipaaComplianceService.createAuditLog("IPFS_UPLOAD_FAILURE", {
        error: error.message,
        errorCode: error.code,
        dataType: "health_data",
        userInfo: hipaaComplianceService.getUserInfo(),
      });

      throw this._formatError(error, "STORAGE_UPLOAD_ERROR");
    }
  }

  async getContract(options = {}) {
    if (!this.initialized || !this.contract || options.force) {
      await this.initialize({
        ...options,
        requestAccounts: true, // Ensure we have accounts
        useSigner: true, // Use signer for transactions
      });
    }

    if (!this.contract) {
      throw new Web3Error(
        "Contract not initialized. Please check the contract address.",
        "CONTRACT_NOT_INITIALIZED"
      );
    }

    return this.contract;
  }

  async executeTransaction(txFunc, options = {}) {
    const {
      retries = this.MAX_RETRIES,
      onStatus = () => {},
      estimateGas = true,
      gasLimitMultiplier = 1.2, // Add 20% to estimated gas as buffer
    } = options;

    // Ensure we have an initialized contract
    await this.getContract({ useSigner: true });

    // Execute transaction with retries
    let attempt = 0;
    let lastError = null;

    while (attempt < retries) {
      try {
        // Update status to attempting
        onStatus({
          status: "preparing",
          attempt: attempt + 1,
          message:
            attempt > 0
              ? `Retrying transaction (Attempt ${attempt + 1}/${retries})`
              : "Preparing transaction",
        });

        // Execute the transaction function to get the transaction
        const tx = await txFunc(this.contract, this.signer);

        // If we need to estimate gas
        if (estimateGas && tx.estimateGas) {
          try {
            onStatus({
              status: "estimating",
              message: "Estimating gas...",
            });

            const estimatedGas = await tx.estimateGas();
            const gasLimit = Math.ceil(
              estimatedGas.toNumber() * gasLimitMultiplier
            );

            // Update transaction with gas limit
            tx.gasLimit = gasLimit;
          } catch (gasError) {
            console.warn("Gas estimation failed:", gasError);
            // Continue without gas estimation
          }
        }

        // Send the transaction
        onStatus({
          status: "waiting",
          message: "Waiting for confirmation...",
        });

        const txResponse = await tx;

        // Wait for the transaction to be mined
        onStatus({
          status: "mining",
          message: "Transaction submitted. Waiting for it to be mined...",
          hash: txResponse.hash,
        });

        const receipt = await txResponse.wait();

        // Transaction successful
        onStatus({
          status: "success",
          message: "Transaction successful!",
          receipt,
          hash: receipt.transactionHash,
        });

        return receipt;
      } catch (error) {
        console.error(
          `Transaction error (attempt ${attempt + 1}/${retries}):`,
          error
        );
        lastError = error;

        // Handle user rejection - don't retry these
        if (error.code === 4001) {
          // User rejected in MetaMask
          onStatus({
            status: "rejected",
            message: "Transaction was rejected by the user.",
          });
          throw this._formatError(error);
        }

        // Handle other transaction errors
        onStatus({
          status: "error",
          message: this._getErrorMessage(error),
          error,
        });

        // Backoff before retry
        if (attempt < retries - 1) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        attempt++;
      }
    }

    // If all retries fail, throw the last error
    throw this._formatError(lastError);
  }

  // Format error for consistent handling
  _formatError(error, defaultCode = "WEB3_ERROR") {
    // Already formatted
    if (error instanceof Web3Error) {
      return error;
    }

    // Format based on error type/code
    if (error.code === 4001) {
      return new Web3Error("Transaction rejected by user", "USER_REJECTED", {
        originalError: error,
      });
    } else if (error.code === -32603) {
      return new Web3Error(
        "Transaction failed. Please check gas settings and network status.",
        "TRANSACTION_FAILED",
        { originalError: error }
      );
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      return new Web3Error(
        "Insufficient funds to complete this transaction",
        "INSUFFICIENT_FUNDS",
        { originalError: error }
      );
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      return new Web3Error(
        "Transaction may fail. Please check your inputs.",
        "EXECUTION_ERROR",
        { originalError: error }
      );
    } else if (error.message?.includes("network changed")) {
      return new Web3Error(
        "Network changed during operation. Please try again.",
        "NETWORK_CHANGED",
        { originalError: error }
      );
    }

    // Default error format
    return new Web3Error(
      error.message || "An error occurred during blockchain interaction",
      defaultCode,
      { originalError: error }
    );
  }

  _getErrorMessage(error) {
    if (error instanceof Web3Error) {
      return error.message;
    }

    // Common user-friendly error messages
    if (error.code === 4001) {
      return "Transaction was rejected from your wallet.";
    } else if (error.code === -32603) {
      if (error.message?.includes("insufficient funds")) {
        return "You don't have enough ETH to complete this transaction.";
      } else if (error.message?.includes("gas required exceeds")) {
        return "Transaction failed: out of gas. Try increasing gas limit.";
      }
      return "Transaction failed. Please check gas settings and network status.";
    } else if (error.message?.includes("nonce")) {
      return "Transaction nonce error. Please reset your wallet or try again.";
    } else if (error.message?.includes("underpriced")) {
      return "Transaction underpriced. Please increase gas price.";
    }

    // Return original message or generic fallback
    return error.message || "An error occurred during blockchain interaction";
  }

  async getAccount() {
    try {
      if (!this.initialized) {
        await this.initialize({ requestAccounts: true });
      }

      if (!this.signer) {
        return null;
      }

      return await this.signer.getAddress();
    } catch (error) {
      console.error("Error getting account:", error);
      return null;
    }
  }

  isNetworkSupported(chainId) {
    // Convert to hex if numeric
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }

    return Object.values(networkConfig).some(
      (network) => network.CHAIN_ID === chainId
    );
  }

  getNetworkByChainId(chainId) {
    // Convert to hex if numeric
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }

    return (
      Object.values(networkConfig).find(
        (network) => network.CHAIN_ID === chainId
      ) || null
    );
  }

  // Switch network in MetaMask
  async switchNetwork(chainId) {
    try {
      if (!window.ethereum) {
        throw new Web3Error("No Ethereum provider found.");
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });

      // Wait for the network to actually change
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();

      return parseInt(chainId, 16) === network.chainId;
    } catch (error) {
      // Handle case where the chain hasn't been added to MetaMask
      if (error.code === 4902 || error.code === -32603) {
        const network = this.getNetworkByChainId(chainId);

        if (!network) {
          throw new Web3Error(
            "Network configuration not found",
            "INVALID_NETWORK"
          );
        }

        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId,
                chainName: network.NAME,
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [network.RPC_URL],
                blockExplorerUrls: [network.EXPLORER_URL],
              },
            ],
          });

          // Try switching again
          return await this.switchNetwork(chainId);
        } catch (addError) {
          throw this._formatError(addError);
        }
      }

      throw this._formatError(error);
    }
  }

  // Get contract instance
  async getHealthMarketplaceContract() {
    return this.getContract({ useSigner: true });
  }

  // Listen for events from the contract
  listenForEvents(eventName, callback) {
    if (!this.contract) {
      throw new Web3Error("Contract not initialized");
    }

    // Set up the event listener
    this.contract.on(eventName, (...args) => {
      // Last argument is the event object
      const event = args[args.length - 1];
      // Other arguments are the event parameters
      const params = args.slice(0, -1);

      callback(params, event);
    });

    // Return unlisten function
    return () => {
      this.contract.removeListener(eventName, callback);
    };
  }

  // Add this method to the Web3Service class
  async retrieveHealthData(cid, encryptionKey) {
    try {
      if (!encryptionKey) {
        throw new Web3Error(
          "Encryption key is required to retrieve encrypted health data",
          "MISSING_ENCRYPTION_KEY"
        );
      }

      // Log the retrieval attempt (required for HIPAA)
      await hipaaComplianceService.createAuditLog("IPFS_RETRIEVAL_ATTEMPT", {
        cid: cid.toString(),
        userInfo: hipaaComplianceService.getUserInfo(),
      });

      // Fetch the data from IPFS
      const url = `${this.ipfsGateway}${cid}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Web3Error(
          `Failed to retrieve data from IPFS: ${response.status}`,
          "IPFS_RETRIEVAL_ERROR"
        );
      }

      // Get encrypted data as text
      const encryptedData = await response.text();

      try {
        // Decrypt the data
        const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        // Log successful retrieval (required for HIPAA)
        await hipaaComplianceService.createAuditLog("IPFS_RETRIEVAL_SUCCESS", {
          cid: cid.toString(),
          dataType: "health_data",
          userInfo: hipaaComplianceService.getUserInfo(),
        });

        return decryptedData;
      } catch (decryptError) {
        console.error("Decryption error:", decryptError);

        // Log decryption failure
        await hipaaComplianceService.createAuditLog("DECRYPTION_FAILURE", {
          cid: cid.toString(),
          error: "Invalid encryption key or corrupted data",
          userInfo: hipaaComplianceService.getUserInfo(),
        });

        throw new Web3Error(
          "Failed to decrypt data: Invalid encryption key or corrupted data",
          "DECRYPTION_ERROR"
        );
      }
    } catch (error) {
      console.error("Error retrieving health data:", error);

      // Log the retrieval failure
      await hipaaComplianceService.createAuditLog("IPFS_RETRIEVAL_FAILURE", {
        cid: cid.toString(),
        error: error.message,
        errorCode: error.code,
        userInfo: hipaaComplianceService.getUserInfo(),
      });

      throw this._formatError(error, "DATA_RETRIEVAL_ERROR");
    }
  }
}

const web3Service = new Web3Service();

export { web3Service, Web3Error };
export default web3Service;
