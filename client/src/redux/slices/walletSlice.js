// src/redux/slices/walletSlice.js
import * as pkg from "@reduxjs/toolkit";
import { ethers } from "ethers";

const { createSlice, createAsyncThunk } = pkg;

// Constants for supported networks
export const SUPPORTED_NETWORKS = {
  MAINNET: {
    chainId: "0x1",
    name: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io",
    rpcUrl: "https://mainnet.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea", // Replace with your key or env variable
  },
  SEPOLIA: {
    chainId: "0xaa36a7",
    name: "Sepolia Testnet",
    blockExplorer: "https://sepolia.etherscan.io",
    rpcUrl: "https://sepolia.infura.io/v3/574fd0b6fe6e4c46bae3728f1b9019ea", // Replace with your key or env variable
  },
};

// Default network for the application
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.SEPOLIA;

// Network helper function for better readability
const getNetworkName = (chainId) => {
  if (!chainId) return "Unknown Network";

  const networks = {
    "0x1": "Ethereum Mainnet",
    "0xaa36a7": "Sepolia Testnet",
    "0x5": "Goerli Testnet",
    "0x13881": "Polygon Mumbai",
    "0x89": "Polygon Mainnet",
    "0x539": "Local Development",
  };

  return networks[chainId] || "Unknown Network";
};

// Helper function to check if network is supported
const isNetworkSupported = (chainId) => {
  return Object.values(SUPPORTED_NETWORKS).some(
    (network) => network.chainId === chainId
  );
};

// Helper function to create network state
const createNetworkState = (chainId) => {
  const supported = isNetworkSupported(chainId);

  return {
    chainId,
    name: getNetworkName(chainId),
    isSupported: supported,
    blockExplorer: supported
      ? Object.values(SUPPORTED_NETWORKS).find(
          (network) => network.chainId === chainId
        )?.blockExplorer || null
      : null,
  };
};

// Async thunk for connecting wallet
export const connectWalletAsync = createAsyncThunk(
  "wallet/connectWallet",
  async (_, { rejectWithValue }) => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = ethers.utils.hexValue(network.chainId);

      // Minimal, serializable provider info
      const providerInfo = {
        connection: {
          url: provider.connection.url,
        },
      };

      // Check if we need to switch networks
      const isSupported = isNetworkSupported(chainId);
      if (!isSupported) {
        // We'll let the UI handle this based on network state
        console.log(
          `Connected to unsupported network: ${getNetworkName(chainId)}`
        );
      }

      return {
        address: accounts[0],
        provider: providerInfo,
        signer: { _isSigner: true },
        chainId,
        lastConnected: Date.now(),
      };
    } catch (error) {
      if (error.code === 4001) {
        return rejectWithValue("User rejected connection request");
      }
      return rejectWithValue(error.message || "Failed to connect wallet");
    }
  }
);

// Async thunk for switching networks
export const switchNetworkAsync = createAsyncThunk(
  "wallet/switchNetwork",
  async (targetChainId = DEFAULT_NETWORK.chainId, { rejectWithValue }) => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        });
      } catch (switchError) {
        // This error code means the chain hasn't been added to MetaMask
        if (switchError.code === 4902 || switchError.code === -32603) {
          const targetNetwork = Object.values(SUPPORTED_NETWORKS).find(
            (network) => network.chainId === targetChainId
          );

          if (!targetNetwork) {
            throw new Error("Network configuration not found");
          }

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetNetwork.chainId,
                chainName: targetNetwork.name,
                rpcUrls: [targetNetwork.rpcUrl || "https://rpc.sepolia.org"],
                blockExplorerUrls: [targetNetwork.blockExplorer],
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });

          // After adding, we need to switch again
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainId }],
          });
        } else if (switchError.code === 4001) {
          throw new Error("User rejected network switch");
        } else {
          throw switchError;
        }
      }

      // Get updated chain ID after switch
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = ethers.utils.hexValue(network.chainId);

      return { chainId };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to switch network");
    }
  }
);

// Get wallet accounts without requesting permission
export const getWalletAccountsAsync = createAsyncThunk(
  "wallet/getAccounts",
  async (_, { rejectWithValue }) => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      // This doesn't prompt the user, just gets already connected accounts
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (!accounts || accounts.length === 0) {
        // No accounts connected
        return { accounts: [] };
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = ethers.utils.hexValue(network.chainId);

      return {
        address: accounts[0],
        chainId,
        lastConnected: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to get wallet accounts");
    }
  }
);

const initialState = {
  isConnected: false,
  address: null,
  provider: null,
  signer: null,
  walletType: "metamask", // Default wallet type
  chainId: null,

  // Connection state
  loading: false,
  error: null,

  // Network state
  network: {
    chainId: null,
    name: null,
    isSupported: false,
    blockExplorer: null,
  },

  // Connection history
  lastConnected: null,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    updateWalletConnection: (state, action) => {
      state.isConnected = true;
      state.address = action.payload.address;
      state.provider = action.payload.provider;
      state.signer = action.payload.signer;
      state.walletType = action.payload.walletType || "metamask";
      state.chainId = action.payload.chainId;
      state.lastConnected = action.payload.lastConnected || Date.now();
      state.loading = false;
      state.error = null;

      // Update network information based on chainId
      if (action.payload.chainId) {
        state.network = createNetworkState(action.payload.chainId);
      }
    },

    clearWalletConnection: (state) => {
      return {
        ...initialState,
        // Keep network information
        network: { ...state.network },
      };
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    updateAccount: (state, action) => {
      state.address = action.payload;
      state.isConnected = Boolean(action.payload);
    },

    updateNetwork: (state, action) => {
      const chainId = action.payload;
      state.chainId = chainId;
      state.network = createNetworkState(chainId);
    },

    resetWalletState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Connect wallet async thunk
      .addCase(connectWalletAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectWalletAsync.fulfilled, (state, action) => {
        state.isConnected = true;
        state.address = action.payload.address;
        state.provider = action.payload.provider;
        state.signer = action.payload.signer;
        state.chainId = action.payload.chainId;
        state.lastConnected = action.payload.lastConnected;
        state.loading = false;

        // Update network information
        state.network = createNetworkState(action.payload.chainId);
      })
      .addCase(connectWalletAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to connect wallet";
        state.isConnected = false;
      })

      // Get accounts async thunk
      .addCase(getWalletAccountsAsync.fulfilled, (state, action) => {
        // Only update if we found an address
        if (action.payload.address) {
          state.isConnected = true;
          state.address = action.payload.address;
          state.chainId = action.payload.chainId;
          state.lastConnected = action.payload.lastConnected;

          // Update network information
          state.network = createNetworkState(action.payload.chainId);
        }
      })

      // Switch network async thunk
      .addCase(switchNetworkAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchNetworkAsync.fulfilled, (state, action) => {
        state.chainId = action.payload.chainId;
        state.loading = false;

        // Update network information
        state.network = createNetworkState(action.payload.chainId);
      })
      .addCase(switchNetworkAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to switch network";
      });
  },
});

export const {
  updateWalletConnection,
  clearWalletConnection,
  setLoading,
  setError,
  updateAccount,
  updateNetwork,
  resetWalletState,
  setWalletAddress,
  setWalletConnection,
} = walletSlice.actions;

// Selectors for easily accessing state
export const selectWallet = (state) => state.wallet;
export const selectIsConnected = (state) => state.wallet.isConnected;
export const selectAddress = (state) => state.wallet.address;
export const selectChainId = (state) => state.wallet.chainId;
export const selectNetwork = (state) => state.wallet.network;
export const selectIsOnSupportedNetwork = (state) =>
  state.wallet.network?.isSupported === true;
export const selectWalletLoading = (state) => state.wallet.loading;
export const selectWalletError = (state) => state.wallet.error;

export default walletSlice.reducer;
