// client/src/hooks/useHealthData.js
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import healthDataService from "../services/healthDataService.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { setLoading, setError } from "../redux/slices/uiSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * Enhanced useHealthData hook for managing health data
 *
 * Provides comprehensive functionality for fetching, managing, and interacting
 * with health records in a HIPAA-compliant manner
 *
 * @param {Object} options - Hook configuration options
 * @returns {Object} Health data state and functions
 */
const useHealthData = (options = {}) => {
  const {
    initialFilters = {
      minAge: "",
      maxAge: "",
      verifiedOnly: false,
      category: "All",
      priceRange: "all",
      searchTerm: "",
    },
    loadOnMount = true,
    userRole = null, // "patient" or "researcher"
    enablePolling = false,
    pollingInterval = 30000, // 30 seconds
  } = options;

  const dispatch = useDispatch();

  // State
  const [healthData, setHealthData] = useState([]);
  const [userRecords, setUserRecords] = useState([]);
  const [purchasedRecords, setPurchasedRecords] = useState([]);
  const [loading, setLoadingState] = useState(false);
  const [error, setErrorState] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordDetails, setRecordDetails] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Fetch health records with proper error handling
   */
  const fetchHealthData = useCallback(async () => {
    try {
      setLoadingState(true);
      setErrorState(null);

      // Different fetching based on user role
      if (userRole === "patient") {
        // Patient fetches their own records
        const records = await healthDataService.fetchPatientRecords({
          ...filters,
          includeIdentifiers: true, // Patients can see their own identifiers
        });

        setUserRecords(records);
        setTotalCount(records.length);
        setHealthData(records);
      } else {
        // Researcher fetches anonymized data for research
        const result = await healthDataService.fetchResearchData(filters);

        setHealthData(result.datasets);
        setTotalCount(result.total);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching health data:", err);
      setErrorState(err.message || "Failed to load health data");

      dispatch(
        addNotification({
          type: "error",
          message:
            err.message || "Failed to load health data. Please try again.",
        })
      );
    } finally {
      setLoadingState(false);
    }
  }, [filters, userRole, dispatch]);

  /**
   * Fetch purchased records
   */
  const fetchPurchasedRecords = useCallback(async () => {
    try {
      if (userRole !== "researcher") return;

      setLoadingState(true);

      // Create HIPAA audit log
      await hipaaComplianceService.createAuditLog("PURCHASED_RECORDS_ACCESS", {
        action: "VIEW",
        timestamp: new Date().toISOString(),
      });

      // Fetch purchased records from the API
      const response = await healthDataService.fetchPatientRecords({
        purchased: true,
        includeIdentifiers: false, // Never include identifiers for purchased records
      });

      setPurchasedRecords(response);
    } catch (err) {
      console.error("Error fetching purchased records:", err);

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load purchased records. Please try again.",
        })
      );
    } finally {
      setLoadingState(false);
    }
  }, [userRole, dispatch]);

  /**
   * Update filters and refetch data
   */
  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  /**
   * Reset filters to initial values
   */
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  /**
   * Get detailed information for a specific record
   */
  const getRecordDetails = useCallback(
    async (recordId) => {
      try {
        setLoadingState(true);
        setErrorState(null);

        const details =
          await healthDataService.fetchHealthRecordDetails(recordId);

        setSelectedRecord(recordId);
        setRecordDetails(details);

        return details;
      } catch (err) {
        console.error("Error fetching record details:", err);
        setErrorState(err.message || "Failed to load record details");

        dispatch(
          addNotification({
            type: "error",
            message:
              err.message || "Failed to load record details. Please try again.",
          })
        );

        return null;
      } finally {
        setLoadingState(false);
      }
    },
    [dispatch]
  );

  /**
   * Upload a new health record
   */
  const uploadHealthRecord = useCallback(
    async (data, file) => {
      try {
        setLoadingState(true);
        setErrorState(null);

        // Reset upload progress
        setUploadProgress(0);

        // Track upload progress
        const onProgress = (progress) => {
          setUploadProgress(progress);
        };

        // Upload the health record
        const result = await healthDataService.uploadHealthData(
          data,
          file,
          onProgress
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to upload health record");
        }

        // Success notification
        dispatch(
          addNotification({
            type: "success",
            message: "Health record uploaded successfully!",
          })
        );

        // Refresh data after upload
        await fetchHealthData();

        return result;
      } catch (err) {
        console.error("Error uploading health record:", err);
        setErrorState(err.message || "Failed to upload health record");

        dispatch(
          addNotification({
            type: "error",
            message:
              err.message ||
              "Failed to upload health record. Please try again.",
          })
        );

        return { success: false, error: err.message };
      } finally {
        setLoadingState(false);
        setUploadProgress(0);
      }
    },
    [dispatch, fetchHealthData]
  );

  /**
   * Purchase a health record
   */
  const purchaseRecord = useCallback(
    async (recordId) => {
      try {
        if (!recordId) {
          throw new Error("Record ID is required");
        }

        setLoadingState(true);

        const result = await healthDataService.purchaseHealthData(recordId);

        if (result.success) {
          // Refresh purchased records after successful purchase
          await fetchPurchasedRecords();

          dispatch(
            addNotification({
              type: "success",
              message: "Health record purchased successfully!",
            })
          );
        }

        return result;
      } catch (err) {
        console.error("Error purchasing record:", err);

        dispatch(
          addNotification({
            type: "error",
            message:
              err.message || "Failed to purchase record. Please try again.",
          })
        );

        return { success: false, error: err.message };
      } finally {
        setLoadingState(false);
      }
    },
    [dispatch, fetchPurchasedRecords]
  );

  /**
   * Download a health record
   */
  const downloadRecord = useCallback(
    async (recordId) => {
      try {
        setLoadingState(true);

        const result = await healthDataService.downloadHealthRecord(recordId);

        if (!result.success) {
          throw new Error(result.error || "Failed to download record");
        }

        // Create download URL and trigger download
        const url = URL.createObjectURL(result.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        dispatch(
          addNotification({
            type: "success",
            message: "Record downloaded successfully",
          })
        );

        return true;
      } catch (err) {
        console.error("Error downloading record:", err);

        dispatch(
          addNotification({
            type: "error",
            message:
              err.message || "Failed to download record. Please try again.",
          })
        );

        return false;
      } finally {
        setLoadingState(false);
      }
    },
    [dispatch]
  );

  // Load data on mount if requested
  useEffect(() => {
    if (loadOnMount) {
      fetchHealthData();
      if (userRole === "researcher") {
        fetchPurchasedRecords();
      }
    }
  }, [loadOnMount, fetchHealthData, fetchPurchasedRecords, userRole]);

  // Polling for data updates if enabled
  useEffect(() => {
    let intervalId;

    if (enablePolling && !loading) {
      intervalId = setInterval(() => {
        fetchHealthData();
        if (userRole === "researcher") {
          fetchPurchasedRecords();
        }
      }, pollingInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    enablePolling,
    pollingInterval,
    loading,
    fetchHealthData,
    fetchPurchasedRecords,
    userRole,
  ]);

  return {
    // State
    healthData,
    userRecords,
    purchasedRecords,
    loading,
    error,
    filters,
    totalCount,
    selectedRecord,
    recordDetails,
    uploadProgress,
    lastUpdated,

    // Actions
    fetchHealthData,
    fetchPurchasedRecords,
    updateFilter,
    resetFilters,
    getRecordDetails,
    uploadHealthRecord,
    purchaseRecord,
    downloadRecord,

    // Helpers
    clearError: () => setErrorState(null),
    setSelectedRecord,
  };
};

export default useHealthData;
