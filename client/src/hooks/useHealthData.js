// src/hooks/useHealthData.js

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import generateMockHealthRecords from "../mockData/mockHeatlhRecords.js";

const useHealthData = (options = {}) => {
  const {
    initialFilters = {},
    loadOnMount = true,
    useMockData = false,
  } = options;

  const [healthData, setHealthData] = useState([]);
  const [userRecords, setUserRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalCount, setTotalCount] = useState(0);
  const [apiFailure, setApiFailure] = useState(false);

  // Function to load user's storage files
  const loadUserStorageFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      if (!useMockData && token) {
        try {
          // Try loading real data from storage API
          const response = await axios.get("/api/storage/files", {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000, // 8 second timeout
          });

          console.log("Storage API response:", response.data);

          // Check if we have files in the response
          if (
            response.data &&
            (response.data.files ||
              (response.data.results && response.data.results.length > 0))
          ) {
            // Handle different response formats
            const files = response.data.files || response.data.results || [];
            console.log("Files loaded from API:", files.length);

            if (files.length > 0) {
              // Map the storage files to match the health records format
              const formattedRecords = files.map((file) => ({
                id: file._id || file.id,
                title: file.fileName || file.name || "Untitled Record",
                description:
                  file.description ||
                  `${file.category || "Health"} data record`,
                category: file.category || "Health",
                verified: file.registeredOnChain || false,
                anonymized: file.anonymized || !file.containsPHI,
                format:
                  file.fileType ||
                  file.format ||
                  (file.mimeType
                    ? file.mimeType.split("/")[1].toUpperCase()
                    : "PDF"),
                recordCount: 1,
                uploadDate:
                  file.createdAt || file.uploadDate || new Date().toISOString(),
                fileSize: file.fileSize || 0,
                tags: file.tags || [],
                shared: file.shared || false,
                owner: file.owner,
              }));

              setUserRecords(formattedRecords);
              setHealthData(formattedRecords);
              setTotalCount(formattedRecords.length);
              setLoading(false);
              return; // Exit early with real data
            }
          }
        } catch (apiError) {
          console.warn(
            "API request failed, using mock data:",
            apiError.message
          );
          setApiFailure(true);
          // Continue to mock data
        }
      }

      console.log("Using mock health records");
      const mockRecords = generateMockHealthRecords(10);
      setUserRecords(mockRecords);
      setHealthData(mockRecords);
      setTotalCount(mockRecords.length);
    } catch (err) {
      console.error("Error loading health data:", err);
      setError(err.message || "Could not load health records");

      // Fallback to mock data even on error
      const fallbackMockRecords = generateMockHealthRecords(5);
      setUserRecords(fallbackMockRecords);
      setHealthData(fallbackMockRecords);
      setTotalCount(fallbackMockRecords.length);
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

  useEffect(() => {
    if (loadOnMount) {
      loadUserStorageFiles();
    }
  }, [loadOnMount, loadUserStorageFiles]);

  // Add helper functions needed for Dashboard and Storage pages
  const getRecordDetails = useCallback(
    async (recordId) => {
      if (!recordId) return null;

      // First check if we have it locally
      const localRecord = userRecords.find((r) => r.id === recordId);
      if (localRecord) return localRecord;

      // If not found locally, try API
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await axios.get(`/api/storage/files/${recordId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data && response.data.file) {
            // Format the response
            return {
              id: response.data.file._id || response.data.file.id,
              title: response.data.file.fileName || response.data.file.name,
              description: response.data.file.description,
              category: response.data.file.category || "Health",
              // ...other fields
            };
          }
        }
        return null;
      } catch (error) {
        console.error("Error fetching record details:", error);
        return null;
      }
    },
    [userRecords]
  );

  const downloadRecord = useCallback(
    async (recordId) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return { success: false, error: "Not authenticated" };

        // Make API call to download endpoint
        const response = await axios.get(
          `/api/storage/files/${recordId}?content=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
          }
        );

        // Find record to get file name
        const record = userRecords.find((r) => r.id === recordId);
        const fileName = record?.title || `health-record-${recordId}.pdf`;

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();

        return { success: true };
      } catch (error) {
        console.error("Error downloading record:", error);
        return { success: false, error: error.message };
      }
    },
    [userRecords]
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
    loadUserStorageFiles,
    updateFilter: (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    resetFilters: () => {
      setFilters(initialFilters);
    },
    refreshData: loadUserStorageFiles,
  };
};

export default useHealthData;
