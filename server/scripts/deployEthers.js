// server/scripts/deployEthers.js
//
// Deploys HealthDataMarketplace to Sepolia using ethers.js directly, instead of
// `truffle migrate`. Truffle's bundled provider-engine block tracker is
// incompatible with the @truffle/hdwallet-provider stack under Node 18 (it
// fails with "PollingBlockTracker - encountered an error ... undefined"), even
// though the same RPC + key work fine through ethers. This script deploys the
// already-compiled artifact, then writes the same bookkeeping deploy.js does:
//   - injects networks[chainId] into client/src/contracts/HealthDataMarketplace.json
//   - writes deployment-info.json
//   - updates CONTRACT_ADDRESS / CONTRACT_HEALTH_DATA_MARKETPLACE in server/.env
//
// Prereqs: contract already compiled (npx truffle compile --config truffle-config.cjs)
// and PRIVATE_KEY + SEPOLIA_RPC_URL set in server/.env.

import fs from "fs";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { logger } from "../config/loggerConfig.js";

dotenv.config({ path: "./server/.env" });

const ARTIFACT_PATH = "./client/src/contracts/HealthDataMarketplace.json";
const ENV_PATH = "./server/.env";
const CHAIN_ID = "11155111"; // Sepolia

function normalizePrivateKey(key) {
  return key.startsWith("0x") ? key : `0x${key}`;
}

function validateEnvironment() {
  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    throw new Error("Please set PRIVATE_KEY and SEPOLIA_RPC_URL in server/.env");
  }
}

function loadArtifact() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    throw new Error(
      `Artifact not found at ${ARTIFACT_PATH}. Run "npx truffle compile --config truffle-config.cjs" first.`
    );
  }
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
  if (!artifact.bytecode || artifact.bytecode.length <= 2) {
    throw new Error("Artifact has no bytecode — compilation may have failed.");
  }
  return artifact;
}

function writeArtifactNetwork(artifact, address, txHash) {
  artifact.networks = artifact.networks || {};
  artifact.networks[CHAIN_ID] = {
    events: {},
    links: {},
    address,
    transactionHash: txHash,
  };
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2));
}

function saveDeploymentInfo(artifact, address, deployer, txHash, blockNumber) {
  const deploymentInfo = {
    network: "sepolia",
    chainId: CHAIN_ID,
    address,
    transactionHash: txHash,
    blockNumber,
    timestamp: new Date().toISOString(),
    deployer,
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

function upsertEnvVar(content, key, value) {
  const re = new RegExp(`^${key}=.*`, "m");
  if (re.test(content)) {
    return content.replace(re, `${key}=${value}`);
  }
  return `${content.replace(/\n*$/, "")}\n${key}=${value}\n`;
}

function updateEnvFile(address) {
  let content = fs.readFileSync(ENV_PATH, "utf8");
  content = upsertEnvVar(content, "CONTRACT_ADDRESS", address);
  content = upsertEnvVar(content, "CONTRACT_HEALTH_DATA_MARKETPLACE", address);
  fs.writeFileSync(ENV_PATH, content);
}

async function main() {
  validateEnvironment();
  logger.info("Starting ethers deployment to Sepolia...");

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL
  );
  const wallet = new ethers.Wallet(
    normalizePrivateKey(process.env.PRIVATE_KEY),
    provider
  );
  logger.info(`Deploying from: ${wallet.address}`);

  const startBal = await provider.getBalance(wallet.address);
  logger.info(`Balance before: ${ethers.utils.formatEther(startBal)} ETH`);

  const artifact = loadArtifact();
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  logger.info("Sending deployment transaction...");
  const contract = await factory.deploy();
  logger.info(`Tx hash: ${contract.deployTransaction.hash}`);
  logger.info("Waiting for confirmation...");
  const receipt = await contract.deployTransaction.wait();

  const address = contract.address;
  logger.info("✅ Deployment successful!");
  logger.info(`Contract address: ${address}`);
  logger.info(`Block number: ${receipt.blockNumber}`);

  writeArtifactNetwork(artifact, address, contract.deployTransaction.hash);
  saveDeploymentInfo(
    artifact,
    address,
    wallet.address,
    contract.deployTransaction.hash,
    receipt.blockNumber
  );
  updateEnvFile(address);
  logger.info(
    "Updated: client artifact networks, deployment-info.json, server/.env"
  );

  const endBal = await provider.getBalance(wallet.address);
  logger.info(`Balance after: ${ethers.utils.formatEther(endBal)} ETH`);

  // Print the address plainly for capture by tooling.
  console.log(`DEPLOYED_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Deployment failed:", error.message || error);
    if (error.stack) logger.error(error.stack);
    process.exit(1);
  });
