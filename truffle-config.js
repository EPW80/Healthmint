require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");
const path = require("path");
const {
  NETWORKS,
  GAS_CONFIG,
  ENV_KEYS,
  truffleNetworks,
} = require("./config/networkConstants");

// Environment configuration class
class EnvConfig {
  constructor() {
    this.ENV = {
      PRIVATE_KEY: process.env.PRIVATE_KEY,
      INFURA_API_KEY: process.env.INFURA_API_KEY,
      INFURA_API_SECRET: process.env.INFURA_API_SECRET,
      ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
      NODE_ENV: process.env.NODE_ENV || "development",
    };

    this.validateEnv();
  }

  validateEnv() {
    if (this.ENV.NODE_ENV === "production") {
      const missingVars = Object.entries({
        PRIVATE_KEY: "Private key for wallet",
        INFURA_API_KEY: "Infura API key",
        INFURA_API_SECRET: "Infura API secret",
        ETHERSCAN_API_KEY: "Etherscan API key for contract verification",
      })
        .filter(([key]) => !this.ENV[key])
        .map(([key, description]) => `${key} (${description})`);

      if (missingVars.length > 0) {
        console.error("\nMissing required environment variables:");
        missingVars.forEach((variable) => console.error(`- ${variable}`));
        console.error("\nPlease check your .env file.\n");
        process.exit(1);
      }
    }
  }

  getPrivateKey() {
    if (!this.ENV.PRIVATE_KEY) {
      if (this.ENV.NODE_ENV === "development") {
        console.warn("Warning: Using default development private key");
        return "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      }
      throw new Error("Private key not configured");
    }

    const key = this.ENV.PRIVATE_KEY.startsWith("0x")
      ? this.ENV.PRIVATE_KEY.slice(2)
      : this.ENV.PRIVATE_KEY;

    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error("Invalid private key format");
    }

    return key;
  }

  get isProduction() {
    return this.ENV.NODE_ENV === "production";
  }
}

// Provider configuration class
class ProviderConfig {
  constructor(envConfig) {
    this.envConfig = envConfig;
  }

  getProvider(network) {
    try {
      const privateKey = this.envConfig.getPrivateKey();
      const networkConfig = NETWORKS[network.toUpperCase()];

      if (!networkConfig) {
        throw new Error(`Network configuration not found for ${network}`);
      }

      return new HDWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: `https://${networkConfig.RPC_SUFFIX}.infura.io/v3/${this.envConfig.ENV.INFURA_API_KEY}`,
        pollingInterval: 15000,
        networkCheckTimeout: 60000,
        timeoutBlocks: 50,
        addressIndex: 0,
        numberOfAddresses: 1,
        shareNonce: true,
        derivationPath: "m/44'/60'/0'/0/",
        headers: this.envConfig.ENV.INFURA_API_SECRET
          ? {
              "X-API-Secret": this.envConfig.ENV.INFURA_API_SECRET,
            }
          : undefined,
      });
    } catch (error) {
      console.error(`Error creating provider for ${network}:`, error.message);
      throw error;
    }
  }
}

// Security configuration class
class SecurityConfig {
  constructor(envConfig) {
    this.envConfig = envConfig;
  }

  getConfig(network) {
    const networkConfig = NETWORKS[network.toUpperCase()];

    return {
      confirmations: networkConfig.NAME === "mainnet" ? 3 : 2,
      timeoutBlocks: 50,
      networkCheckTimeout: 60000,
      skipDryRun: false,
      websockets: true,
      verify: {
        proxy: false,
        apiKey: this.envConfig.ENV.ETHERSCAN_API_KEY,
      },
      ...(this.envConfig.isProduction && {
        production: true,
        gasPrice: GAS_CONFIG[network.toUpperCase()].PRICE,
      }),
    };
  }
}

// Initialize configuration objects
const envConfig = new EnvConfig();
const providerConfig = new ProviderConfig(envConfig);
const securityConfig = new SecurityConfig(envConfig);

// Network configuration factory
const createNetworkConfig = (network) => {
  const networkName = network.toLowerCase();
  const networkData = NETWORKS[network.toUpperCase()];

  return {
    ...truffleNetworks[networkName],
    provider:
      networkName === "development"
        ? undefined
        : () => providerConfig.getProvider(networkName),
    ...securityConfig.getConfig(networkName),
  };
};

module.exports = {
  // Network configurations
  networks: {
    development: createNetworkConfig("LOCAL"),
    sepolia: createNetworkConfig("SEPOLIA"),
    mainnet: createNetworkConfig("MAINNET"),
  },

  // Contract paths configuration
  contracts_directory: path.join(__dirname, "contracts"),
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  migrations_directory: path.join(__dirname, "migrations"),

  // Enhanced compiler settings with security optimizations
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "paris",
        metadata: {
          bytecodeHash: "none",
        },
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode",
              "evm.deployedBytecode",
              "evm.methodIdentifiers",
              "metadata",
              "storageLayout",
            ],
          },
        },
      },
      resolver: {
        resolverPaths: [path.join(__dirname, "node_modules")],
      },
    },
  },

  // Enhanced testing configuration
  mocha: {
    timeout: 100000,
    reporter: "spec",
    reporterOptions: {
      colors: true,
    },
    bail: envConfig.isProduction,
  },

  // Plugin configurations
  plugins: [
    "truffle-plugin-verify",
    "solidity-coverage",
    ...(envConfig.isProduction ? ["truffle-security"] : []),
  ],

  // API key configuration
  api_keys: {
    etherscan: envConfig.ENV.ETHERSCAN_API_KEY || "",
  },

  // HIPAA compliance configuration
  hipaa_compliance: {
    required: true,
    audit_enabled: true,
    access_control: true,
    encryption_enabled: true,
    audit_retention_period: 6 * 365 * 24 * 60 * 60 * 1000,
    security_level: envConfig.isProduction ? "high" : "standard",
    phi_protection: true,
  },
};
