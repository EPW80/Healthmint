// src/components/DataBrowser.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import useHealthData from "../hooks/useHealthData.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import DataBrowserView from "./DataBrowserView.js";

// Categories from backend
const CATEGORIES = [
  "All",
  "General Health",
  "Cardiology",
  "Physical Exam",
  "Laboratory",
  "Immunization",
  "Genetics",
  "Psychology",
  "Dental",
  "Ophthalmology",
  "Allergy",
  "Neurology",
  "Physical Therapy",
  "Nutrition",
  "Dermatology",
  "Orthopedics",
  "Pulmonology",
  "Endocrinology",
  "Obstetrics",
  "Pediatrics",
  "Sports Medicine",
];

// Study types for research-specific filtering
const STUDY_TYPES = [
  "All Types",
  "Clinical Trial",
  "Observational",
  "Longitudinal",
  "Cross-sectional",
  "Case Control",
  "Cohort",
  "Meta-analysis",
  "Retrospective",
  "Prospective",
];

// Data formats available
const DATA_FORMATS = [
  "All Formats",
  "CSV",
  "JSON",
  "PDF",
  "DICOM",
  "HL7",
  "FHIR",
  "Imaging",
];

/**
 * DataBrowser Container Component
 *
 * Manages state and data operations for browsing health datasets
 */
const DataBrowser = ({ onPurchase, onDatasetSelect }) => {
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.role.role);

  // Get health data state and functionality from hook
  const {
    healthData,
    loading,
    error,
    filters,
    totalCount,
    updateFilter,
    resetFilters,
    purchaseData,
    getHealthDataDetails,
  } = useHealthData({
    initialFilters: {
      minAge: "",
      maxAge: "",
      verifiedOnly: false,
      category: "All",
      priceRange: "all",
      searchTerm: "",
      studyType: "All Types",
      dataFormat: "All Formats",
      recordSize: "all",
      dataAge: "all",
      sortBy: "relevance",
    },
    loadOnMount: true,
  });

  // Local state
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [favoriteDatasets, setFavoriteDatasets] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [datasetDetails, setDatasetDetails] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  // HIPAA compliance
  useEffect(() => {
    // Log browse activity for HIPAA compliance
    const logBrowseActivity = async () => {
      try {
        await hipaaComplianceService.createAuditLog("DATA_BROWSE", {
          filters: JSON.stringify(filters),
          timestamp: new Date().toISOString(),
          action: "VIEW",
        });
      } catch (err) {
        console.error("Failed to log browse activity:", err);
      }
    };

    logBrowseActivity();
  }, [filters]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(
        "healthmint_favorite_datasets"
      );
      if (storedFavorites) {
        setFavoriteDatasets(JSON.parse(storedFavorites));
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites) => {
    try {
      localStorage.setItem(
        "healthmint_favorite_datasets",
        JSON.stringify(newFavorites)
      );
    } catch (err) {
      console.error("Failed to save favorites:", err);
    }
  }, []);

  // Toggle favorite dataset
  const toggleFavorite = useCallback(
    (datasetId) => {
      setFavoriteDatasets((prev) => {
        const newFavorites = prev.includes(datasetId)
          ? prev.filter((id) => id !== datasetId)
          : [...prev, datasetId];

        saveFavorites(newFavorites);
        return newFavorites;
      });
    },
    [saveFavorites]
  );

  // Handle search
  const handleSearch = useCallback(() => {
    updateFilter("searchTerm", searchInput);
  }, [searchInput, updateFilter]);

  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Toggle advanced filters
  const toggleAdvancedFilters = useCallback(() => {
    setAdvancedFiltersOpen((prev) => !prev);
  }, []);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchInput("");
  }, [resetFilters]);

  // Handle dataset selection/preview
  const handleViewDataset = useCallback(
    async (datasetId) => {
      try {
        setDetailsLoading(true);
        setSelectedDataset(datasetId);
        setPreviewOpen(true);

        // Log access for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          datasetId,
          "Viewing dataset details for research evaluation",
          "VIEW"
        );

        // Get dataset details
        const details = await getHealthDataDetails(datasetId);
        setDatasetDetails(details);

        // Call optional callback
        if (onDatasetSelect) {
          onDatasetSelect(datasetId, details);
        }
      } catch (err) {
        console.error("Error getting dataset details:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load dataset details",
          })
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [getHealthDataDetails, dispatch, onDatasetSelect]
  );

  // Handle purchase of a dataset
  const handlePurchase = useCallback(
    async (id) => {
      try {
        // Log action for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          id,
          "Purchasing dataset for research",
          "PURCHASE"
        );

        // Purchase data
        await purchaseData(id);

        dispatch(
          addNotification({
            type: "success",
            message: "Dataset purchased successfully!",
          })
        );

        if (onPurchase) {
          onPurchase(id);
        }
      } catch (err) {
        console.error("Purchase error:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to purchase dataset. Please try again.",
          })
        );
      }
    },
    [purchaseData, dispatch, onPurchase]
  );

  // Close the preview modal
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // Change view mode
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  // Toggle show only favorites
  const handleToggleFavorites = useCallback((value) => {
    setShowOnlyFavorites(value);
  }, []);

  // Filter datasets based on all criteria
  const filteredData = useMemo(() => {
    if (!healthData.length) return [];

    let filtered = [...healthData];

    // Apply advanced filters if set
    if (filters.studyType && filters.studyType !== "All Types") {
      filtered = filtered.filter(
        (data) => data.studyType === filters.studyType
      );
    }

    if (filters.dataFormat && filters.dataFormat !== "All Formats") {
      filtered = filtered.filter((data) => data.format === filters.dataFormat);
    }

    if (filters.recordSize && filters.recordSize !== "all") {
      if (filters.recordSize === "small") {
        filtered = filtered.filter((data) => data.recordCount < 1000);
      } else if (filters.recordSize === "medium") {
        filtered = filtered.filter(
          (data) => data.recordCount >= 1000 && data.recordCount < 10000
        );
      } else if (filters.recordSize === "large") {
        filtered = filtered.filter((data) => data.recordCount >= 10000);
      }
    }

    if (filters.dataAge && filters.dataAge !== "all") {
      const now = new Date();
      if (filters.dataAge === "recent") {
        filtered = filtered.filter((data) => {
          const dataDate = new Date(data.uploadDate);
          const diffMonths = (now - dataDate) / (1000 * 60 * 60 * 24 * 30);
          return diffMonths <= 6;
        });
      } else if (filters.dataAge === "older") {
        filtered = filtered.filter((data) => {
          const dataDate = new Date(data.uploadDate);
          const diffMonths = (now - dataDate) / (1000 * 60 * 60 * 24 * 30);
          return diffMonths > 6;
        });
      }
    }

    // Apply search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (data) =>
          data.title?.toLowerCase().includes(searchLower) ||
          data.description?.toLowerCase().includes(searchLower) ||
          data.category?.toLowerCase().includes(searchLower) ||
          data.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by favorites if needed
    if (showOnlyFavorites) {
      filtered = filtered.filter((data) => favoriteDatasets.includes(data.id));
    }

    // Sort datasets
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "price_asc":
          filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case "price_desc":
          filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case "newest":
          filtered.sort(
            (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
          );
          break;
        case "oldest":
          filtered.sort(
            (a, b) => new Date(a.uploadDate) - new Date(b.uploadDate)
          );
          break;
        case "size_asc":
          filtered.sort((a, b) => a.recordCount - b.recordCount);
          break;
        case "size_desc":
          filtered.sort((a, b) => b.recordCount - a.recordCount);
          break;
        case "relevance":
        default:
          // Relevance sorting already handled by API
          break;
      }
    }

    return filtered;
  }, [healthData, filters, showOnlyFavorites, favoriteDatasets]);

  // Pass props to the view component
  return (
    <DataBrowserView
      userRole={userRole}
      loading={loading}
      error={error}
      filters={filters}
      updateFilter={updateFilter}
      totalCount={totalCount}
      filteredData={filteredData}
      favoriteDatasets={favoriteDatasets}
      toggleFavorite={toggleFavorite}
      handlePurchase={handlePurchase}
      handleViewDataset={handleViewDataset}
      searchInput={searchInput}
      handleSearchInputChange={handleSearchInputChange}
      handleSearchKeyDown={handleSearchKeyDown}
      handleSearch={handleSearch}
      toggleAdvancedFilters={toggleAdvancedFilters}
      advancedFiltersOpen={advancedFiltersOpen}
      handleResetFilters={handleResetFilters}
      handleToggleFavorites={handleToggleFavorites}
      showOnlyFavorites={showOnlyFavorites}
      viewMode={viewMode}
      handleViewModeChange={handleViewModeChange}
      previewOpen={previewOpen}
      handleClosePreview={handleClosePreview}
      selectedDataset={selectedDataset}
      detailsLoading={detailsLoading}
      datasetDetails={datasetDetails}
      categories={CATEGORIES}
      studyTypes={STUDY_TYPES}
      dataFormats={DATA_FORMATS}
    />
  );
};

DataBrowser.propTypes = {
  onPurchase: PropTypes.func,
  onDatasetSelect: PropTypes.func,
};

export default DataBrowser;
