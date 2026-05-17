// src/components/FilteredSubsetCreator.js
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  Filter,
  Calendar,
  Users,
  ChevronDown,
  Check,
  AlertCircle,
  Database,
  DollarSign,
  Save,
  RefreshCw,
} from "lucide-react";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import mockDataService from "../services/mockDataService.js";
import LoadingSpinner from "./ui/LoadingSpinner.js";
import EnhancedPurchaseButton from "./DatasetPurchaseButton.js";

// State for filter options
const FilteredSubsetCreator = ({
  datasetId,
  onSubsetCreated,
  onSubsetPurchase,
  onCancel,
  className = "",
}) => {
  const userId = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);

  // State for dataset info
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filter criteria
  const [filters, setFilters] = useState({
    ageRange: { min: "", max: "" },
    gender: "all",
    timeRange: { start: "", end: "" },
    conditions: [],
    recordTypes: [],
  });

  // State for preview results
  const [previewResults, setPreviewResults] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // State for pricing
  const [basePrice, setBasePrice] = useState(0);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [priceFactors, setPriceFactors] = useState({
    recordCount: 1.0,
    timeRange: 1.0,
    demographic: 1.0,
  });

  // State for saving subset
  const [subsetName, setSubsetName] = useState("");
  const [savedSubset, setSavedSubset] = useState(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  // Calculate price based on selected criteria and record count
  const calculatePrice = useCallback(
    (recordCount, filterCriteria) => {
      if (!datasetInfo) return;

      // Start with the base price
      let price = basePrice;
      const factors = { recordCount: 1.0, timeRange: 1.0, demographic: 1.0 };

      // Factor 1: Record count ratio
      const recordCountRatio = recordCount / datasetInfo.recordCount;
      factors.recordCount = Math.max(0.25, recordCountRatio); // Minimum 25% of base price

      // Factor 2: Time range specificity
      const hasTimeFilter =
        filterCriteria.timeRange.start || filterCriteria.timeRange.end;
      if (hasTimeFilter) {
        let timeStart = filterCriteria.timeRange.start
          ? new Date(filterCriteria.timeRange.start)
          : new Date(datasetInfo.timeRange.start);

        let timeEnd = filterCriteria.timeRange.end
          ? new Date(filterCriteria.timeRange.end)
          : new Date(datasetInfo.timeRange.end);

        // Calculate time range ratio
        const selectedTimeSpan = timeEnd - timeStart;
        const totalTimeSpan =
          new Date(datasetInfo.timeRange.end) -
          new Date(datasetInfo.timeRange.start);
        const timeRatio = selectedTimeSpan / totalTimeSpan;

        factors.timeRange = Math.max(0.3, timeRatio); // Minimum 30% for time specificity
      }

      // Factor 3: Demographic specificity (age range, gender)
      if (
        filterCriteria.gender !== "all" ||
        filterCriteria.ageRange.min ||
        filterCriteria.ageRange.max
      ) {
        factors.demographic = 0.15; // 15% premium for demographic filtering
      }

      // Apply all factors to base price
      price =
        basePrice *
        factors.recordCount *
        factors.timeRange *
        factors.demographic;

      // Round to 4 decimal places for ETH price
      const finalPrice = Math.max(0.001, Math.round(price * 10000) / 10000);

      setPriceFactors(factors);
      setCalculatedPrice(finalPrice);
    },
    [datasetInfo, basePrice]
  );

  // Load dataset info
  useEffect(() => {
    const loadDatasetInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Log the access attempt
        await hipaaComplianceService.createAuditLog("SUBSET_CREATOR_INIT", {
          datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          action: "INIT",
        });

        // Get dataset details from mock service
        const dataset = await mockDataService.getDatasetDetails(datasetId);
        setDatasetInfo(dataset);

        // Get conditions and record types available for this dataset

        // Set initial filter options based on dataset
        setFilters((prev) => ({
          ...prev,
          conditions: [],
          recordTypes: [],
          // Set default time range based on dataset's time span
          timeRange: {
            start: dataset.timeRange?.start || "",
            end: dataset.timeRange?.end || "",
          },
        }));

        // Set base price from dataset
        setBasePrice(parseFloat(dataset.price));
        setCalculatedPrice(parseFloat(dataset.price));
      } catch (err) {
        console.error("Error loading dataset details:", err);
        setError("Failed to load dataset details. Please try again.");

        // Log the error
        hipaaComplianceService.createAuditLog("SUBSET_CREATOR_ERROR", {
          datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          action: "LOAD_ERROR",
          error: err.message,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDatasetInfo();
  }, [datasetId, userId, userRole]);

  // Handle filter changes
  const handleFilterChange = (category, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      // Handle nested objects like ageRange and timeRange
      if (category.includes(".")) {
        const [parentKey, childKey] = category.split(".");
        newFilters[parentKey] = {
          ...newFilters[parentKey],
          [childKey]: value,
        };
      } else if (Array.isArray(prev[category])) {
        // Handle array values (multi-select)
        if (prev[category].includes(value)) {
          newFilters[category] = prev[category].filter(
            (item) => item !== value
          );
        } else {
          newFilters[category] = [...prev[category], value];
        }
      } else {
        // Handle simple values
        newFilters[category] = value;
      }

      return newFilters;
    });

    // Reset preview when filters change
    setPreviewResults(null);
  };

  // Preview filtered subset
  const previewFilteredSubset = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);

      // Log preview attempt
      await hipaaComplianceService.createAuditLog("SUBSET_PREVIEW", {
        datasetId,
        filters: JSON.stringify(filters),
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PREVIEW",
      });

      // Get preview from mock service
      const previewData = await mockDataService.previewFilteredSubset(
        datasetId,
        filters
      );

      setPreviewResults(previewData);

      // Calculate price based on filter criteria and resulting record count
      calculatePrice(previewData.recordCount, filters);
    } catch (err) {
      console.error("Error previewing filtered subset:", err);
      setPreviewError("Failed to preview filtered subset. Please try again.");

      // Log the error
      hipaaComplianceService.createAuditLog("SUBSET_PREVIEW_ERROR", {
        datasetId,
        filters: JSON.stringify(filters),
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PREVIEW_ERROR",
        error: err.message,
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [datasetId, filters, userId, userRole, calculatePrice]);

  // Save filtered subset
  const saveFilteredSubset = useCallback(async () => {
    if (!subsetName.trim()) {
      setPreviewError("Please enter a name for your subset.");
      return;
    }

    if (!previewResults) {
      setPreviewError("Please preview your filtered subset first.");
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      // Create subset metadata
      const subsetMetadata = {
        parentDatasetId: datasetId,
        name: subsetName,
        filters: filters,
        recordCount: previewResults.recordCount,
        price: calculatedPrice,
        createdAt: new Date().toISOString(),
        userId,
        userRole,
      };

      // Log subset creation attempt
      await hipaaComplianceService.createAuditLog("SUBSET_CREATION", {
        datasetId,
        subsetName,
        filters: JSON.stringify(filters),
        recordCount: previewResults.recordCount,
        price: calculatedPrice,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "CREATE",
      });

      // Create subset in mock service
      const savedSubsetData = await mockDataService.createFilteredSubset(
        datasetId,
        subsetMetadata
      );

      setSavedSubset(savedSubsetData);

      // Notify parent component
      if (onSubsetCreated) {
        onSubsetCreated(savedSubsetData);
      }
    } catch (err) {
      console.error("Error saving filtered subset:", err);
      setPreviewError("Failed to save filtered subset. Please try again.");

      // Log the error
      hipaaComplianceService.createAuditLog("SUBSET_CREATION_ERROR", {
        datasetId,
        subsetName,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "CREATE_ERROR",
        error: err.message,
      });
    } finally {
      setPreviewLoading(false);
    }
  }, [
    subsetName,
    previewResults,
    datasetId,
    filters,
    calculatedPrice,
    userId,
    userRole,
    onSubsetCreated,
  ]);

  // Handle purchase

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-2 text-gray-600">
            Loading dataset information...
          </span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle size={24} className="mr-2" />
          <h3 className="text-lg font-medium">Error</h3>
        </div>
        <p className="text-gray-700 mb-4">{error}</p>
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mr-2"
          >
            Cancel
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h2 className="text-xl font-semibold">Create Custom Data Subset</h2>
        <p className="text-sm text-blue-100 mt-1">
          {datasetInfo?.title || "Dataset"} - Filter and purchase specific
          records
        </p>
      </div>

      <div className="p-6">
        {/* Dataset summary */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <Database className="text-blue-500 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-blue-800">Dataset Overview</h3>
              <p className="text-sm text-blue-700 mt-1">
                {datasetInfo?.recordCount?.toLocaleString() || 0} total records
                {datasetInfo?.timeRange
                  ? ` from ${new Date(datasetInfo.timeRange.start).toLocaleDateString()} to ${new Date(datasetInfo.timeRange.end).toLocaleDateString()}`
                  : ""}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Base price: {basePrice} ETH
              </p>
            </div>
          </div>
        </div>

        {/* Filter form */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Filter size={18} className="mr-2 text-gray-500" />
            Filtering Criteria
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demographic filters */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <Users size={16} className="mr-2 text-gray-500" />
                Demographics
              </h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.gender}
                  onChange={(e) => handleFilterChange("gender", e.target.value)}
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown/Undisclosed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Min Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={filters.ageRange.min}
                      onChange={(e) =>
                        handleFilterChange("ageRange.min", e.target.value)
                      }
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Max Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={filters.ageRange.max}
                      onChange={(e) =>
                        handleFilterChange("ageRange.max", e.target.value)
                      }
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time range filters */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <Calendar size={16} className="mr-2 text-gray-500" />
                Time Period
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={filters.timeRange.start}
                    onChange={(e) =>
                      handleFilterChange("timeRange.start", e.target.value)
                    }
                    min={
                      datasetInfo?.timeRange?.start
                        ? datasetInfo.timeRange.start.substring(0, 10)
                        : undefined
                    }
                    max={
                      datasetInfo?.timeRange?.end
                        ? datasetInfo.timeRange.end.substring(0, 10)
                        : undefined
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={filters.timeRange.end}
                    onChange={(e) =>
                      handleFilterChange("timeRange.end", e.target.value)
                    }
                    min={
                      datasetInfo?.timeRange?.start
                        ? datasetInfo.timeRange.start.substring(0, 10)
                        : undefined
                    }
                    max={
                      datasetInfo?.timeRange?.end
                        ? datasetInfo.timeRange.end.substring(0, 10)
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Quick select buttons */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quick Select
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      // Get dates for previous 12 months
                      const end = new Date();
                      const start = new Date();
                      start.setFullYear(start.getFullYear() - 1);

                      handleFilterChange(
                        "timeRange.start",
                        start.toISOString().substring(0, 10)
                      );
                      handleFilterChange(
                        "timeRange.end",
                        end.toISOString().substring(0, 10)
                      );
                    }}
                  >
                    Last 12 Months
                  </button>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      // Get dates for years 2020-2022
                      handleFilterChange("timeRange.start", "2020-01-01");
                      handleFilterChange("timeRange.end", "2022-12-31");
                    }}
                  >
                    2020-2022
                  </button>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      // Clear time range filters
                      handleFilterChange("timeRange.start", "");
                      handleFilterChange("timeRange.end", "");
                    }}
                  >
                    All Time
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced filters (conditions, record types) - collapsible */}
          <div className="mt-4">
            <details className="group">
              <summary className="flex items-center cursor-pointer py-2">
                <ChevronDown
                  className="mr-2 text-gray-500 transition-transform group-open:rotate-180"
                  size={16}
                />
                <span className="font-medium text-gray-700">
                  Advanced Filters
                </span>
              </summary>

              <div className="mt-3 pl-6 border-l-2 border-gray-200">
                {/* Conditions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conditions/Diagnoses
                  </label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {datasetInfo?.conditions?.slice(0, 6).map((condition) => (
                      <label
                        key={condition.id}
                        className="flex items-center text-sm"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-2"
                          checked={filters.conditions.includes(condition.id)}
                          onChange={() =>
                            handleFilterChange("conditions", condition.id)
                          }
                        />
                        {condition.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Record Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Record Types
                  </label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {datasetInfo?.recordTypes?.slice(0, 6).map((type) => (
                      <label
                        key={type.id}
                        className="flex items-center text-sm"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-2"
                          checked={filters.recordTypes.includes(type.id)}
                          onChange={() =>
                            handleFilterChange("recordTypes", type.id)
                          }
                        />
                        {type.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Preview and price calculation */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <DollarSign size={18} className="mr-2 text-gray-500" />
              Subset Preview & Pricing
            </h3>

            <button
              onClick={previewFilteredSubset}
              disabled={previewLoading}
              className="mt-2 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewLoading ? (
                <>
                  <LoadingSpinner size="small" color="white" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="mr-2" />
                  Calculate Subset
                </>
              )}
            </button>
          </div>

          {/* Preview error */}
          {previewError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
              <AlertCircle size={20} className="text-red-500 mr-2" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Preview results */}
          {previewResults && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Subset Statistics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Records:</span>
                      <span className="font-medium">
                        {previewResults.recordCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">% of Full Dataset:</span>
                      <span className="font-medium">
                        {Math.round(
                          (previewResults.recordCount /
                            datasetInfo.recordCount) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unique Patients:</span>
                      <span className="font-medium">
                        {previewResults.patientCount?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Pricing</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-medium">{basePrice} ETH</span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Record Ratio Factor:</span>
                      <span>x{priceFactors.recordCount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Time Specificity Factor:</span>
                      <span>x{priceFactors.timeRange.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Demographic Filter Factor:</span>
                      <span>x{priceFactors.demographic.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-2 mt-2"></div>

                    <div className="flex justify-between font-bold text-blue-700">
                      <span>Final Price:</span>
                      <span>{calculatedPrice} ETH</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save and purchase */}
        {previewResults && (
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Save size={18} className="mr-2 text-gray-500" />
              Save & Purchase
            </h3>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subset Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={subsetName}
                  onChange={(e) => setSubsetName(e.target.value)}
                  placeholder="Enter a name for your filtered subset"
                  disabled={purchaseInProgress} // Disable during purchase
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 ${purchaseInProgress ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={purchaseInProgress} // Disable during purchase
                >
                  Cancel
                </button>

                <button
                  onClick={saveFilteredSubset}
                  disabled={
                    previewLoading ||
                    !subsetName.trim() ||
                    !!savedSubset ||
                    purchaseInProgress // Disable if saved
                  }
                  className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savedSubset ? (
                    <div className="flex items-center">
                      <Check size={16} className="mr-2" />
                      Saved
                    </div>
                  ) : (
                    "Save Subset"
                  )}
                </button>

                <EnhancedPurchaseButton
                  dataset={{
                    id: savedSubset?.id || `filtered-${datasetId}`,
                    price: calculatedPrice.toString(),
                    title: subsetName || "Filtered Subset",
                  }}
                  onPurchaseStart={() => setPurchaseInProgress(true)}
                  onPurchaseComplete={(datasetId, result) => {
                    if (onSubsetPurchase) {
                      onSubsetPurchase({
                        id: savedSubset?.id || `filtered-${datasetId}`,
                        name: subsetName,
                        price: calculatedPrice.toString(),
                        recordCount: previewResults.recordCount,
                        filters: filters,
                        parentDatasetId: datasetId,
                        transactionHash: result.transactionHash,
                      });
                    }
                    setPurchaseInProgress(false);
                  }}
                  onPurchaseError={() => setPurchaseInProgress(false)}
                  disabled={!savedSubset || purchaseInProgress} // Disable if not saved OR purchase is in progress
                />

                {purchaseInProgress && (
                  <div className="ml-2 flex items-center text-blue-600">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

FilteredSubsetCreator.propTypes = {
  datasetId: PropTypes.string.isRequired,
  onSubsetCreated: PropTypes.func,
  onSubsetPurchase: PropTypes.func,
  onCancel: PropTypes.func,
  className: PropTypes.string,
};

export default FilteredSubsetCreator;
