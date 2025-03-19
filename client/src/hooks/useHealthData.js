// src/hooks/useHealthData.js
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import apiService from "../services/apiService";
import { addNotification } from "../redux/slices/notificationSlice";

/**
 * Custom hook to manage health data operations
 *
 * @param {Object} options - Hook configuration
 * @param {Object} options.initialFilters - Initial filter values
 * @param {boolean} options.loadOnMount - Whether to load data when component mounts
 * @returns {Object} Health data state and operations
 */
const useHealthData = (options = {}) => {
  const {
    initialFilters = {
      minAge: "",
      maxAge: "",
      verifiedOnly: false,
      category: "All",
      priceRange: "all",
    },
    loadOnMount = true,
  } = options;

  const dispatch = useDispatch();
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * Fetch health data from API based on current filters
   */
  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare query parameters, filtering out undefined values
      const params = {
        minAge: filters.minAge || undefined,
        maxAge: filters.maxAge || undefined,
        verified: filters.verifiedOnly || undefined,
        category: filters.category === "All" ? undefined : filters.category,
        priceRange:
          filters.priceRange === "all" ? undefined : filters.priceRange,
      };

      // Use API service for data fetching
      const response = await apiService.get("/api/data/browse", params);

      if (response?.data) {
        setHealthData(response.data);
        setTotalCount(response.total || response.data.length);
      } else {
        setHealthData([]);
        setTotalCount(0);
      }
    } catch (err) {
      const errorMessage =
        err.message || "Failed to load health data. Please try again later.";
      setError(errorMessage);

      dispatch(
        addNotification({
          type: "error",
          message: errorMessage,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [filters, dispatch]);

  /**
   * Update filters and re-fetch data
   * @param {string} name - Filter name
   * @param {any} value - Filter value
   */
  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  /**
   * Update multiple filters at once
   * @param {Object} newFilters - New filter values
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * Reset filters to initial values
   */
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  /**
   * Handle purchase of health data
   * @param {string} id - Data ID to purchase
   * @returns {Promise<boolean>} Success status
   */
  const purchaseData = useCallback(
    async (id) => {
      try {
        setLoading(true);

        // Call purchase API
        await apiService.post("/api/data/purchase", {
          dataId: id,
          timestamp: new Date().toISOString(),
        });

        // Show success notification
        dispatch(
          addNotification({
            type: "success",
            message: "Data purchased successfully!",
          })
        );

        // Refresh data to show updated state
        await fetchHealthData();
        return true;
      } catch (error) {
        console.error("Error purchasing data:", error);
        const errorMessage =
          error.message || "Failed to complete purchase. Please try again.";
        setError(errorMessage);

        dispatch(
          addNotification({
            type: "error",
            message: errorMessage,
          })
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, fetchHealthData]
  );

  /**
   * Get details for a specific health data record
   * @param {string} id - Data ID to fetch
   * @returns {Promise<Object>} Health data details
   */
  const getHealthDataDetails = useCallback(
    async (id) => {
      try {
        setLoading(true);
        const response = await apiService.get(`/api/data/${id}`);
        return response.data;
      } catch (error) {
        const errorMessage = error.message || "Failed to fetch data details";
        dispatch(
          addNotification({
            type: "error",
            message: errorMessage,
          })
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [dispatch]
  );

  // Load data on mount if requested
  useEffect(() => {
    if (loadOnMount) {
      fetchHealthData();
    }
  }, [loadOnMount, fetchHealthData]);

  // Return hook API
  return {
    // State
    healthData,
    loading,
    error,
    filters,
    totalCount,

    // Actions
    fetchHealthData,
    updateFilter,
    updateFilters,
    resetFilters,
    purchaseData,
    getHealthDataDetails,
    clearError: () => setError(null),
  };
};

export default useHealthData;
