require("dotenv").config({ path: "../../.env" }); // Adjust path based on your structure
import Web3 from "web3";
import HDWalletProvider from "@truffle/hdwallet-provider";

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
  .catch((err) => console.error("❌ Web3 Provider Test Failed:", err.message));
