import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConnected: false,
  address: "",
  provider: null,
  signer: null,
  walletType: "",
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    updateWalletConnection: (state, action) => {
      return { ...state, ...action.payload, isConnected: true };
    },
    clearWalletConnection: (state) => {
      return { ...initialState };
    },
  },
});

export const { updateWalletConnection, clearWalletConnection } =
  walletSlice.actions;
export default walletSlice.reducer;
