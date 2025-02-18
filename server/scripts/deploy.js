const { execSync } = require("child_process");
const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  try {
    // Verify environment variables
    if (!process.env.PRIVATE_KEY || !process.env.INFURA_API_KEY) {
      throw new Error("Please set PRIVATE_KEY and INFURA_API_KEY in .env file");
    }

    console.log("Starting deployment process...");
    console.log("Network: Sepolia");
    console.log(
      "Infura API Key:",
      `${process.env.INFURA_API_KEY.slice(0, 6)}...`
    );

    // Verify private key format
    const privateKey = process.env.PRIVATE_KEY.startsWith("0x")
      ? process.env.PRIVATE_KEY
      : `0x${process.env.PRIVATE_KEY}`;

    // Create provider and wallet for address computation
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL
    );
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deploying from address:", wallet.address);

    // Clean previous builds
    console.log("\nCleaning previous build...");
    const buildDir = "./client/src/contracts";
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }

    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Compile contracts
    console.log("\nCompiling contracts...");
    execSync("npx truffle compile", { stdio: "inherit" });

    // Deploy to Sepolia
    console.log("\nDeploying to Sepolia...");
    execSync("npx truffle migrate --network sepolia --reset", {
      stdio: "inherit",
    });

    // Get deployment info
    const artifactPath = "./client/src/contracts/HealthDataMarketplace.json";
    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        "Contract artifact not found. Compilation may have failed."
      );
    }

    const artifact = require("../../client/src/contracts/HealthDataMarketplace.json");
    const networkId = "11155111"; // Sepolia network ID

    if (!artifact.networks[networkId]) {
      throw new Error("Deployment failed - no network information found");
    }

    const deployedAddress = artifact.networks[networkId].address;

    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: networkId,
      address: deployedAddress,
      timestamp: new Date().toISOString(),
      blockNumber: artifact.networks[networkId].blockNumber,
      deployer: wallet.address,
      contract: {
        name: "HealthDataMarketplace",
        version: "1.0.0",
        abi: artifact.abi,
      },
    };

    // Save deployment info to a file
    fs.writeFileSync(
      "./deployment-info.json",
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Update .env file with contract address
    const envPath = "./.env";
    let envContent = fs.readFileSync(envPath, "utf8");

    // Check if CONTRACT_ADDRESS already exists
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      // Replace existing CONTRACT_ADDRESS
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${deployedAddress}`
      );
    } else {
      // Add new CONTRACT_ADDRESS
      envContent += `\n# Contract Configuration\nCONTRACT_ADDRESS=${deployedAddress}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log("\nDeployment successful! 🎉");
    console.log("Contract address:", deployedAddress);
    console.log("Network ID:", networkId);
    console.log("Block number:", artifact.networks[networkId].blockNumber);
    console.log("Deployed by:", wallet.address);
    console.log("\nFiles updated:");
    console.log("- deployment-info.json");
    console.log("- .env (CONTRACT_ADDRESS updated)");

    // Verify balance after deployment
    const balance = await provider.getBalance(wallet.address);
    console.log(
      "\nRemaining balance:",
      ethers.utils.formatEther(balance),
      "ETH"
    );

    // Verify the contract if ETHERSCAN_API_KEY is available
    if (process.env.ETHERSCAN_API_KEY) {
      console.log("\nVerifying contract on Etherscan...");
      try {
        execSync(
          `npx truffle run verify HealthDataMarketplace --network sepolia`,
          { stdio: "inherit" }
        );
        console.log("Contract verified successfully! ✅");
      } catch (verifyError) {
        console.warn("Contract verification failed:", verifyError.message);
        console.log("You can try verifying manually on Etherscan");
      }
    }
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    if (error.stdout) console.error("Output:", error.stdout.toString());
    if (error.stderr) console.error("Error:", error.stderr.toString());
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
