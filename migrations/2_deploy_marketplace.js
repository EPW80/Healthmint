// migrations/2_deploy_marketplace.js
import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to dynamically load the contract artifact
const getContractArtifact = async () => {
  const artifactPath = path.join(
    __dirname,
    "../build/contracts/HealthDataMarketplace.json"
  );
  const artifactData = await fs.readFile(artifactPath, "utf8");
  return JSON.parse(artifactData);
};

// Migration function
export default async function (deployer, network, accounts) {
  try {
    // Create directories if they don’t exist
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
      `\nInitiating HealthDataMarketplace deployment at ${deploymentStart.toISOString()}`
    );
    console.log(`Network: ${network}`);
    console.log(`Deployer address: ${accounts[0]}`);

    // Load contract artifact
    console.log("\nLoading HealthDataMarketplace artifact...");
    const artifact = await getContractArtifact();
    const HealthDataMarketplace = deployer.truffle.Contract(artifact);

    // Deploy contract
    console.log("Deploying HealthDataMarketplace contract...");
    const instance = await deployer.deploy(HealthDataMarketplace);
    console.log("Contract deployed at:", instance.address);

    // Save deployment info
    const deploymentInfo = {
      network,
      address: instance.address,
      timestamp: deploymentStart.toISOString(),
      deployer: accounts[0],
      transactionHash: instance.transactionHash,
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
      address: instance.address,
      network,
      deploymentDate: deploymentStart.toISOString(),
    };

    await fs.writeFile(clientInfoPath, JSON.stringify(clientInfo, null, 2));
    console.log(`Contract info updated at: ${clientInfoPath}`);

    return deploymentInfo;
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    throw error;
  }
}
