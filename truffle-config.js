require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

const PRIVATE_KEY = process.env.PRIVATE_KEY?.startsWith("0x")
  ? process.env.PRIVATE_KEY.slice(2)
  : process.env.PRIVATE_KEY;

// Validate environment variables before creating provider
if (!PRIVATE_KEY || !process.env.INFURA_API_KEY) {
  console.error("\nMissing environment variables:");
  if (!PRIVATE_KEY) console.error("- PRIVATE_KEY");
  if (!process.env.INFURA_API_KEY) console.error("- INFURA_API_KEY");
  console.error("\nPlease check your .env file.\n");
  process.exit(1);
}

const sepoliaProvider = () => {
  try {
    return new HDWalletProvider({
      privateKeys: [PRIVATE_KEY],
      providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      pollingInterval: 15000,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
    });
  } catch (error) {
    console.error("Error creating provider:", error);
    throw error;
  }
};

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    sepolia: {
      provider: sepoliaProvider,
      network_id: 11155111,
      gas: 5500000,
      gasPrice: 20000000000, // 20 gwei
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      websockets: true,
    },
  },

  contracts_directory: "./contracts",
  contracts_build_directory: "./client/src/contracts",
  migrations_directory: "./migrations",

  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "paris",
      },
    },
  },

  mocha: {
    timeout: 100000,
  },
};
