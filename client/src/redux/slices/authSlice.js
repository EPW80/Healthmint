import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  account: null,
  provider: null,
  signer: null,
  loading: false,
  error: null,
  walletType: null, // 'metamask', 'walletconnect', etc.
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setWalletConnection: (state, action) => {
      state.isAuthenticated = true;
      state.account = action.payload.account;
      state.provider = action.payload.provider;
      state.signer = action.payload.signer;
      state.walletType = action.payload.walletType;
    },
    clearWalletConnection: (state) => {
      return initialState;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    updateAccount: (state, action) => {
      state.account = action.payload;
    },
    updateNetwork: (state, action) => {
      state.networkId = action.payload;
    },
  },
});

export const {
  setWalletConnection,
  clearWalletConnection,
  setLoading,
  setError,
  updateAccount,
  updateNetwork,
} = authSlice.actions;

export default authSlice.reducer;
