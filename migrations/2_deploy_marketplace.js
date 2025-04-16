// migrations/2_deploy_marketplace.js
import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to dynamically load contract artifacts
const getContractArtifact = async (contractName) => {
  const artifactPath = path.join(
    __dirname,
    `../build/contracts/${contractName}.json`
  );
  const artifactData = await fs.readFile(artifactPath, "utf8");
  return JSON.parse(artifactData);
};

// Migration function
export default async function (deployer, network, accounts) {
  try {
    // Create directories if they don't exist
    const auditDir = path.join(__dirname, "../audit");
    const deploymentsDir = path.join(auditDir, "deployments");

    try {
      await fs.mkdir(auditDir, { recursive: true });
      await fs.mkdir(deploymentsDir, { recursive: true });
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }

    // Log deployment initiation
    const deploymentStart = new Date();
    console.log(
      `\nInitiating Healthmint contracts deployment at ${deploymentStart.toISOString()}`
    );
    console.log(`Network: ${network}`);
    console.log(`Deployer address: ${accounts[0]}`);

    // Load contract artifacts
    console.log("\nLoading contract artifacts...");
    const marketplaceArtifact = await getContractArtifact(
      "HealthDataMarketplace"
    );

    const HealthDataMarketplace =
      deployer.truffle.Contract(marketplaceArtifact);

    // Deploy HealthDataMarketplace
    console.log("\nDeploying HealthDataMarketplace contract...");
    const marketplaceInstance = await deployer.deploy(HealthDataMarketplace);
    console.log(
      "HealthDataMarketplace deployed at:",
      marketplaceInstance.address
    );

    // Save deployment info
    const deploymentInfo = {
      network,
      contracts: {
        HealthDataMarketplace: {
          address: marketplaceInstance.address,
          transactionHash: marketplaceInstance.transactionHash,
        },
      },
      timestamp: deploymentStart.toISOString(),
      deployer: accounts[0],
      blockNumber: await web3.eth.getBlockNumber(),
      networkId: await web3.eth.net.getId(),
    };

    // Save to file
    const filename = path.join(
      deploymentsDir,
      `deploy_${network}_${deploymentStart.getTime()}.json`
    );

    await fs.writeFile(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${filename}`);

    // Update client contract info
    const clientInfoPath = path.join(
      __dirname,
      "../client/src/contractInfo.json"
    );
    const clientInfo = {
      marketplace: {
        address: marketplaceInstance.address,
        network,
      },
      deploymentDate: deploymentStart.toISOString(),
    };

    await fs.writeFile(clientInfoPath, JSON.stringify(clientInfo, null, 2));
    console.log(`\nContract info updated at: ${clientInfoPath}`);

    // Print environment variables format
    console.log("\n----- CONTRACT ADDRESSES FOR .ENV FILE -----");
    console.log(
      `CONTRACT_HEALTH_DATA_MARKETPLACE=${marketplaceInstance.address}`
    );
    console.log("-------------------------------------------\n");

    return deploymentInfo;
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    throw error;
  }
}
