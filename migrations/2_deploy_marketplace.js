// migrations/2_deploy_marketplace.js
const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");

module.exports = function (deployer) {
  deployer.deploy(HealthDataMarketplace);
};
