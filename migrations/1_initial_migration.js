// migrations/1_initial_migration.js
// Deploy the Migrations contract
const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};