// migrations/2_deploy_marketplace.js
const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");
const fs = require("fs");
const path = require("path");

module.exports = async function(deployer, network, accounts) {
  try {
    // Create directories if they don't exist
    const auditDir = path.join(__dirname, "../audit");
    const deploymentsDir = path.join(auditDir, "deployments");
    
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Log deployment initiation
    const deploymentStart = new Date();
    console.log(
      `\nInitiating HealthDataMarketplace deployment at ${deploymentStart.toISOString()}`
    );
    console.log(`Network: ${network}`);
    console.log(`Deployer address: ${accounts[0]}`);

    // Deploy contract
    console.log("\nDeploying HealthDataMarketplace contract...");
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
    
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${filename}`);

    // Update client contract info
    const clientInfoPath = path.join(__dirname, "../client/src/contractInfo.json");
    const clientInfo = {
      address: instance.address,
      network,
      deploymentDate: deploymentStart.toISOString(),
    };

    fs.writeFileSync(clientInfoPath, JSON.stringify(clientInfo, null, 2));
    console.log(`Contract info updated at: ${clientInfoPath}`);

    return deploymentInfo;
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    throw error;
  }
};