// client/src/components/HealthDataDashboard.js
import React, { useCallback, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  BarChart,
  FileText,
  Download,
  Upload,
  Shield,
  Filter,
  Search,
} from "lucide-react";
import useHipaaData from "../hooks/useHipaaData.js";
import useHipaaFormState from "../hooks/useHipaaFormState.js";
import useAsyncOperation from "../hooks/useAsyncOperation.js";
import { useError } from "../contexts/ErrorContext.js";
import ErrorDisplay from "./ui/ErrorDisplay.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

// Fetch health data
const HealthDataDashboard = () => {
  const userRole = useSelector((state) => state.role.role);
  const userId = useSelector((state) => state.wallet.address);
  const { addError, removeError, errors } = useError();

  // Local state
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // Define fetch function for health data
  const fetchHealthData = useCallback(async () => {
    // In a real app, this would call an API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "1",
            title: "Annual Checkup",
            date: "2025-01-15",
            category: "General Health",
            recordCount: 24,
            format: "JSON",
          },
          {
            id: "2",
            title: "Blood Test Results",
            date: "2025-02-20",
            category: "Laboratory",
            recordCount: 15,
            format: "CSV",
          },
          {
            id: "3",
            title: "Vaccination Records",
            date: "2025-03-05",
            category: "Immunization",
            recordCount: 8,
            format: "PDF",
          },
        ]);
      }, 1000);
    });
  }, []);

  // Use our HIPAA data hook for fetching
  const {
    data: healthRecords,
    loading: recordsLoading,
    refetch: refetchRecords,
    isInitialized: recordsInitialized,
  } = useHipaaData({
    fetchFunction: fetchHealthData,
    dependencies: [userRole], // Refetch if user role changes
    loadOnMount: true,
    dataType: "health_records",
    userId,
    accessPurpose: "Viewing health records dashboard",
    initialData: [],
    pollingInterval: 0,
  });

  // Use our form state hook for filters
  const {
    formState: filters,
    handleChange: handleFilterChange,
    setFieldValue: setFilterValue,
    reset: resetFilters,
  } = useHipaaFormState(
    {
      category: "All",
      dateRange: "all",
      searchTerm: "",
      sortBy: "date",
    },
    {
      sanitizeField: (value, fieldName) =>
        hipaaComplianceService.sanitizeInputValue(value, fieldName),
      hipaaService: hipaaComplianceService,
      userIdentifier: userId,
      formType: "health_data_filters",
    }
  );

  // Use our async operation hook for download operations
  const { loading: downloadLoading, execute: executeDownload } =
    useAsyncOperation({
      componentId: "HealthDataDashboard_Download",
      userId,
      onSuccess: (result) => {
        console.log("Download successful", result);
      },
      onError: (error) => {
        addError("download", error);
      },
    });

  // Handle record download
  const handleDownloadRecord = useCallback(
    (recordId) => {
      executeDownload(async () => {
        // In a real app, this would trigger a file download
        await hipaaComplianceService.createAuditLog("RECORD_DOWNLOAD", {
          action: "DOWNLOAD",
          recordId,
          timestamp: new Date().toISOString(),
          userId,
        });

        console.log(`Downloading record ${recordId}`);
        // Simulate download time
        await new Promise((resolve) => setTimeout(resolve, 1500));

        return { success: true, recordId };
      });
    },
    [executeDownload, userId]
  );

  // Apply filters to records
  const filteredRecords = useMemo(() => {
    if (!healthRecords || healthRecords.length === 0) {
      return [];
    }

    return healthRecords
      .filter((record) => {
        // Apply category filter
        if (
          filters.category !== "All" &&
          record.category !== filters.category
        ) {
          return false;
        }

        // Apply search filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const titleMatch = record.title?.toLowerCase().includes(searchLower);
          const categoryMatch = record.category
            ?.toLowerCase()
            .includes(searchLower);

          if (!titleMatch && !categoryMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Apply sorting
        if (filters.sortBy === "date") {
          return new Date(b.date) - new Date(a.date);
        } else if (filters.sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [healthRecords, filters]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Health Records Dashboard
      </h1>

      {/* Error display for download errors */}
      {errors.download && (
        <ErrorDisplay
          error={errors.download}
          onDismiss={() => removeError("download")}
          onRetry={() => handleDownloadRecord(selectedRecordId)}
          className="mb-6"
        />
      )}

      {/* Filters section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="text-blue-500" size={20} />
          <h2 className="text-lg font-medium">Filter Records</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="General Health">General Health</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Immunization">Immunization</option>
              <option value="Radiology">Radiology</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Sort By
            </label>
            <select
              id="sortBy"
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="date">Date (Newest First)</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="searchTerm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <div className="relative">
              <input
                id="searchTerm"
                name="searchTerm"
                type="text"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Search records..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* HIPAA compliance reminder */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Shield className="text-blue-500 flex-shrink-0 mt-1" size={20} />
        <div>
          <h3 className="font-medium text-blue-700">HIPAA Compliant Access</h3>
          <p className="text-sm text-blue-600">
            All data access and actions are logged and protected in accordance
            with HIPAA regulations. Your data privacy and security are our top
            priority.
          </p>
        </div>
      </div>

      {/* Records listing */}
      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Health Records
            </h2>
            <button
              onClick={() => refetchRecords()}
              disabled={recordsLoading}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md ${
                recordsLoading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {recordsLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {recordsLoading && !recordsInitialized ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                {healthRecords.length === 0
                  ? "You don't have any health records yet"
                  : "No records match your current filters"}
              </p>
              {healthRecords.length === 0 && (
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto">
                  <Upload size={16} />
                  <span>Upload Health Record</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mb-3 sm:mb-0">
                    <h3 className="font-medium text-lg">{record.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {record.category}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {record.format}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center">
                        <BarChart size={12} className="mr-1" />
                        {record.recordCount} entries
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Last updated: {new Date(record.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        handleDownloadRecord(record.id);
                      }}
                      disabled={downloadLoading}
                      className={`flex items-center gap-1 px-3 py-2 border ${
                        downloadLoading
                          ? "border-gray-300 text-gray-400 cursor-not-allowed"
                          : "border-blue-500 text-blue-600 hover:bg-blue-50"
                      } rounded-md`}
                    >
                      {downloadLoading && selectedRecordId === record.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      ) : (
                        <Download size={16} />
                      )}
                      <span>Download</span>
                    </button>

                    <button className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthDataDashboard;
