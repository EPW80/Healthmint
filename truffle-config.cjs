// Load dotenv safely for CommonJS in newer Node.js
require("dotenv").config();

// `truffle test` runs from the repo root and only needs the in-process
// ganache + solc — no provider deps. @truffle/hdwallet-provider is required
// lazily so the (root) test path doesn't need it installed; it's only pulled
// when actually deploying to Sepolia.
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
      const HDWalletProvider = require("@truffle/hdwallet-provider");
      return new HDWalletProvider(
        process.env.PRIVATE_KEY,
        process.env.SEPOLIA_RPC_URL
      );
    },
    network_id: 11155111,
    gas: 8000000,
    gasPrice: 20000000000,
    timeoutBlocks: 200,
    skipDryRun: true,
  },
};

// truffle-plugin-verify is only needed for `truffle run verify`. Include it
// only if resolvable so `truffle test` works without it installed at root.
let plugins = [];
try {
  require.resolve("truffle-plugin-verify");
  plugins = ["truffle-plugin-verify"];
} catch (_e) {
  // not installed in this context — fine for compile/test
}

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
  plugins,
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
};
