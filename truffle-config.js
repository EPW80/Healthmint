import dotenv from "dotenv";
import Web3 from "web3";
import path from "path";
import { fileURLToPath } from "url";
import HDWalletProvider from "@truffle/hdwallet-provider";

// Configure environment variables
dotenv.config();

// Load ABI (Application Binary Interface) for the ERC20 token contract
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Provider Manager with retries and rate-limiting
class ProviderManager {
  constructor() {
    const rawPrivateKey = process.env.PRIVATE_KEY ?? "";
    this.privateKey = rawPrivateKey?.startsWith("0x")
      ? rawPrivateKey.slice(2)
      : rawPrivateKey;

    if (!this.privateKey) {
      throw new Error("❌ Missing PRIVATE_KEY in environment variables");
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

    try {
      const provider = new HDWalletProvider({
        privateKeys: [this.privateKey],
        providerOrUrl: process.env.SEPOLIA_RPC_URL ?? "",
        pollingInterval: 60000, // Reduce polling frequency
      });

      console.log("✅ Provider initialized successfully!");
      return provider;
    } catch (error) {
      console.error("❌ Provider initialization failed:", error.message);
      throw error;
    }
  }
}

const providerManager = new ProviderManager();

const config = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },

    sepolia: {
      provider: () => providerManager.getProvider(),
      network_id: 11155111,
      gas: 5500000,
      gasPrice: 20000000000, // 20 gwei
      confirmations: 2,
      timeoutBlocks: 500,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
      websockets: false,
      verify: {
        apiUrl: "https://api-sepolia.etherscan.io/",
        apiKey: process.env.ETHERSCAN_API_KEY ?? "",
      },
    },
  },

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
  },
};

export default config;
