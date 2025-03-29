// src/config/networkConfig.js
/**
 * Centralized Network Configuration
 *
 * This module provides a single source of truth for all network configurations
 * and network-related utility functions for the Healthmint platform.
 *
 * HIPAA Compliance Note: While this file doesn't directly handle PHI,
 * it is part of the security infrastructure ensuring proper blockchain
 * connection for secure health data transactions.
 */

// Default timeout and retry settings
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Environment configuration
export const ENV = {
  NODE_ENV: process.env.REACT_APP_ENV || "development",
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  IPFS_HOST: process.env.REACT_APP_IPFS_HOST || "ipfs.infura.io",
  IPFS_PORT: parseInt(process.env.REACT_APP_IPFS_PORT || "5001", 10),
  IPFS_PROTOCOL: process.env.REACT_APP_IPFS_PROTOCOL || "https",
  REQUEST_TIMEOUT: parseInt(
    process.env.REACT_APP_REQUEST_TIMEOUT || "30000",
    10
  ),
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS || "3", 10),
};

// Environment-specific configuration
export const ENV_CONFIG = {
  development: {
    requestSizeLimit: "50mb",
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: 100,
    sessionDuration: 24 * 60 * 60 * 1000,
    defaultPort: 5000,
    shutdownTimeout: 10000,
    enableLogging: true,
    enableCSP: false,
    cors: {
      origins: ["http://localhost:3000", "http://localhost:5000"],
      credentials: true,
    },
    rpcProvider: {
      timeout: 30000,
      retries: 3,
    },
  },
  production: {
    requestSizeLimit: "10mb",
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: 50,
    sessionDuration: 12 * 60 * 60 * 1000,
    defaultPort: 5000,
    shutdownTimeout: 10000,
    enableLogging: true,
    enableCSP: true,
    cors: {
      origins: [process.env.REACT_APP_FRONTEND_URL || "https://healthmint.app"],
      credentials: true,
    },
    rpcProvider: {
      timeout: 30000,
      retries: 3,
    },
  },
  test: {
    requestSizeLimit: "50mb",
    rateLimitWindow: 60 * 60 * 1000,
    rateLimitMax: 1000,
    sessionDuration: 24 * 60 * 60 * 1000,
    defaultPort: 5000,
    shutdownTimeout: 1000,
    enableLogging: false,
    enableCSP: false,
    cors: {
      origins: ["*"],
      credentials: true,
    },
    rpcProvider: {
      timeout: 5000,
      retries: 1,
    },
  },
};

// Network definitions
export const NETWORKS = {
  MAINNET: {
    NAME: "Ethereum Mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_URL:
      process.env.REACT_APP_MAINNET_RPC_URL ||
      "https://mainnet.infura.io/v3/" +
        (process.env.REACT_APP_INFURA_PROJECT_ID || ""),
    RPC_SUFFIX: "mainnet",
    GAS: {
      DEFAULT: 21000,
      ERC20_TRANSFER: 65000,
      CONTRACT_DEPLOYMENT: 1500000,
    },
  },
  SEPOLIA: {
    NAME: "Sepolia Testnet",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_URL:
      process.env.REACT_APP_SEPOLIA_RPC_URL ||
      "https://sepolia.infura.io/v3/" +
        (process.env.REACT_APP_INFURA_PROJECT_ID || ""),
    RPC_SUFFIX: "sepolia",
    GAS: {
      DEFAULT: 21000,
      ERC20_TRANSFER: 65000,
      CONTRACT_DEPLOYMENT: 1500000,
    },
  },
  LOCAL: {
    NAME: "Local Development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_URL: process.env.REACT_APP_LOCAL_RPC_URL || "http://localhost:8545",
    RPC_SUFFIX: "localhost",
    GAS: {
      DEFAULT: 21000,
      ERC20_TRANSFER: 65000,
      CONTRACT_DEPLOYMENT: 4000000,
    },
  },
};

// Request configuration
export const REQUEST_CONFIG = {
  timeout: ENV.REQUEST_TIMEOUT,
  retryAttempts: ENV.RETRY_ATTEMPTS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

/**
 * Custom error class for network-related errors
 */
export class NetworkError extends Error {
  constructor(message, code = "NETWORK_ERROR", details = {}) {
    super(message);
    this.name = "NetworkError";
    this.code = code;
    this.details = {
      ...details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Network utility functions
 */
export const networkUtils = {
  /**
   * Check if a specific network is supported by the application
   * @param {string|number} chainId - The chain ID to check
   * @returns {boolean} Whether the network is supported
   */
  isNetworkSupported: (chainId) => {
    // Convert to hex if numeric
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }

    return Object.values(NETWORKS).some(
      (network) => network.CHAIN_ID === chainId
    );
  },

  /**
   * Get network details by chain ID
   * @param {string|number} chainId - The chain ID
   * @returns {Object|null} The network details or null if not found
   */
  getNetworkByChainId: (chainId) => {
    // Convert to hex if numeric
    if (typeof chainId === "number") {
      chainId = `0x${chainId.toString(16)}`;
    }

    return (
      Object.values(NETWORKS).find((network) => network.CHAIN_ID === chainId) ||
      null
    );
  },

  /**
   * Get RPC URL for a network
   * @param {Object} network - The network object
   * @returns {string} The RPC URL
   */
  getRpcUrl: (network) => {
    const projectId = process.env.REACT_APP_INFURA_PROJECT_ID || "";
    if (projectId && network?.RPC_SUFFIX) {
      return `https://${network.RPC_SUFFIX}.infura.io/v3/${projectId}`;
    }
    return network?.NAME === "Local Development"
      ? "http://localhost:8545"
      : `https://rpc.${network?.RPC_SUFFIX || ""}.org`;
  },

  /**
   * Get explorer URL for a transaction or address
   * @param {Object} network - The network object
   * @param {string} hash - Transaction or address hash
   * @param {string} type - Type of hash (tx, address, token, etc.)
   * @returns {string} The explorer URL
   */
  getExplorerUrl: (network, hash, type = "tx") =>
    network?.EXPLORER_URL ? `${network.EXPLORER_URL}/${type}/${hash}` : "",

  /**
   * Get network name from chain ID
   * @param {string} chainId - The chain ID
   * @returns {string} The network name
   */
  getNetworkName: (chainId) => {
    if (!chainId) return "Unknown Network";

    const networks = {
      "0x1": "Ethereum Mainnet",
      "0xaa36a7": "Sepolia Testnet",
      "0x5": "Goerli Testnet",
      "0x13881": "Polygon Mumbai",
      "0x89": "Polygon Mainnet",
      "0x539": "Local Development",
    };

    return networks[chainId] || "Unknown Network";
  },
};

/**
 * MetaMask utility functions
 */

/**
 * Checks if MetaMask is installed
 * @returns {boolean} Whether MetaMask is installed
 */
export const isMetaMaskInstalled = () => {
  return (
    typeof window !== "undefined" && (window?.ethereum?.isMetaMask ?? false)
  );
};

/**
 * Checks if MetaMask is unlocked
 * @returns {Promise<boolean>} Whether MetaMask is unlocked
 */
export const isMetaMaskUnlocked = async () => {
  try {
    return (await window?.ethereum?._metamask?.isUnlocked()) ?? false;
  } catch (error) {
    console.warn("Could not check if MetaMask is unlocked:", error);
    return false;
  }
};

/**
 * Switch to a specific network
 * @param {string} networkName - Name of the network to switch to
 * @param {Object} options - Options for switching network
 * @returns {Promise<boolean>} Whether the switch was successful
 */
export const switchNetwork = async (
  networkName = NETWORKS.SEPOLIA.NAME,
  options = {}
) => {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  let timeoutId;

  try {
    if (!isMetaMaskInstalled()) {
      throw new NetworkError(
        "MetaMask is not installed",
        "METAMASK_NOT_FOUND",
        {
          browserInfo: navigator?.userAgent ?? "unknown",
        }
      );
    }

    const network = Object.values(NETWORKS).find((n) => n.NAME === networkName);
    if (!network) {
      throw new NetworkError(
        `Network ${networkName} not supported`,
        "UNSUPPORTED_NETWORK",
        { availableNetworks: Object.values(NETWORKS).map((n) => n.NAME) }
      );
    }

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new NetworkError("Network switch timeout", "SWITCH_TIMEOUT", {
            networkName,
            timeout,
          })
        );
      }, timeout);
    });

    const switchPromise = (async () => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: network.CHAIN_ID }],
          });

          const currentNetwork = await getCurrentNetwork();
          if (currentNetwork.chainId === network.CHAIN_ID) {
            return true;
          }
          throw new Error("Network switch verification failed");
        } catch (error) {
          if (error.code === 4902 || error.code === -32603) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: network.CHAIN_ID,
                  chainName: network.NAME,
                  nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: [networkUtils.getRpcUrl(network)],
                  blockExplorerUrls: [network.EXPLORER_URL],
                },
              ],
            });
            continue;
          }

          if (error.code === 4001) {
            throw new NetworkError(
              "User rejected network switch",
              "USER_REJECTED",
              { attempt }
            );
          }

          if (attempt === maxRetries) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt)
          );
        }
      }
    })();

    return await Promise.race([switchPromise, timeoutPromise]);
  } catch (error) {
    throw new NetworkError(
      error.message ?? "Failed to switch network",
      error.code ?? "SWITCH_FAILED",
      { originalError: error.message }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Get current network details
 * @returns {Promise<Object>} Current network information
 */
export const getCurrentNetwork = async () => {
  if (!isMetaMaskInstalled()) {
    throw new NetworkError("MetaMask is not installed", "METAMASK_NOT_FOUND");
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const network = networkUtils.getNetworkByChainId(chainId);

    return {
      chainId,
      networkId: network?.NETWORK_ID ?? null,
      name: network?.NAME ?? "Unknown Network",
      isSupported: Boolean(network),
      details: network
        ? {
            explorer: network.EXPLORER_URL,
            gas: network.GAS,
          }
        : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new NetworkError(
      "Failed to get network details",
      "NETWORK_DETECTION_FAILED",
      { originalError: error.message }
    );
  }
};

// Export individual utility functions for convenience
export const isNetworkSupported = networkUtils.isNetworkSupported;
export const getNetworkByChainId = networkUtils.getNetworkByChainId;
export const getNetworkName = networkUtils.getNetworkName;
export const getExplorerUrl = networkUtils.getExplorerUrl;
export const getRpcUrl = networkUtils.getRpcUrl;

// Default network for the application
export const requiredNetwork = NETWORKS.SEPOLIA;

// Create a config object for default export
const networkConfig = {
  ENV,
  ENV_CONFIG,
  NETWORKS,
  REQUEST_CONFIG,
  requiredNetwork,
  networkUtils,
  isMetaMaskInstalled,
  isMetaMaskUnlocked,
  switchNetwork,
  getCurrentNetwork,
};

// Export default configuration
export default networkConfig;
