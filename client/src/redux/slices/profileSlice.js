import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  profileImage: null,
  profileImageHash: null, // IPFS hash
  userDetails: {
    address: null,
    age: null,
    totalUploads: 0,
    totalPurchases: 0,
    earnings: "0",
    storageUsed: "0",
  },
  statistics: {
    totalSales: 0,
    averageRating: 0,
    dataQualityScore: 0,
  },
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfileImage: (state, action) => {
      state.profileImage = action.payload;
    },
    setProfileImageHash: (state, action) => {
      state.profileImageHash = action.payload;
    },
    setUserDetails: (state, action) => {
      state.userDetails = { ...state.userDetails, ...action.payload };
    },
    updateStatistics: (state, action) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },
    incrementUploads: (state) => {
      state.userDetails.totalUploads += 1;
    },
    incrementPurchases: (state) => {
      state.userDetails.totalPurchases += 1;
    },
    updateEarnings: (state, action) => {
      state.userDetails.earnings = action.payload;
    },
    updateStorageUsed: (state, action) => {
      state.userDetails.storageUsed = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearProfile: (state) => {
      return initialState;
    },
  },
});

export const {
  setProfileImage,
  setProfileImageHash,
  setUserDetails,
  updateStatistics,
  incrementUploads,
  incrementPurchases,
  updateEarnings,
  updateStorageUsed,
  setLoading,
  setError,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
