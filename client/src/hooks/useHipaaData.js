// client/src/hooks/useHipaaData.js
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import useAsyncOperation from "./useAsyncOperation.js";

/**
 * Custom hook for HIPAA-compliant data fetching with optimized dependency handling
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.fetchFunction - The function to fetch data
 * @param {Array} options.dependencies - Dependencies that should trigger refetching (shallow compared)
 * @param {boolean} options.loadOnMount - Whether to load data when component mounts
 * @param {string} options.dataType - Type of data being fetched (for HIPAA logging)
 * @param {string} options.userId - User identifier for HIPAA logging
 * @param {string} options.accessPurpose - Purpose for accessing this data
 * @param {Object} options.initialData - Initial data to use before fetch completes
 * @param {Function} options.onSuccess - Callback when fetch succeeds
 * @param {number} options.pollingInterval - Interval in ms to poll for updates (0 = no polling)
 * @returns {Object} Data state and control functions
 */
const useHipaaData = (options) => {
  const {
    fetchFunction,
    dependencies = [],
    loadOnMount = true,
    dataType = "unknown",
    userId = "",
    accessPurpose = "Viewing data",
    initialData = null,
    onSuccess,
    pollingInterval = 0,
  } = options;

  // State for data
  const [data, setData] = useState(initialData);

  // Track if data has been loaded at least once
  const [isInitialized, setIsInitialized] = useState(false);

  // Track polling interval timer
  const pollingTimerRef = useRef(null);

  // Track previous dependencies for comparison
  const prevDepsRef = useRef(dependencies);

  // Function to clear previous dependencies
  const { loading, execute, clearError } = useAsyncOperation({
    componentId: "HipaaData",
    userId,
    onSuccess: (result) => {
      if (onSuccess) onSuccess(result);
    },
  });

  // Memoize dependencies to avoid unnecessary recalculations
  const depsString = useMemo(
    () => JSON.stringify(dependencies),
    [dependencies]
  );

  // Check if dependencies have changed
  const haveDepsChanged = useCallback(() => {
    const prevDepsString = JSON.stringify(prevDepsRef.current);
    return prevDepsString !== depsString;
  }, [depsString]);

  // Function to fetch data with HIPAA compliance
  const fetchData = useCallback(async () => {
    return execute(async () => {
      // Log data access start for HIPAA compliance
      try {
        await hipaaComplianceService.createAuditLog("DATA_ACCESS_START", {
          dataType,
          userId,
          accessPurpose,
          timestamp: new Date().toISOString(),
          source: "useHipaaData hook",
        });
      } catch (loggingError) {
        console.error("Failed to log data access start:", loggingError);
        // Continue with fetch even if logging fails
      }

      // Fetch the data
      const result = await fetchFunction();

      // Update state
      setData(result);
      setIsInitialized(true);

      // Log data access success
      try {
        await hipaaComplianceService.createAuditLog("DATA_ACCESS_SUCCESS", {
          dataType,
          userId,
          accessPurpose,
          timestamp: new Date().toISOString(),
          resultSize: Array.isArray(result) ? result.length : "single object",
        });
      } catch (loggingError) {
        console.error("Failed to log data access success:", loggingError);
      }

      return result;
    });
  }, [execute, fetchFunction, dataType, userId, accessPurpose]);

  // Setup polling if needed
  const setupPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    // If polling interval is set, create new interval
    if (pollingInterval > 0) {
      pollingTimerRef.current = setInterval(() => {
        fetchData().catch((error) => {
          console.error("Polling fetch error:", error);
          // Don't stop polling on error, just log it
        });
      }, pollingInterval);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [pollingInterval, fetchData]);

  // Effect for initial load and dependency-based refetching
  useEffect(() => {
    // Update previous dependencies
    prevDepsRef.current = dependencies;

    // If dependencies changed or initial load is needed
    if ((loadOnMount && !isInitialized) || haveDepsChanged()) {
      fetchData();
    }

    // Setup polling
    const cleanup = setupPolling();

    return () => {
      cleanup();
    };
  }, [
    depsString,
    fetchData,
    haveDepsChanged,
    loadOnMount,
    isInitialized,
    setupPolling,
  ]);

  // Manually refetch data
  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  // Reset data to initial state
  const reset = useCallback(() => {
    setData(initialData);
    setIsInitialized(false);
    clearError();

    // Log data reset for HIPAA compliance
    try {
      hipaaComplianceService.createAuditLog("DATA_RESET", {
        dataType,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (loggingError) {
      console.error("Failed to log data reset:", loggingError);
    }
  }, [initialData, clearError, dataType, userId]);

  return {
    data,
    loading,
    isInitialized,
    refetch,
    reset,
    clearError,
  };
};

export default useHipaaData;
