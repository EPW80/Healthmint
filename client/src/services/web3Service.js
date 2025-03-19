// src/services/web3Service.js
import { ethers } from "ethers";
import  networkConfig  from "../config/networks.js";
import HealthDataMarketplace from "../contracts/HealthDataMarketplace.json";

/**
 * Error class for Web3 operations
 */
class Web3Error extends Error {
  constructor(message, code = "WEB3_ERROR", details = {}) {
    super(message);
    this.name = "Web3Error";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Centralized service for all blockchain interactions
 *
 * This service ensures consistent Web3 provider usage and
 * standardized error handling across the application.
 */
class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.network = null;
    this.initialized = false;

    // Configuration
    this.requiredNetwork = networkConfig.SEPOLIA;
    this.contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    this.contractABI = HealthDataMarketplace.abi;

    // Initialize retry parameters
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 1000; // 1 second base delay

    // Bind methods to ensure 'this' context
    this.initialize = this.initialize.bind(this);
    this.getContract = this.getContract.bind(this);
    this.executeTransaction = this.executeTransaction.bind(this);
  }

  /**
   * Initializes the Web3 provider and contract instance
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} Initialization success
   */
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
        // Handle user rejection - don't retry these
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

  /**
   * Gets the contract instance, initializing if necessary
   * @param {Object} options - Options for contract instantiation
   * @returns {Promise<ethers.Contract>} Contract instance
   */
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

  /**
   * Executes a blockchain transaction with standardized error handling and retries
   * @param {Function} txFunc - Transaction function to execute
   * @param {Object} options - Transaction options
   * @returns {Promise<any>} Transaction result
   */
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

  /**
   * Formats Web3 errors for consistent handling
   * @param {Error} error - Original error
   * @returns {Web3Error} Formatted error
   * @private
   */
  _formatError(error) {
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
      "BLOCKCHAIN_ERROR",
      { originalError: error }
    );
  }

  /**
   * Extracts user-friendly error message
   * @param {Error} error - Original error
   * @returns {string} User-friendly error message
   * @private
   */
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

  /**
   * Get current account
   * @returns {Promise<string|null>} Current account address
   */
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

  /**
   * Check if a specific network is supported
   * @param {number|string} chainId - Chain ID to check
   * @returns {boolean} Whether the network is supported
   */
  isNetworkSupported(chainId) {
    // Convert to hex if numeric
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }

    return Object.values(networkConfig).some(
      (network) => network.CHAIN_ID === chainId
    );
  }

  /**
   * Get network details by chain ID
   * @param {number|string} chainId - Chain ID
   * @returns {Object|null} Network details
   */
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

  /**
   * Switch to a specific network
   * @param {string} chainId - Target chain ID
   * @returns {Promise<boolean>} Success status
   */
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

  /**
   * Get health marketplace contract
   * @returns {Promise<ethers.Contract>} Contract instance
   */
  async getHealthMarketplaceContract() {
    return this.getContract({ useSigner: true });
  }

  /**
   * Listen for blockchain events
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @returns {Function} Unlisten function
   */
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
}

// Create singleton instance
const web3Service = new Web3Service();

// Export service and error class
export { web3Service, Web3Error };
export default web3Service;
