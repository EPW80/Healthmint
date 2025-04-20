import dotenv from "dotenv";
import Web3 from "web3";
import path from "path";
import { fileURLToPath } from "url";
import HDWalletProvider from "@truffle/hdwallet-provider";
import fs from "fs";

// Configure environment variables from the appropriate .env file
const envPath =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

if (fs.existsSync(envPath)) {
  console.log(`📁 Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log("📁 Loading environment from default .env file");
  dotenv.config();
}

// Set __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProviderManager {
  constructor() {
    // Check for private key or mnemonic (safer option for non-dev environments)
    this.privateKey = null;
    this.mnemonic = null;

    if (process.env.MNEMONIC) {
      this.mnemonic = process.env.MNEMONIC;
      console.log("🔐 Using mnemonic for provider initialization");
    } else if (process.env.PRIVATE_KEY) {
      const rawPrivateKey = process.env.PRIVATE_KEY ?? "";
      this.privateKey = rawPrivateKey?.startsWith("0x")
        ? rawPrivateKey.slice(2)
        : rawPrivateKey;
      console.log("🔑 Using private key for provider initialization");
    } else {
      throw new Error(
        "❌ Missing PRIVATE_KEY or MNEMONIC in environment variables"
      );
    }

    // Check for RPC URL
    if (!process.env.SEPOLIA_RPC_URL) {
      throw new Error("❌ Missing SEPOLIA_RPC_URL in environment variables");
    }

    this.providerOptions = {
      pollingInterval: 60000, // Reduce API calls to avoid rate limiting
      networkCheckTimeout: 1000000,
      timeoutBlocks: 500,
      addressIndex: 0,
      shareNonce: false,
      derivationPath: "m/44'/60'/0'/0/",
    };

    this.maxRetries = 3;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async testProvider(provider, name) {
    try {
      const web3 = new Web3(provider);
      const networkId = await web3.eth.net.getId();
      const accounts = await web3.eth.getAccounts();
      const balance = await web3.eth.getBalance(accounts[0]);

      console.log(`✅ ${name} provider connected successfully`);
      console.log(`Network ID: ${networkId}`);
      console.log(`Account: ${accounts[0]}`);
      console.log(`Balance: ${web3.utils.fromWei(balance, "ether")} ETH`);

      return true;
    } catch (error) {
      console.warn(`⚠️ ${name} provider test failed:`, error.message);
      return false;
    }
  }

  async tryProvider(name, getProviderFunc) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(
          `\n🔄 Trying ${name} provider (attempt ${attempt + 1}/${
            this.maxRetries
          })...`
        );

        const provider = getProviderFunc();
        if (!provider) return null;

        if (await this.testProvider(provider, name)) {
          return provider;
        }

        const delay = 30000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`⏳ Waiting ${delay / 1000} seconds before retry...`);
        await this.sleep(delay);
      } catch (error) {
        console.error(`❌ ${name} provider attempt failed:`, error.message);
        if (attempt < this.maxRetries - 1) {
          const delay = 30000 * Math.pow(2, attempt);
          console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
          await this.sleep(delay);
        }
      }
    }
    return null;
  }

  getProvider() {
    console.log("🔄 Initializing provider...");
    const rpcUrl = process.env.SEPOLIA_RPC_URL;

    try {
      let providerOptions;

      if (this.mnemonic) {
        providerOptions = {
          mnemonic: this.mnemonic,
          providerOrUrl: rpcUrl,
          addressIndex: 0,
          numberOfAddresses: 1,
          pollingInterval: 60000,
        };
      } else {
        providerOptions = {
          privateKeys: [this.privateKey],
          providerOrUrl: rpcUrl,
          pollingInterval: 60000,
        };
      }

      const provider = new HDWalletProvider(providerOptions);
      console.log(`✅ Provider initialized successfully for ${rpcUrl}!`);
      return provider;
    } catch (error) {
      console.error("❌ Provider initialization failed:", error.message);
      throw error;
    }
  }
}

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
    provider: () => new HDWalletProvider(
      process.env.PRIVATE_KEY,
      process.env.SEPOLIA_RPC_URL
    ),
    network_id: 11155111,
    gas: 5500000,
    confirmations: 2,
    timeoutBlocks: 200,
    skipDryRun: true,
  },

  // Mainnet configuration for production deployments
  mainnet: {
    provider: () => {
      // Ensure we're using the production environment
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "⚠️ Attempting to deploy to mainnet in non-production environment!"
        );
        // Uncomment to enforce production environment for mainnet
        // throw new Error("Mainnet deployment requires NODE_ENV=production");
      }
      return new ProviderManager().getProvider();
    },
    network_id: 1,
    gas: 6000000,
    gasPrice: null, // Use web3.eth.getGasPrice() at runtime
    confirmations: 3,
    timeoutBlocks: 200,
    skipDryRun: false, // Always do dry-run on mainnet
    networkCheckTimeout: 100000,
    verify: {
      apiUrl: "https://api.etherscan.io/",
      apiKey: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
};

const config = {
  // Conditionally include networks based on environment
  networks:
    process.env.NODE_ENV === "production"
      ? { mainnet: networks.mainnet, sepolia: networks.sepolia }
      : { development: networks.development, sepolia: networks.sepolia },

  contracts_directory: path.join(__dirname, "contracts"),
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  migrations_directory: path.join(__dirname, "migrations"),

  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "paris",
        outputSelection: {
          "*": {
            "": ["ast"],
            "*": [
              "abi",
              "evm.bytecode.object",
              "evm.bytecode.sourceMap",
              "evm.deployedBytecode.object",
              "evm.deployedBytecode.sourceMap",
              "evm.methodIdentifiers",
            ],
          },
        },
      },
    },
  },

  plugins: ["truffle-plugin-verify"],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY ?? "",
  },

  mocha: {
    timeout: 100000,
    reporter: "spec",
    useColors: true,
  },
};

export default config;
