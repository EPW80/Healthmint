// src/config/network.js
import { ethers } from "ethers";

/**
 * Network configuration errors with enhanced details
 */
class NetworkError extends Error {
  constructor(message, code = "NETWORK_ERROR", details = {}) {
    super(message);
    this.name = "NetworkError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Network definitions and configuration
 */
const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_SUFFIX: "mainnet",
    GAS: {
      PRICE: 50000000000, // 50 gwei
      LIMIT: {
        DEPLOYMENT: 5000000,
        METHOD: 200000,
      },
    },
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_SUFFIX: "sepolia",
    GAS: {
      PRICE: 20000000000, // 20 gwei
      LIMIT: {
        DEPLOYMENT: 5500000,
        METHOD: 300000,
      },
    },
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_SUFFIX: "localhost",
    GAS: {
      PRICE: 0,
      LIMIT: {
        DEPLOYMENT: 6000000,
        METHOD: 500000,
      },
    },
  },
};

/**
 * Creates network configuration with complete details
 */
const createNetworkConfig = (network) => ({
  name: network.NAME,
  chainId: network.CHAIN_ID,
  networkId: network.NETWORK_ID,
  rpcUrls: getRpcUrls(network),
  blockExplorerUrls: [network.EXPLORER_URL],
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  gas: network.GAS,
});

/**
 * Get RPC URLs with fallbacks
 */
const getRpcUrls = (network) => {
  const urls = [];
  const projectId = process.env.REACT_APP_INFURA_PROJECT_ID;

  // Primary Infura URL
  if (projectId) {
    urls.push(`https://${network.RPC_SUFFIX}.infura.io/v3/${projectId}`);
  }

  // Add fallback URLs based on network
  switch (network.NAME) {
    case NETWORKS.SEPOLIA.NAME:
      urls.push(
        "https://rpc.sepolia.org",
        "https://eth-sepolia.g.alchemy.com/v2/demo"
      );
      break;
    case NETWORKS.MAINNET.NAME:
      urls.push(
        "https://eth-mainnet.public.blastapi.io",
        "https://cloudflare-eth.com"
      );
      break;
    default:
      urls.push("http://localhost:8545");
  }

  return urls.filter(Boolean);
};

/**
 * Network configuration for the application
 */
export const networkConfig = {
  requiredNetwork: createNetworkConfig(NETWORKS.SEPOLIA),
  networks: Object.values(NETWORKS).reduce(
    (acc, network) => ({
      ...acc,
      [network.CHAIN_ID]: createNetworkConfig(network),
    }),
    {}
  ),
};

/**
 * Truffle-specific network configurations
 */
export const truffleNetworks = {
  development: {
    host: "127.0.0.1",
    port: 8545,
    network_id: NETWORKS.LOCAL.NETWORK_ID,
    websockets: true,
    gasPrice: NETWORKS.LOCAL.GAS.PRICE,
  },
  sepolia: {
    network_id: NETWORKS.SEPOLIA.NETWORK_ID,
    gas: NETWORKS.SEPOLIA.GAS.LIMIT.DEPLOYMENT,
    gasPrice: NETWORKS.SEPOLIA.GAS.PRICE,
  },
  mainnet: {
    network_id: NETWORKS.MAINNET.NETWORK_ID,
    gas: NETWORKS.MAINNET.GAS.LIMIT.DEPLOYMENT,
    gasPrice: NETWORKS.MAINNET.GAS.PRICE,
  },
};

/**
 * Checks if MetaMask is installed and properly initialized
 */
export const isMetaMaskInstalled = () => {
  return (
    typeof window !== "undefined" &&
    Boolean(window.ethereum) &&
    Boolean(window.ethereum.isMetaMask)
  );
};

/**
 * Checks if MetaMask is unlocked
 */
export const isMetaMaskUnlocked = async () => {
  try {
    return await window.ethereum._metamask.isUnlocked();
  } catch (error) {
    console.warn("Could not check if MetaMask is unlocked:", error);
    return false;
  }
};

/**
 * Enhanced network switching with retry mechanism
 */
export const switchNetwork = async (
  networkName = NETWORKS.SEPOLIA.NAME,
  options = {}
) => {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;

  if (!isMetaMaskInstalled()) {
    throw new NetworkError("MetaMask is not installed", "METAMASK_NOT_FOUND", {
      browserInfo: navigator.userAgent,
    });
  }

  const network = Object.values(NETWORKS).find((n) => n.NAME === networkName);
  if (!network) {
    throw new NetworkError(
      `Network ${networkName} not supported`,
      "UNSUPPORTED_NETWORK",
      { availableNetworks: Object.values(NETWORKS).map((n) => n.NAME) }
    );
  }

  const timer = setTimeout(() => {
    throw new NetworkError("Network switch timeout", "SWITCH_TIMEOUT", {
      networkName,
      timeout,
    });
  }, timeout);

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: network.CHAIN_ID }],
        });

        const currentNetwork = await getCurrentNetwork();
        if (currentNetwork.chainId !== network.CHAIN_ID) {
          throw new Error("Network switch verification failed");
        }

        return true;
      } catch (switchError) {
        if (switchError.code === 4902 || switchError.code === -32603) {
          const networkConfig = getNetworkByChainId(network.CHAIN_ID);
          if (!networkConfig) {
            throw new NetworkError(
              "Network configuration not found",
              "CONFIG_NOT_FOUND",
              { chainId: network.CHAIN_ID }
            );
          }

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.CHAIN_ID,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.nativeCurrency,
                rpcUrls: networkConfig.rpcUrls,
                blockExplorerUrls: networkConfig.blockExplorerUrls,
              },
            ],
          });

          const currentNetwork = await getCurrentNetwork();
          if (currentNetwork.chainId !== network.CHAIN_ID) {
            throw new Error("Network addition verification failed");
          }

          return true;
        }

        if (switchError.code === 4001) {
          throw new NetworkError(
            "User rejected network switch",
            "USER_REJECTED",
            { attempt }
          );
        }

        if (attempt === maxRetries) throw switchError;
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    }
  } catch (error) {
    console.error("Network handling error:", {
      error,
      networkName,
      chainId: network.CHAIN_ID,
      timestamp: new Date(),
    });

    throw new NetworkError(
      error.message || "Failed to switch network",
      error.code || "SWITCH_FAILED",
      {
        networkName,
        chainId: network.CHAIN_ID,
        attempts: maxRetries,
        originalError: error.message,
      }
    );
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Gets current network details with enhanced information
 */
export const getCurrentNetwork = async (options = {}) => {
  if (!isMetaMaskInstalled()) {
    throw new NetworkError("MetaMask is not installed", "METAMASK_NOT_FOUND", {
      browserInfo: navigator.userAgent,
    });
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const network = getNetworkByChainId(chainId);

    const networkInfo = {
      chainId,
      networkId: network ? convertNetworkId.fromHex(chainId) : null,
      name: network?.name || "Unknown Network",
      isSupported: Boolean(network),
      details: network
        ? {
            rpcUrls: network.rpcUrls,
            blockExplorerUrls: network.blockExplorerUrls,
            nativeCurrency: network.nativeCurrency,
          }
        : null,
      timestamp: new Date(),
    };

    if (options.verifyConnection) {
      networkInfo.isConnected = await checkConnection(networkInfo);
    }

    return networkInfo;
  } catch (error) {
    console.error("Error getting network details:", {
      error,
      timestamp: new Date(),
    });

    throw new NetworkError(
      "Failed to get network details",
      "NETWORK_DETECTION_FAILED",
      { originalError: error.message }
    );
  }
};

/**
 * Utility functions for network operations
 */
export const networkUtils = {
  isNetworkSupported: (chainId) => {
    return Object.keys(networkConfig.networks).includes(chainId);
  },

  getNetworkByChainId: (chainId) => {
    return networkConfig.networks[chainId] || null;
  },

  convertNetworkId: {
    toHex: (networkId) => `0x${networkId.toString(16)}`,
    fromHex: (chainId) => parseInt(chainId, 16),
  },

  getExplorerUrl: (network, hash, type = "tx") => {
    return `${network.EXPLORER_URL}/${type}/${hash}`;
  },
};

/**
 * Utility to check network connection
 * @private
 */
async function checkConnection(networkInfo) {
  try {
    const provider = window.ethereum;
    const blockNumber = await provider.request({
      method: "eth_blockNumber",
    });
    return Boolean(blockNumber);
  } catch (error) {
    console.warn("Connection check failed:", error);
    return false;
  }
}

// Export convenience functions
export const convertNetworkId = networkUtils.convertNetworkId;
export const getNetworkByChainId = networkUtils.getNetworkByChainId;
export const isNetworkSupported = networkUtils.isNetworkSupported;
export { NETWORKS };
