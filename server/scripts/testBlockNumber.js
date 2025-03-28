// server/scripts/testBlockNumber.js
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import Web3 from "web3";
import HDWalletProvider from "@truffle/hdwallet-provider";

// Get current file directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with proper path resolution
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Debugging: Print loaded values
console.log("🔄 Using RPC URL:", process.env.SEPOLIA_RPC_URL);
console.log(
  "🔄 Using Private Key:",
  process.env.PRIVATE_KEY ? "Loaded" : "Missing!"
);

if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
  throw new Error("❌ SEPOLIA_RPC_URL or PRIVATE_KEY is missing from .env!");
}

const provider = new HDWalletProvider({
  privateKeys: [process.env.PRIVATE_KEY],
  providerOrUrl: process.env.SEPOLIA_RPC_URL,
});

const web3 = new Web3(provider);

web3.eth
  .getBlockNumber()
  .then((blockNumber) => console.log("✅ Latest Block:", blockNumber))
  .catch((err) => console.error("❌ Web3 Provider Test Failed:", err.message))
  .finally(() => {
    // Clean up provider to allow process to exit properly
    provider.engine.stop();
  });
