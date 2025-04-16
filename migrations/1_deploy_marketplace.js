const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");

module.exports = function (deployer) {
  deployer.deploy(HealthDataMarketplace).then(() => {
    console.log("Contract deployed at:", HealthDataMarketplace.address);
  });
};
