// Import via specific file with .js extension to avoid ES Module issues
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const fs = require("fs");
const path = require("path");

// Load dotenv safely for CommonJS in newer Node.js
require("dotenv").config();

// Network configurations
const networks = {
  // Development network for local testing
  development: {
    host: "127.0.0.1",
    port: 8545,
    network_id: "*",
  },
  
  // Sepolia testnet
  sepolia: {
    provider: () => {
      console.log("Creating Sepolia provider...");
      // Use Infura instead of Alchemy
      const rpcUrl = "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea";
      return new HDWalletProvider({
        privateKeys: [process.env.PRIVATE_KEY],
        providerOrUrl: rpcUrl,
        pollingInterval: 180000
      });
    },
    network_id: 11155111,  // Correct Sepolia network ID
    gas: 5500000,
    gasPrice: 20000000000,
    confirmations: 3,
    timeoutBlocks: 500,
    skipDryRun: true,
    networkCheckTimeout: 10000000
  }
};

// Compiler configuration
const compilers = {
  solc: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

// Export configuration
module.exports = {
  networks,
  compilers,
  contracts_directory: "./contracts",
  contracts_build_directory: "./client/src/contracts",
  migrations_directory: "./migrations"
};