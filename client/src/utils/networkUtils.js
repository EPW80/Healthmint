// client/src/utils/networkUtils.js
import { ethers } from "ethers";

const getNetworkProvider = () => {
  // Check if window.ethereum is available (MetaMask or other injected wallet)
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  // Fallback to default provider (Sepolia testnet)
  return ethers.getDefaultProvider("sepolia");
};

const getContract = (address, abi) => {
  const provider = getNetworkProvider();
  return new ethers.Contract(address, abi, provider);
};

const getSigner = () => {
  const provider = getNetworkProvider();
  return provider.getSigner();
};

const getContractWithSigner = (address, abi) => {
  const contract = getContract(address, abi);
  const signer = getSigner();
  return contract.connect(signer);
};

const formatAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const getExplorerUrl = (hash, type = "address", chainId = 11155111) => {
  // Default to Sepolia Testnet
  let baseUrl = "https://sepolia.etherscan.io";

  // Mainnet
  if (chainId === 1) {
    baseUrl = "https://etherscan.io";
  }

  return `${baseUrl}/${type}/${hash}`;
};

const getChainName = (chainId) => {
  const chains = {
    1: "Ethereum Mainnet",
    11155111: "Sepolia Testnet",
    5: "Goerli Testnet",
    1337: "Local Development Chain",
  };

  return chains[chainId] || `Unknown Chain (${chainId})`;
};

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

export default networkUtils;
