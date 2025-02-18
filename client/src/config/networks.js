// src/config/networks.js
import { NETWORKS, ENV, ENV_CONFIG } from "./networkConfig";

export class NetworkError extends Error {
  constructor(message, code = "NETWORK_ERROR", details = {}) {
    super(message);
    this.name = "NetworkError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

export const networkConfig = {
  requiredNetwork: NETWORKS.SEPOLIA,
  networks: NETWORKS,
  env: ENV,
  config: ENV_CONFIG[ENV.NODE_ENV || "development"],
};

// MetaMask utility functions
export const isMetaMaskInstalled = () => {
  return (
    typeof window !== "undefined" &&
    Boolean(window.ethereum) &&
    Boolean(window.ethereum.isMetaMask)
  );
};

export const isMetaMaskUnlocked = async () => {
  try {
    return await window.ethereum._metamask.isUnlocked();
  } catch (error) {
    console.warn("Could not check if MetaMask is unlocked:", error);
    return false;
  }
};

// Network switching with proper error handling
export const switchNetwork = async (
  networkName = networkConfig.requiredNetwork.NAME,
  options = {}
) => {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;
  let timeoutId;

  try {
    if (!isMetaMaskInstalled()) {
      throw new NetworkError(
        "MetaMask is not installed",
        "METAMASK_NOT_FOUND",
        {
          browserInfo: navigator.userAgent,
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

    timeoutId = setTimeout(() => {
      throw new NetworkError("Network switch timeout", "SWITCH_TIMEOUT", {
        networkName,
        timeout,
      });
    }, timeout);

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
  } catch (error) {
    throw new NetworkError(
      error.message || "Failed to switch network",
      error.code || "SWITCH_FAILED",
      { originalError: error.message }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const getCurrentNetwork = async () => {
  if (!isMetaMaskInstalled()) {
    throw new NetworkError("MetaMask is not installed", "METAMASK_NOT_FOUND");
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const network = networkUtils.getNetworkByChainId(chainId);

    return {
      chainId,
      networkId: network ? network.NETWORK_ID : null,
      name: network ? network.NAME : "Unknown Network",
      isSupported: Boolean(network),
      details: network
        ? {
            explorer: network.EXPLORER_URL,
            gas: network.GAS,
          }
        : null,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new NetworkError(
      "Failed to get network details",
      "NETWORK_DETECTION_FAILED",
      { originalError: error.message }
    );
  }
};

export const networkUtils = {
  isNetworkSupported: (chainId) =>
    Object.values(NETWORKS).some((network) => network.CHAIN_ID === chainId),

  getNetworkByChainId: (chainId) =>
    Object.values(NETWORKS).find((network) => network.CHAIN_ID === chainId) ||
    null,

  getRpcUrl: (network) => {
    const projectId = process.env.REACT_APP_INFURA_PROJECT_ID;
    if (projectId && network.RPC_SUFFIX) {
      return `https://${network.RPC_SUFFIX}.infura.io/v3/${projectId}`;
    }
    return network.NAME === "development"
      ? "http://localhost:8545"
      : `https://rpc.${network.RPC_SUFFIX}.org`;
  },

  getExplorerUrl: (network, hash, type = "tx") =>
    `${network.EXPLORER_URL}/${type}/${hash}`,
};

export const isNetworkSupported = networkUtils.isNetworkSupported;
export const getNetworkByChainId = networkUtils.getNetworkByChainId;
export const requiredNetwork = NETWORKS.SEPOLIA;


export default networkConfig;
