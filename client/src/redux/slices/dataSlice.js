import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  healthRecords: [],
  userRecords: [], // Records owned by the current user
  purchasedRecords: [], // Records purchased by the current user
  loading: false,
  error: null,
  filters: {
    minAge: "",
    maxAge: "",
    verifiedOnly: false,
    category: "",
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    recordsPerPage: 12,
  },
  selectedRecord: null,
  transactions: [], // Transaction history
};

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    setHealthRecords: (state, action) => {
      state.healthRecords = action.payload;
    },
    setUserRecords: (state, action) => {
      state.userRecords = action.payload;
    },
    setPurchasedRecords: (state, action) => {
      state.purchasedRecords = action.payload;
    },
    addHealthRecord: (state, action) => {
      state.healthRecords.push(action.payload);
      state.userRecords.push(action.payload);
    },
    updateHealthRecord: (state, action) => {
      const index = state.healthRecords.findIndex(
        (record) => record.id === action.payload.id
      );
      if (index !== -1) {
        state.healthRecords[index] = action.payload;
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setSelectedRecord: (state, action) => {
      state.selectedRecord = action.payload;
    },
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
    },
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setHealthRecords,
  setUserRecords,
  setPurchasedRecords,
  addHealthRecord,
  updateHealthRecord,
  setFilters,
  setPagination,
  setSelectedRecord,
  addTransaction,
  setTransactions,
  setLoading,
  setError,
} = dataSlice.actions;

export default dataSlice.reducer;
