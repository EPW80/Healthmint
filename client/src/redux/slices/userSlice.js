import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: {
    name: null,
    age: null,
    email: null,
    role: null,
    address: null,
    agreeToTerms: false,
  },
  registration: {
    step: 0,
    isComplete: false,
  },
  wallet: {
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    network: null,
  },
  transactions: [],
  profileSettings: {
    profileImage: null,
    profileImageHash: null,
    totalUploads: 0,
    totalPurchases: 0,
    earnings: "0",
  }
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action) => {
      state.userData = { ...state.userData, ...action.payload };
    },
    setRegistrationStep: (state, action) => {
      state.registration.step = action.payload;
    },
    completeRegistration: (state) => {
      state.registration.isComplete = true;
    },
    setWalletConnection: (state, action) => {
      state.wallet = { ...state.wallet, ...action.payload };
    },
    disconnectWallet: (state) => {
      state.wallet = initialState.wallet;
    },
    addTransaction: (state, action) => {
      state.transactions.unshift({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    updateProfileSettings: (state, action) => {
      state.profileSettings = { ...state.profileSettings, ...action.payload };
    },
    incrementUploads: (state) => {
      state.profileSettings.totalUploads += 1;
    },
    incrementPurchases: (state) => {
      state.profileSettings.totalPurchases += 1;
    },
    updateEarnings: (state, action) => {
      state.profileSettings.earnings = action.payload;
    },
    clearUserData: () => initialState,
  },
});

export const {
  setUserData,
  setRegistrationStep,
  completeRegistration,
  setWalletConnection,
  disconnectWallet,
  addTransaction,
  updateProfileSettings,
  incrementUploads,
  incrementPurchases,
  updateEarnings,
  clearUserData,
} = userSlice.actions;

// Selectors
export const selectUserData = (state) => state.user.userData;
export const selectWalletConnection = (state) => state.user.wallet;
export const selectRegistration = (state) => state.user.registration;
export const selectProfileSettings = (state) => state.user.profileSettings;
export const selectTransactions = (state) => state.user.transactions;

export default userSlice.reducer;