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
    provider: () =>
      new HDWalletProvider(
        process.env.PRIVATE_KEY,
        process.env.SEPOLIA_RPC_URL
      ),
    network_id: 11155111,
    gas: 8000000,
    gasPrice: 20000000000,
    timeoutBlocks: 200,
    skipDryRun: true,
  },
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
  migrations_directory: "./migrations",
  plugins: ["truffle-plugin-verify"],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
};
