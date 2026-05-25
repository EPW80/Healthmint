// client/src/redux/slices/dataSlice.js
//
// Health-data slice. Owns the cached records, filters, pagination, and the
// loading/error state for the storage-files API. Components should not keep
// parallel useState copies of this data — read via useSelector or via the
// useHealthData hook (which is now a thin Redux wrapper).

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { STORAGE_KEYS } from "../../config/storageKeys.js";
import generateMockHealthRecords from "../../mockData/mockHealthRecords.js";

const initialState = {
  healthRecords: [],
  userRecords: [],
  purchasedRecords: [],
  loading: false,
  error: null,
  apiFailure: false,
  totalCount: 0,
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
  transactions: [],
};

// Normalize a storage-API file payload to the shape consumers expect.
const formatStorageFile = (file) => ({
  id: file._id || file.id,
  title: file.fileName || file.name || "Untitled Record",
  description: file.description || `${file.category || "Health"} data record`,
  category: file.category || "Health",
  verified: file.registeredOnChain || false,
  anonymized: file.anonymized || !file.containsPHI,
  format:
    file.fileType ||
    file.format ||
    (file.mimeType ? file.mimeType.split("/")[1].toUpperCase() : "PDF"),
  recordCount: 1,
  uploadDate: file.createdAt || file.uploadDate || new Date().toISOString(),
  fileSize: file.fileSize || 0,
  tags: file.tags || [],
  shared: file.shared || false,
  owner: file.owner,
});

// Load health records from the storage API. Falls back to mock data when
// the API is unreachable so the UI stays functional in dev/offline runs.
export const loadHealthRecordsAsync = createAsyncThunk(
  "data/loadHealthRecords",
  async ({ useMockData = false } = {}) => {
    // Use the centralized auth-token key. The previous hook implementation
    // read "token" (the wrong key) and always silently fell back to mock data.
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (!useMockData && token) {
      try {
        const response = await axios.get("/api/storage/files", {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const files = response.data?.files || response.data?.results || [];
        if (files.length > 0) {
          const records = files.map(formatStorageFile);
          return { records, source: "api", apiFailure: false };
        }
      } catch (apiError) {
        console.warn(
          "loadHealthRecordsAsync: API failed, using mock data:",
          apiError.message
        );
        const fallback = generateMockHealthRecords(10);
        return { records: fallback, source: "mock", apiFailure: true };
      }
    }

    const mockRecords = generateMockHealthRecords(10);
    return { records: mockRecords, source: "mock", apiFailure: false };
  }
);

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
    updateFilter: (state, action) => {
      const { key, value } = action.payload;
      state.filters[key] = value;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
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
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadHealthRecordsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadHealthRecordsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.healthRecords = action.payload.records;
        state.userRecords = action.payload.records;
        state.totalCount = action.payload.records.length;
        state.apiFailure = action.payload.apiFailure;
      })
      .addCase(loadHealthRecordsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "Could not load health records";
        // Don't clear records — keep whatever was loaded previously.
      });
  },
});

export const {
  setHealthRecords,
  setUserRecords,
  setPurchasedRecords,
  addHealthRecord,
  updateHealthRecord,
  setFilters,
  updateFilter,
  resetFilters,
  setPagination,
  setSelectedRecord,
  addTransaction,
  setTransactions,
  setLoading,
  setError,
  clearError,
} = dataSlice.actions;

// Selectors
export const selectHealthData = (state) => state.data.healthRecords;
export const selectUserRecords = (state) => state.data.userRecords;
export const selectDataLoading = (state) => state.data.loading;
export const selectDataError = (state) => state.data.error;
export const selectDataFilters = (state) => state.data.filters;
export const selectDataTotalCount = (state) => state.data.totalCount;
export const selectApiFailure = (state) => state.data.apiFailure;

export default dataSlice.reducer;
