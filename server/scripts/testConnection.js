// scripts/testConnection.js
import dotenv from 'dotenv';
import Web3 from 'web3';
import HDWalletProvider from '@truffle/hdwallet-provider';

dotenv.config();

async function testConnection() {
  console.log("Testing Sepolia connection...");

  try {
    // Test Infura connection
    console.log("\nTesting Infura connection:");
    const infuraUrl = process.env.SEPOLIA_RPC_URL;
    const provider = new HDWalletProvider({
      privateKeys: [process.env.PRIVATE_KEY.replace("0x", "")],
      providerOrUrl: infuraUrl,
      pollingInterval: 8000,
      networkCheckTimeout: 60000,
    });

    const web3 = new Web3(provider);

    // Get account balance
    const accounts = await web3.eth.getAccounts();
    const balance = await web3.eth.getBalance(accounts[0]);

    console.log("Account:", accounts[0]);
    console.log("Balance:", web3.utils.fromWei(balance, "ether"), "ETH");

    // Get network info
    const networkId = await web3.eth.net.getId();
    const blockNumber = await web3.eth.getBlockNumber();

    console.log("Network ID:", networkId);
    console.log("Latest block:", blockNumber);

    // Clean up
    provider.engine.stop();
    console.log("\n✅ Connection test successful!");
  } catch (error) {
    console.error("\n❌ Connection test failed:", error.message);
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
