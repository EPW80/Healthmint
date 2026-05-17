// userSlice.js
import * as pkg from "@reduxjs/toolkit";

const { createSlice } = pkg;

const initialState = {
  profile: {
    name: "",
    age: "",
    email: "",
    role: "",
    address: null,
    agreeToTerms: false,
    totalUploads: 0,
    totalPurchases: 0,
    earnings: "0",
    profileImage: null,
    profileImageHash: null,
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
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Primary user profile actions
    updateUserProfile: (state, action) => {
      state.profile = {
        ...state.profile,
        ...action.payload,
      };
    },

    clearUserProfile: (state) => {
      state.profile = initialState.profile;
      state.registration.isComplete = false;
    },

    // Registration actions
    updateRegistration: (state, action) => {
      state.registration = {
        ...state.registration,
        ...action.payload,
      };
    },

    completeRegistration: (state) => {
      state.registration.isComplete = true;
    },

    // Wallet actions
    updateWalletConnection: (state, action) => {
      state.wallet = {
        ...state.wallet,
        ...action.payload,
        isConnected: true,
      };
    },

    disconnectWallet: (state) => {
      state.wallet = initialState.wallet;
    },

    // Transaction actions
    addTransaction: (state, action) => {
      state.transactions.unshift({
        id: Date.now(),
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // Profile statistics actions
    incrementStatistic: (state, action) => {
      const { type } = action.payload;
      if (type === "uploads") {
        state.profile.totalUploads += 1;
      } else if (type === "purchases") {
        state.profile.totalPurchases += 1;
      }
    },

    updateEarnings: (state, action) => {
      state.profile.earnings = action.payload;
    },

    // Profile image actions
    updateProfileImage: (state, action) => {
      state.profile.profileImage = action.payload.image;
      state.profile.profileImageHash = action.payload.hash;
    },

    // Reset state
    resetState: () => initialState,
  },
});

// Action creators
export const {
  // Primary user actions
  updateUserProfile,
  clearUserProfile,

  // Registration actions
  updateRegistration,
  completeRegistration,

  // Wallet actions
  updateWalletConnection,
  disconnectWallet,

  // Transaction actions
  addTransaction,

  // Statistics actions
  incrementStatistic,
  updateEarnings,

  // Profile image actions
  updateProfileImage,

  // Reset action
  resetState,
} = userSlice.actions;

// Selectors
export const selectUserProfile = (state) => state.user.profile;
export const selectWalletConnection = (state) => state.user.wallet;
export const selectRegistration = (state) => state.user.registration;
export const selectTransactions = (state) => state.user.transactions;

export default userSlice.reducer;
