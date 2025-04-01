// src/hooks/useHealthData.js
// Update this file to use mock data when API fails

import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import apiService from "../services/apiService.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import generateMockHealthRecords from "../mockData/mockHeatlhRecords.js";

/**
 * Custom hook for managing health data with fallback to mock data
 */
const useHealthData = (options = {}) => {
  const {
    initialFilters = {},
    loadOnMount = true,
    useMockData = false, // Added option to force mock data
  } = options;

  const dispatch = useDispatch();
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalCount, setTotalCount] = useState(0);
  const [apiFailure, setApiFailure] = useState(false);

  // Function to load health records from API or mock data
  const loadHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Real API call
      const response = await apiService.get("/api/data/records", filters);

      if (!response.success || !response.data || response.data.length === 0) {
        // API returned no data or failed
        setApiFailure(true);
        throw new Error("No data returned from API");
      }

      setHealthData(response.data);
      setTotalCount(response.total || response.data.length);
      setApiFailure(false);
    } catch (err) {
      console.error("Failed to load health data from API:", err);
      setApiFailure(true);
      setError("Failed to load health records");

      // IMPORTANT: Generate and use mock data when API fails
      const mockData = generateMockHealthRecords();
      setHealthData(mockData);
      setTotalCount(mockData.length);

      // Silently remove those error notifications after using mock data
      dispatch(
        addNotification({
          type: "info",
          message: "Using mock health data for demonstration",
          duration: 3000,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [filters, dispatch]);

  // Function to force using mock data
  const forceMockData = useCallback(() => {
    const mockData = generateMockHealthRecords();
    setHealthData(mockData);
    setTotalCount(mockData.length);
    setApiFailure(true);
    setError(null);

    dispatch(
      addNotification({
        type: "info",
        message: "Using mock health data for demonstration",
        duration: 3000,
      })
    );
  }, [dispatch]);

  // Load data initially if requested
  useEffect(() => {
    if (loadOnMount || useMockData) {
      if (useMockData) {
        forceMockData();
      } else {
        loadHealthData();
      }
    }
  }, [loadOnMount, useMockData, loadHealthData, forceMockData]);

  // Update a specific filter
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset filters to initial state
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Purchase data (mock implementation)
  const purchaseData = useCallback(
    async (id) => {
      try {
        setLoading(true);

        if (apiFailure) {
          // Mock purchase
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Update the mock data to show as purchased
          setHealthData((prevData) =>
            prevData.map((item) =>
              item.id === id ? { ...item, purchased: true } : item
            )
          );

          return { success: true };
        }

        // Real purchase API call (if API is working)
        const response = await apiService.post("/api/data/purchase", {
          dataId: id,
        });
        return response;
      } catch (err) {
        console.error("Purchase error:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFailure]
  );

  // Get health data details (mock implementation)
  const getHealthDataDetails = useCallback(
    async (id) => {
      try {
        setLoading(true);

        if (apiFailure) {
          // Find the data in our mock data
          const record = healthData.find((item) => item.id === id);

          if (!record) {
            throw new Error("Record not found");
          }

          // Add additional mock details
          const enhancedRecord = {
            ...record,
            detailedDescription: `Detailed information about ${record.title}. This record contains comprehensive health data related to ${record.category.toLowerCase()} collected on ${new Date(record.uploadDate).toLocaleDateString()}.`,
            provider: "Healthmint Medical Center",
            downloadAvailable: true,
            lastUpdated: new Date().toISOString(),
            viewCount: Math.floor(Math.random() * 100),
            fileSize: `${(record.recordCount / 1000).toFixed(1)} MB`,
            // Add more detailed fields as needed
          };

          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 800));

          return enhancedRecord;
        }

        // Real API call (if API is working)
        const response = await apiService.get(`/api/data/record/${id}`);
        return response.data;
      } catch (err) {
        console.error("Failed to get record details:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFailure, healthData]
  );

  return {
    healthData,
    loading,
    error,
    filters,
    totalCount,
    apiFailure,
    loadHealthData,
    updateFilter,
    resetFilters,
    purchaseData,
    getHealthDataDetails,
    forceMockData, // Expose this to allow manually switching to mock data
  };
};

export default useHealthData;
