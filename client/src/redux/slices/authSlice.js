// src/redux/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  account: null,
  provider: null,
  signer: null,
  loading: false,
  error: null,
  network: {
    chainId: null,
    name: null,
    isSupported: false,
  },
  wallet: {
    type: "metamask", // Default wallet type
    isConnecting: false,
    isConnected: false,
  },
};

// Network reducer helper
const getNetworkName = (chainId) => {
  const networks = {
    "0x1": "Ethereum Mainnet",
    "0xaa36a7": "Sepolia",
    "0x5": "Goerli",
  };
  return networks[chainId] || "Unknown Network";
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateWalletConnection: (state, action) => {
      state.isAuthenticated = true;
      state.account = action.payload.address;
      state.provider = action.payload.provider;
      state.signer = action.payload.signer;
      state.wallet = {
        type: action.payload.walletType || "metamask",
        isConnecting: false,
        isConnected: true,
      };
    },

    startWalletConnection: (state) => {
      state.wallet.isConnecting = true;
      state.error = null;
    },

    clearWalletConnection: (state) => {
      return {
        ...initialState,
        network: state.network, // Preserve network state
      };
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.wallet.isConnecting = false;
    },

    updateAccount: (state, action) => {
      state.account = action.payload;
      if (!action.payload) {
        state.isAuthenticated = false;
        state.wallet.isConnected = false;
      }
    },

    updateNetwork: (state, action) => {
      const supportedNetworks = ["0x1", "0xaa36a7"]; // Ethereum Mainnet and Sepolia
      const chainId = action.payload;

      state.network = {
        chainId: chainId,
        name: getNetworkName(chainId),
        isSupported: supportedNetworks.includes(chainId),
      };
    },

    resetAuthState: () => initialState,
  },
});

// Action creators
export const {
  updateWalletConnection,
  startWalletConnection,
  clearWalletConnection,
  setLoading,
  setError,
  updateAccount,
  updateNetwork,
  resetAuthState,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsConnected = (state) => state.auth.wallet.isConnected;
export const selectWallet = (state) => state.auth.wallet;
export const selectNetwork = (state) => state.auth.network;
export const selectAccount = (state) => state.auth.account;

export default authSlice.reducer;
