require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: process.env.MNEMONIC,
          providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
          addressIndex: 0,
        }),
      network_id: 11155111, // Sepolia's network id
      gas: 5500000, // Gas limit used for deploys
      confirmations: 2, // # of confirmations to wait between deployments
      timeoutBlocks: 200, // # of blocks before a deployment times out
      skipDryRun: true, // Skip dry run before migrations
    },
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.19", // Fetch exact version from solc-bin
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
