// src/hooks/useHealthData.js
//
// Thin Redux wrapper around the data slice. The state lives in
// state.data and the load/fetch logic lives in dataSlice's
// loadHealthRecordsAsync thunk — this hook only memoizes the
// dispatch/selector glue and exposes the legacy API consumers expect.
//
// Previously this hook held the entire state in useState, which caused
// duplicate fetches and a silently-broken auth read (it called
// localStorage.getItem("token") — the wrong key — so it always fell
// back to mock data even with a valid session).

import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  loadHealthRecordsAsync,
  setFilters as setFiltersAction,
  updateFilter as updateFilterAction,
  resetFilters as resetFiltersAction,
  clearError as clearErrorAction,
  selectHealthData,
  selectUserRecords,
  selectDataLoading,
  selectDataError,
  selectDataFilters,
  selectDataTotalCount,
  selectApiFailure,
} from "../redux/slices/dataSlice.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";

const useHealthData = (options = {}) => {
  const { initialFilters, loadOnMount = true, useMockData = false } = options;
  const dispatch = useDispatch();

  const healthData = useSelector(selectHealthData);
  const userRecords = useSelector(selectUserRecords);
  const loading = useSelector(selectDataLoading);
  const error = useSelector(selectDataError);
  const filters = useSelector(selectDataFilters);
  const totalCount = useSelector(selectDataTotalCount);
  const apiFailure = useSelector(selectApiFailure);

  const fetchHealthData = useCallback(
    () => dispatch(loadHealthRecordsAsync({ useMockData })),
    [dispatch, useMockData]
  );

  // Apply initialFilters once if provided. We only do this when the option is
  // present because callers that don't pass it expect the slice's filter
  // state to be left alone.
  useEffect(() => {
    if (initialFilters) {
      dispatch(setFiltersAction(initialFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loadOnMount) {
      fetchHealthData();
    }
  }, [loadOnMount, fetchHealthData]);

  const getRecordDetails = useCallback(
    async (recordId) => {
      if (!recordId) return null;

      // Prefer the cached record.
      const localRecord = userRecords.find((r) => r.id === recordId);
      if (localRecord) return localRecord;

      try {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!token) return null;
        const response = await axios.get(`/api/storage/files/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.file) {
          const file = response.data.file;
          return {
            id: file._id || file.id,
            title: file.fileName || file.name,
            description: file.description,
            category: file.category || "Health",
          };
        }
        return null;
      } catch (err) {
        console.error("getRecordDetails: failed", err);
        return null;
      }
    },
    [userRecords]
  );

  const downloadRecord = useCallback(
    async (recordId) => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!token) return { success: false, error: "Not authenticated" };

        const response = await axios.get(
          `/api/storage/files/${recordId}?content=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
          }
        );

        const record = userRecords.find((r) => r.id === recordId);
        const fileName = record?.title || `health-record-${recordId}.pdf`;

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return { success: true };
      } catch (err) {
        console.error("downloadRecord: failed", err);
        return { success: false, error: err.message };
      }
    },
    [userRecords]
  );

  const updateFilter = useCallback(
    (key, value) => dispatch(updateFilterAction({ key, value })),
    [dispatch]
  );
  const resetFilters = useCallback(
    () => dispatch(resetFiltersAction()),
    [dispatch]
  );
  const clearError = useCallback(
    () => dispatch(clearErrorAction()),
    [dispatch]
  );

  return {
    healthData,
    userRecords,
    loading,
    error,
    filters,
    totalCount,
    apiFailure,
    getRecordDetails,
    downloadRecord,
    fetchHealthData,
    loadUserStorageFiles: fetchHealthData,
    refreshData: fetchHealthData,
    updateFilter,
    resetFilters,
    clearError,
  };
};

export default useHealthData;
