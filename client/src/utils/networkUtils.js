// client/src/utils/networkUtils.js
import { ethers } from "ethers";

/**
 * Get an Ethereum network provider based on current environment
 * @returns {ethers.providers.Provider} Network provider instance
 */
const getNetworkProvider = () => {
  // Check if window.ethereum is available (MetaMask or other injected wallet)
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  // Fallback to a default provider (Infura, Alchemy, etc.)
  // Replace with your preferred provider URL or API key
  return ethers.getDefaultProvider("sepolia");
};

/**
 * Get a contract instance from ABI and address
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @returns {ethers.Contract} Contract instance
 */
const getContract = (address, abi) => {
  const provider = getNetworkProvider();
  return new ethers.Contract(address, abi, provider);
};

/**
 * Get a signer for sending transactions
 * @returns {ethers.Signer} Signer instance
 */
const getSigner = () => {
  const provider = getNetworkProvider();
  return provider.getSigner();
};

/**
 * Get a contract instance with signer for sending transactions
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @returns {ethers.Contract} Contract instance with signer
 */
const getContractWithSigner = (address, abi) => {
  const contract = getContract(address, abi);
  const signer = getSigner();
  return contract.connect(signer);
};

/**
 * Format an address for display (shortens it)
 * @param {string} address - Ethereum address
 * @returns {string} Formatted address
 */
const formatAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Get etherscan URL for an address or transaction
 * @param {string} hash - Address or transaction hash
 * @param {string} type - Type of URL ('address' or 'tx')
 * @param {number} chainId - Chain ID
 * @returns {string} Etherscan URL
 */
const getExplorerUrl = (hash, type = "address", chainId = 11155111) => {
  // Default to Sepolia Testnet
  let baseUrl = "https://sepolia.etherscan.io";

  // Mainnet
  if (chainId === 1) {
    baseUrl = "https://etherscan.io";
  }

  return `${baseUrl}/${type}/${hash}`;
};

/**
 * Get chain name from chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} Chain name
 */
const getChainName = (chainId) => {
  const chains = {
    1: "Ethereum Mainnet",
    11155111: "Sepolia Testnet",
    5: "Goerli Testnet",
    1337: "Local Development Chain",
  };

  return chains[chainId] || `Unknown Chain (${chainId})`;
};

/**
 * Check if a chain is supported by the application
 * @param {number} chainId - Chain ID
 * @returns {boolean} Whether chain is supported
 */
const isChainSupported = (chainId) => {
  // For now, only support Sepolia testnet and local development
  return [11155111, 1337, 1].includes(chainId);
};

// Named exports
export {
  getNetworkProvider,
  getContract,
  getSigner,
  getContractWithSigner,
  formatAddress,
  getExplorerUrl,
  getChainName,
  isChainSupported,
};

// Create the object to export as default
const networkUtils = {
  getNetworkProvider,
  getContract,
  getSigner,
  getContractWithSigner,
  formatAddress,
  getExplorerUrl,
  getChainName,
  isChainSupported,
};

// Default export - ensure this is a separate statement
export default networkUtils;
