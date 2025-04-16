const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("Starting direct deployment...");

  // Load compiled contract
  console.log("Loading contract artifact...");
  const contractPath = "./client/src/contracts/HealthDataMarketplace.json";

  if (!fs.existsSync(contractPath)) {
    console.error("Contract artifact not found! Run npx truffle compile first");
    process.exit(1);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath));

  // Connect to Infura
  console.log("Connecting to Infura Sepolia endpoint...");
  const provider = new ethers.providers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea",
    { name: "sepolia", chainId: 11155111 }
  );

  // Create wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`Deploying from address: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  if (balance.eq(0)) {
    console.error("Account has no balance. Please fund it before deploying.");
    process.exit(1);
  }

  // Deploy contract
  console.log("\nDeploying HealthDataMarketplace contract...");
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    wallet
  );

  try {
    const contract = await factory.deploy();
    console.log(
      `Deployment transaction hash: ${contract.deployTransaction.hash}`
    );
    console.log("Waiting for transaction confirmation...");

    await contract.deployed();

    console.log(`\n✅ Contract deployed successfully at: ${contract.address}`);

    // Update .env file
    let envContent = fs.readFileSync("./.env", "utf8");
    if (envContent.includes("CONTRACT_HEALTH_DATA_MARKETPLACE=")) {
      envContent = envContent.replace(
        /CONTRACT_HEALTH_DATA_MARKETPLACE=.*/,
        `CONTRACT_HEALTH_DATA_MARKETPLACE=${contract.address}`
      );
    } else {
      envContent += `\nCONTRACT_HEALTH_DATA_MARKETPLACE=${contract.address}\n`;
    }
    fs.writeFileSync("./.env", envContent);
    console.log("Updated .env file with contract address");

    // Update contractInfo.json
    const clientInfo = {
      marketplace: {
        address: contract.address,
        network: "sepolia",
        chainId: 11155111,
      },
      deploymentDate: new Date().toISOString(),
    };
    fs.writeFileSync(
      "./client/src/contractInfo.json",
      JSON.stringify(clientInfo, null, 2)
    );
    console.log("Updated client/src/contractInfo.json");

    console.log("\n----- CONTRACT ADDRESS FOR REFERENCE -----");
    console.log(`CONTRACT_HEALTH_DATA_MARKETPLACE=${contract.address}`);
    console.log("------------------------------------------");

    return contract.address;
  } catch (error) {
    console.error("Deployment failed:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error(
        "\nYou need more Sepolia ETH to deploy. Get some from a faucet:"
      );
      console.error("- https://sepoliafaucet.com/");
      console.error("- https://faucet.sepolia.dev/");
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\nDeployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
