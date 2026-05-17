// migrations/2_deploy_marketplace.js
// Deploy the HealthDataMarketplace contract
const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");

module.exports = function(deployer) {
  deployer.deploy(HealthDataMarketplace)
    .then(() => {
      console.log("HealthDataMarketplace deployed at:", HealthDataMarketplace.address);
    });
};