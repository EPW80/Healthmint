const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");
const fs = require("fs");
const path = require("path");

module.exports = async function (deployer, network, accounts) {
  // Configuration for different networks
  const networkConfig = {
    development: {
      gas: 6000000,
      gasPrice: 0,
    },
    sepolia: {
      gas: 5500000,
      gasPrice: 20000000000, // 20 gwei
    },
    mainnet: {
      gas: 5000000,
      gasPrice: 50000000000, // 50 gwei
    },
  };

  try {
    // Create audit directory if it doesn't exist
    const auditDir = path.join(__dirname, "../audit/deployments");
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    // Log deployment initiation
    const deploymentStart = new Date();
    console.log(
      `\nInitiating HealthDataMarketplace deployment at ${deploymentStart.toISOString()}`
    );
    console.log(`Network: ${network}`);
    console.log(`Deployer address: ${accounts[0]}`);

    // Pre-deployment verification
    const config = networkConfig[network] || networkConfig.development;
    console.log("\nVerifying deployment prerequisites...");

    // Check gas price for production deployments
    if (network !== "development") {
      const currentGasPrice = await web3.eth.getGasPrice();
      console.log(
        `Current network gas price: ${web3.utils.fromWei(
          currentGasPrice,
          "gwei"
        )} gwei`
      );

      if (parseInt(currentGasPrice) > config.gasPrice * 1.5) {
        throw new Error("Gas price too high for deployment");
      }
    }

    // Check deployer balance
    const deployerBalance = await web3.eth.getBalance(accounts[0]);
    const minimumBalance = web3.utils.toWei("0.1", "ether");

    if (parseInt(deployerBalance) < parseInt(minimumBalance)) {
      throw new Error("Insufficient deployer balance");
    }

    // Deploy the marketplace contract
    console.log("\nDeploying HealthDataMarketplace contract...");
    const deployment = await deployer.deploy(HealthDataMarketplace, {
      from: accounts[0],
      gas: config.gas,
      gasPrice: config.gasPrice,
    });

    // Get contract instance
    const marketplaceInstance = await HealthDataMarketplace.deployed();

    // Verify deployment
    console.log("\nVerifying contract deployment...");
    const deployedCode = await web3.eth.getCode(marketplaceInstance.address);
    if (deployedCode.length <= 2) {
      throw new Error("Contract deployment verification failed");
    }

    // Initialize contract if needed
    console.log("\nInitializing contract...");
    await marketplaceInstance.initialize(
      process.env.ADMIN_ADDRESS || accounts[0],
      {
        from: accounts[0],
        gas: 200000,
      }
    );

    // Verify contract initialization
    const isInitialized = await marketplaceInstance.isInitialized();
    if (!isInitialized) {
      throw new Error("Contract initialization verification failed");
    }

    // Create deployment record
    const deploymentRecord = {
      timestamp: deploymentStart.toISOString(),
      network: network,
      contract: "HealthDataMarketplace",
      version: "1.0.0",
      address: marketplaceInstance.address,
      deployer: accounts[0],
      admin: process.env.ADMIN_ADDRESS || accounts[0],
      transactionHash: deployment.transactionHash,
      blockNumber: deployment.receipt.blockNumber,
      gasUsed: deployment.receipt.gasUsed,
      status: "success",
      configuration: {
        gas: config.gas,
        gasPrice: config.gasPrice,
      },
      verificationData: {
        codeSize: deployedCode.length,
        isInitialized: isInitialized,
      },
      hipaaCompliance: {
        auditEnabled: true,
        accessControlEnabled: true,
        encryptionRequired: true,
        consentRequired: true,
      },
    };

    // Save deployment record
    const filename = path.join(
      auditDir,
      `marketplace_${network}_${deploymentStart
        .toISOString()
        .replace(/[:.]/g, "-")}.json`
    );

    fs.writeFileSync(filename, JSON.stringify(deploymentRecord, null, 2));

    // Generate deployment info for frontend
    const deploymentInfo = {
      contractAddress: marketplaceInstance.address,
      network: network,
      deploymentDate: deploymentStart.toISOString(),
      version: "1.0.0",
    };

    const clientPath = path.join(__dirname, "../client/src/contract-info.json");
    fs.writeFileSync(clientPath, JSON.stringify(deploymentInfo, null, 2));

    // Log success
    console.log("\nHealthDataMarketplace deployed successfully!");
    console.log(`Contract address: ${marketplaceInstance.address}`);
    console.log(`Gas used: ${deployment.receipt.gasUsed}`);
    console.log(`Block number: ${deployment.receipt.blockNumber}`);
    console.log(`Deployment record saved to: ${filename}`);
    console.log(`Client info updated at: ${clientPath}`);

    return deploymentRecord;
  } catch (error) {
    // Log deployment failure
    const errorRecord = {
      timestamp: new Date().toISOString(),
      network: network,
      contract: "HealthDataMarketplace",
      error: error.message,
      stack: error.stack,
      status: "failed",
    };

    // Save error record
    const errorFilename = path.join(
      auditDir,
      `marketplace_error_${network}_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`
    );

    fs.writeFileSync(errorFilename, JSON.stringify(errorRecord, null, 2));

    console.error("\nMarketplace deployment failed!");
    console.error(`Error: ${error.message}`);
    console.error(`Error record saved to: ${errorFilename}`);

    // Re-throw error to halt migration
    throw error;
  }
};
