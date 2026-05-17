// server/scripts/deploy.js
import { execSync } from "child_process";
import fs from "fs";
import { ethers } from "ethers";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Check if the script is running in a Node.js environment
async function main() {
  try {
    // Validate required environment variables
    validateEnvironment();

    console.log("Starting deployment process...");
    console.log("Network: Sepolia");
    logInfuraKey();

    // Set up wallet and provider
    const wallet = setupWallet();
    console.log("Deploying from address:", wallet.address);

    // Clean and prepare build directory
    prepareBuildDirectory();

    // Compile and deploy contracts
    compileContracts();
    deployToSepolia();

    // Process deployment artifacts
    const { artifact, deployedAddress, networkId } =
      processDeploymentArtifacts();

    // Save deployment information
    saveDeploymentInfo(artifact, deployedAddress, networkId, wallet.address);

    // Update environment file with contract address
    updateEnvFile(deployedAddress);

    // Log deployment success details
    logDeploymentSuccess(deployedAddress, networkId, artifact, wallet);

    // Verify contract on Etherscan if API key is available
    verifyContract();
  } catch (error) {
    handleDeploymentError(error);
  }
}

// Validate required environment variables
function validateEnvironment() {
  if (!process.env.PRIVATE_KEY || !process.env.INFURA_API_KEY) {
    throw new Error("Please set PRIVATE_KEY and INFURA_API_KEY in .env file");
  }
}

// Log Infura API key (masked)
function logInfuraKey() {
  const apiKey = process.env.INFURA_API_KEY;
  console.log("Infura API Key:", `${apiKey.slice(0, 6)}...`);
}

// Set up wallet and provider
function setupWallet() {
  const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL
  );
  return new ethers.Wallet(privateKey, provider);
}

// Normalize private key format
function normalizePrivateKey(key) {
  return key.startsWith("0x") ? key : `0x${key}`;
}

// Prepare build directory
function prepareBuildDirectory() {
  console.log("\nCleaning previous build...");
  const buildDir = "./client/src/contracts";

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
}

// Compile contracts
function compileContracts() {
  console.log("\nCompiling contracts...");
  execSync("npx truffle compile", { stdio: "inherit" });
}

// Deploy contracts to Sepolia
function deployToSepolia() {
  console.log("\nDeploying to Sepolia...");
  execSync("npx truffle migrate --network sepolia --reset", {
    stdio: "inherit",
  });
}

// Process deployment artifacts
function processDeploymentArtifacts() {
  const artifactPath = "./client/src/contracts/HealthDataMarketplace.json";

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Compilation may have failed."
    );
  }

  // Use the artifactPath variable here instead of repeating the string
  const artifactContent = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactContent);

  const networkId = "11155111"; // Sepolia network ID

  if (!artifact.networks[networkId]) {
    throw new Error("Deployment failed - no network information found");
  }

  const deployedAddress = artifact.networks[networkId].address;
  return { artifact, deployedAddress, networkId };
}

// Save deployment information to a JSON file
function saveDeploymentInfo(
  artifact,
  deployedAddress,
  networkId,
  walletAddress
) {
  const deploymentInfo = {
    network: "sepolia",
    chainId: networkId,
    address: deployedAddress,
    timestamp: new Date().toISOString(),
    blockNumber: artifact.networks[networkId].blockNumber,
    deployer: walletAddress,
    contract: {
      name: "HealthDataMarketplace",
      version: "1.0.0",
      abi: artifact.abi,
    },
  };

  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
}

// Update .env file with the deployed contract address
function updateEnvFile(deployedAddress) {
  const envPath = "./.env";
  let envContent = fs.readFileSync(envPath, "utf8");

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

  if (envContent.includes("CONTRACT_HEALTH_DATA_MARKETPLACE=")) {
    // Replace existing variable
    envContent = envContent.replace(
      /CONTRACT_HEALTH_DATA_MARKETPLACE=.*/,
      `CONTRACT_HEALTH_DATA_MARKETPLACE=${deployedAddress}`
    );
  } else {
    // Add new variable
    envContent += `\n# Contract Configuration\nCONTRACT_HEALTH_DATA_MARKETPLACE=${deployedAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
}

// Log deployment success details
async function logDeploymentSuccess(
  deployedAddress,
  networkId,
  artifact,
  wallet
) {
  console.log("\nDeployment successful! 🎉");
  console.log("Contract address:", deployedAddress);
  console.log("Network ID:", networkId);
  console.log("Block number:", artifact.networks[networkId].blockNumber);
  console.log("Deployed by:", wallet.address);
  console.log("\nFiles updated:");
  console.log("- deployment-info.json");
  console.log("- .env (CONTRACT_ADDRESS updated)");

  // Verify balance after deployment
  const provider = wallet.provider;
  const balance = await provider.getBalance(wallet.address);
  console.log("\nRemaining balance:", ethers.utils.formatEther(balance), "ETH");
}

// Verify contract on Etherscan if API key is available
function verifyContract() {
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
}

// Handle deployment errors
function handleDeploymentError(error) {
  console.error("\n❌ Deployment failed:");
  console.error(error.message);
  if (error.stdout) console.error("Output:", error.stdout.toString());
  if (error.stderr) console.error("Error:", error.stderr.toString());
  process.exit(1);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
