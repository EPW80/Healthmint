const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

async function main() {
    try {
        // Verify environment variables
        if (!process.env.PRIVATE_KEY || !process.env.INFURA_PROJECT_ID) {
            throw new Error('Please set PRIVATE_KEY and INFURA_PROJECT_ID in .env file');
        }

        // Clean previous builds
        console.log('Cleaning previous build...');
        const buildDir = './client/src/contracts';
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }

        // Compile contracts
        console.log('\nCompiling contracts...');
        execSync('npx truffle compile', { stdio: 'inherit' });

        // Deploy to Sepolia
        console.log('\nDeploying to Sepolia...');
        execSync('npx truffle migrate --network sepolia', { stdio: 'inherit' });

        // Get deployment info
        const artifact = require('../client/src/contracts/HealthDataMarketplace.json');
        const networkId = '11155111'; // Sepolia network ID
        
        if (!artifact.networks[networkId]) {
            throw new Error('Deployment failed - no network information found');
        }

        const deployedAddress = artifact.networks[networkId].address;

        // Save deployment info
        const deploymentInfo = {
            network: 'sepolia',
            address: deployedAddress,
            timestamp: new Date().toISOString(),
            blockNumber: artifact.networks[networkId].blockNumber
        };

        fs.writeFileSync(
            './deployment-info.json',
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log('\nDeployment successful!');
        console.log('Contract address:', deployedAddress);
        console.log('Deployment info saved to deployment-info.json');

    } catch (error) {
        console.error('Deployment failed:', error.message);
        process.exit(1);
    }
}

main();