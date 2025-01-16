// authSlice.js
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
    type: null, // 'metamask', 'walletconnect', etc.
    isConnecting: false,
    isConnected: false,
  },
};

// network reducer helper
const getNetworkName = (chainId) => {
  const networks = {
    "0x1": "Ethereum Mainnet",
    "0x3": "Ropsten",
    "0x4": "Rinkeby",
    "0x5": "Goerli",
    "0x2a": "Kovan",
  };
  return networks[chainId] || "Unknown Network";
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setWalletConnection: (state, action) => {
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
      const supportedNetworks = ["0x1"]; // Ethereum Mainnet
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
  setWalletConnection,
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
