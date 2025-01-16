import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userData: {
    name: "",
    age: "",
    email: "",
    role: "",
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
  },
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Set user form data
    setFormData: (state, action) => {
      state.userData = {
        ...state.userData,
        ...action.payload,
      };
    },

    // Set user data from backend
    setUserData: (state, action) => {
      state.userData = {
        ...state.userData,
        ...action.payload,
      };
    },

    // Clear user data
    clearUserData: (state) => {
      state.userData = initialState.userData;
      state.registration.isComplete = false;
    },

    // Registration steps
    setRegistrationStep: (state, action) => {
      state.registration.step = action.payload;
    },

    completeRegistration: (state) => {
      state.registration.isComplete = true;
    },

    // Wallet connection
    setWalletConnection: (state, action) => {
      state.wallet = {
        ...state.wallet,
        ...action.payload,
        isConnected: true,
      };
    },

    disconnectWallet: (state) => {
      state.wallet = initialState.wallet;
    },

    // User activity
    addTransaction: (state, action) => {
      state.transactions.unshift({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // Profile settings
    updateProfileSettings: (state, action) => {
      state.profileSettings = {
        ...state.profileSettings,
        ...action.payload,
      };
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

    // Reset entire state
    resetState: () => initialState,
  },
});

export const {
  setFormData, // For form data
  setUserData, // For backend user data
  clearUserData, // Clear user data
  setRegistrationStep,
  completeRegistration,
  setWalletConnection,
  disconnectWallet,
  addTransaction,
  updateProfileSettings,
  incrementUploads,
  incrementPurchases,
  updateEarnings,
  resetState, // Reset entire state
} = userSlice.actions;

// Selectors
export const selectUserData = (state) => state.user.userData;
export const selectWalletConnection = (state) => state.user.wallet;
export const selectRegistration = (state) => state.user.registration;
export const selectProfileSettings = (state) => state.user.profileSettings;
export const selectTransactions = (state) => state.user.transactions;

export default userSlice.reducer;
