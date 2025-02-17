// config/networkConstants.js

const NETWORKS = {
  MAINNET: {
    NAME: "mainnet",
    CHAIN_ID: "0x1",
    NETWORK_ID: 1,
    EXPLORER_URL: "https://etherscan.io",
    RPC_SUFFIX: "mainnet",
  },
  SEPOLIA: {
    NAME: "sepolia",
    CHAIN_ID: "0xaa36a7",
    NETWORK_ID: 11155111,
    EXPLORER_URL: "https://sepolia.etherscan.io",
    RPC_SUFFIX: "sepolia",
  },
  LOCAL: {
    NAME: "development",
    CHAIN_ID: "0x539",
    NETWORK_ID: 1337,
    EXPLORER_URL: "http://localhost:8545",
    RPC_SUFFIX: "localhost",
  },
};

const GAS_CONFIG = {
  MAINNET: {
    PRICE: 50000000000, // 50 gwei
    LIMIT: {
      DEPLOYMENT: 5000000,
      METHOD: 200000,
    },
  },
  SEPOLIA: {
    PRICE: 20000000000, // 20 gwei
    LIMIT: {
      DEPLOYMENT: 5500000,
      METHOD: 300000,
    },
  },
  LOCAL: {
    PRICE: 0,
    LIMIT: {
      DEPLOYMENT: 6000000,
      METHOD: 500000,
    },
  },
};

const ENV_KEYS = {
  PRIVATE_KEY: "Private key for wallet",
  INFURA_API_KEY: "Infura API key",
  INFURA_API_SECRET: "Infura API secret",
  ETHERSCAN_API_KEY: "Etherscan API key for contract verification",
};

const truffleNetworks = {
  development: {
    host: "127.0.0.1",
    port: 8545,
    network_id: NETWORKS.LOCAL.NETWORK_ID,
    websockets: true,
  },
  sepolia: {
    network_id: NETWORKS.SEPOLIA.NETWORK_ID,
    gas: GAS_CONFIG.SEPOLIA.LIMIT.DEPLOYMENT,
    gasPrice: GAS_CONFIG.SEPOLIA.PRICE,
    networkCheckTimeout: 60000,
    timeoutBlocks: 50,
    skipDryRun: true,
    websockets: true,
  },
  mainnet: {
    network_id: NETWORKS.MAINNET.NETWORK_ID,
    gas: GAS_CONFIG.MAINNET.LIMIT.DEPLOYMENT,
    gasPrice: GAS_CONFIG.MAINNET.PRICE,
    networkCheckTimeout: 60000,
    timeoutBlocks: 50,
    skipDryRun: false,
    websockets: true,
  },
};

// Add HIPAA compliance settings
const HIPAA_CONFIG = {
  required: true,
  audit_enabled: true,
  access_control: true,
  encryption_enabled: true,
  audit_retention_period: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years in milliseconds
  security_levels: {
    high: {
      encryption: "AES-256-GCM",
      keyLength: 256,
      saltRounds: 12,
    },
    standard: {
      encryption: "AES-256-CBC",
      keyLength: 256,
      saltRounds: 10,
    },
  },
};

module.exports = {
  NETWORKS,
  GAS_CONFIG,
  ENV_KEYS,
  truffleNetworks,
  HIPAA_CONFIG,
};
