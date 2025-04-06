// src/redux/slices/walletSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  address: null,
  isConnected: false,
  network: null,
  error: null,
  loading: false,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // Connect wallet action
    connectWallet: (state, action) => {
      state.address = action.payload.address;
      state.isConnected = true;
      state.loading = false;
      state.error = null;
    },
    // Disconnect wallet action
    disconnectWallet: (state) => {
      state.address = null;
      state.isConnected = false;
      state.network = null;
      state.loading = false;
    },
    // Set wallet connection status
    setWalletConnection: (state, action) => {
      state.address = action.payload.address;
      state.isConnected = true;
      state.loading = false;
      state.error = null;
      if (action.payload.network) {
        state.network = action.payload.network;
      }
    },
    // Clear wallet connection
    clearWalletConnection: (state) => {
      state.address = null;
      state.isConnected = false;
      state.network = null;
      state.loading = false;
      state.error = null;
    },
    // Set loading state
    setWalletLoading: (state, action) => {
      state.loading = action.payload;
    },
    // Set error state
    setWalletError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Update network information
    updateNetwork: (state, action) => {
      state.network = action.payload;
    },
  },
});

// Export actions
export const {
  connectWallet,
  disconnectWallet,
  setWalletConnection,
  clearWalletConnection,
  setWalletLoading,
  setWalletError,
  updateNetwork,
} = walletSlice.actions;

// Export reducer
export default walletSlice.reducer;
