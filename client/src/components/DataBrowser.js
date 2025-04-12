// src/components/DataBrowser.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import useHealthData from "../hooks/useHealthData.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import mockPaymentService from "../services/mockPaymentService.js";
import mockDataService from "../services/mockDataService.js";
import DataBrowserView from "./DataBrowserView.js";
import TransactionModal from "./TransactionModal.js";
import useFilteredSubset from "../hooks/useFilteredSubset.js";
import FilteredSubsetCreator from "./FilteredSubsetCreator.js";

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

const DataBrowser = ({ className, mode = "browse" }) => {
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.role.role);
  const userId = useSelector((state) => state.wallet.address);

  // Get health data state and functionality from hook
  const {
    healthData,
    loading,
    error,
    filters,
    totalCount,
    updateFilter,
    resetFilters,
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

  // Move this hook call up here, before any functions that use it
  const {
    isFilteringMode,
    selectedDatasetForFiltering,
    savedSubsets,
    purchaseInProgress: subsetPurchaseInProgress,
    activeSubsetId,
    cancelFiltering,
    handleSubsetCreated,
    getDatasetSubsets,
    startFilteringDataset,
  } = useFilteredSubset();

  // Initialize mock services on component mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await mockPaymentService.initializeProvider();
        console.log("Mock payment service initialized");
      } catch (err) {
        console.error("Failed to initialize mock payment service:", err);
      }
    };

    initializeServices();
  }, []);

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
  const [consentVerified, setConsentVerified] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Tier selection state
  const [selectedTiers, setSelectedTiers] = useState({});
  const [datasetTiers, setDatasetTiers] = useState({});

  // Purchase state
  const [purchasingDataset, setPurchasingDataset] = useState(null);
  const [purchaseStep, setPurchaseStep] = useState("idle"); // 'idle', 'processing', 'confirming', 'complete', 'error'
  const [walletBalance, setWalletBalance] = useState(null);

  // Transaction modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState({});

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

  // Fetch tier data for a dataset
  const fetchDatasetTiers = useCallback(
    async (datasetId) => {
      if (!datasetTiers[datasetId]) {
        try {
          const tiers = await mockDataService.getDatasetTiers(datasetId);
          setDatasetTiers((prev) => ({
            ...prev,
            [datasetId]: tiers,
          }));

          // Default to complete tier
          if (!selectedTiers[datasetId]) {
            setSelectedTiers((prev) => ({
              ...prev,
              [datasetId]: tiers.find((t) => t.id === "complete"),
            }));
          }

          return tiers;
        } catch (err) {
          console.error(`Error fetching tiers for dataset ${datasetId}:`, err);
          return null;
        }
      }
      return datasetTiers[datasetId];
    },
    [datasetTiers, selectedTiers]
  );

  // Handle tier selection change
  const handleTierChange = useCallback(
    (datasetId, tierData) => {
      setSelectedTiers((prev) => ({
        ...prev,
        [datasetId]: tierData,
      }));

      hipaaComplianceService.createAuditLog("TIER_SELECTION_CHANGE", {
        datasetId,
        tier: tierData.id,
        percentage: tierData.percentage,
        recordCount: tierData.recordCount,
        price: tierData.price,
        timestamp: new Date().toISOString(),
        userRole,
        userId,
      });
    },
    [userRole, userId]
  );

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

        // Log favorite toggle for HIPAA compliance
        hipaaComplianceService.createAuditLog("DATASET_FAVORITE_TOGGLE", {
          datasetId,
          action: prev.includes(datasetId) ? "REMOVE_FAVORITE" : "ADD_FAVORITE",
          timestamp: new Date().toISOString(),
          userRole,
          userId,
        });

        return newFavorites;
      });
    },
    [saveFavorites, userRole, userId]
  );

  // Close the preview modal
  const handleClosePreview = useCallback(() => {
    // Log closing preview for HIPAA compliance
    if (selectedDataset) {
      hipaaComplianceService.createAuditLog("PREVIEW_CLOSED", {
        datasetId: selectedDataset,
        timestamp: new Date().toISOString(),
        userRole,
        userId,
      });
    }

    setPreviewOpen(false);
  }, [selectedDataset, userRole, userId]);

  // Handle search
  const handleSearch = useCallback(() => {
    // Log search for HIPAA compliance
    hipaaComplianceService.createAuditLog("DATASET_SEARCH", {
      searchTerm: searchInput,
      timestamp: new Date().toISOString(),
      action: "SEARCH",
      userRole,
      userId,
    });

    updateFilter("searchTerm", searchInput);
  }, [searchInput, updateFilter, userRole, userId]);

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
    const newState = !advancedFiltersOpen;
    setAdvancedFiltersOpen(newState);

    // Log toggle for HIPAA compliance
    hipaaComplianceService.createAuditLog("ADVANCED_FILTERS_TOGGLE", {
      state: newState ? "OPEN" : "CLOSED",
      timestamp: new Date().toISOString(),
      action: "TOGGLE_FILTERS",
      userRole,
      userId,
    });
  }, [advancedFiltersOpen, userRole, userId]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    // Log filter reset for HIPAA compliance
    hipaaComplianceService.createAuditLog("FILTERS_RESET", {
      previousFilters: JSON.stringify(filters),
      timestamp: new Date().toISOString(),
      action: "RESET_FILTERS",
      userRole,
      userId,
    });

    resetFilters();
    setSearchInput("");
  }, [resetFilters, filters, userRole, userId]);

  // Change view mode
  const handleViewModeChange = useCallback(
    (mode) => {
      // Log view mode change for HIPAA compliance
      hipaaComplianceService.createAuditLog("VIEW_MODE_CHANGE", {
        previousMode: viewMode,
        newMode: mode,
        timestamp: new Date().toISOString(),
        userRole,
        userId,
      });

      setViewMode(mode);
    },
    [viewMode, userRole, userId]
  );

  // Toggle show only favorites
  const handleToggleFavorites = useCallback(
    (value) => {
      // Log favorites toggle for HIPAA compliance
      hipaaComplianceService.createAuditLog("FAVORITES_FILTER_TOGGLE", {
        state: value ? "FAVORITES_ONLY" : "ALL_DATASETS",
        timestamp: new Date().toISOString(),
        userRole,
        userId,
      });

      setShowOnlyFavorites(value);
    },
    [userRole, userId]
  );

  const requestAndVerifyConsent = useCallback((datasetId, action) => {
    // Existing implementation
  }, []);

  const handleViewDataset = useCallback(
    (datasetId) => {
      console.log("handleViewDataset called with ID:", datasetId);
      try {
        setDetailsLoading(true);

        // Log view attempt for HIPAA compliance
        hipaaComplianceService.createAuditLog("DATASET_PREVIEW_OPEN", {
          datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          action: "PREVIEW",
        });

        // Find the dataset details in the data we already have
        const dataset = filteredData.find((d) => d.id === datasetId);
        console.log("Dataset found:", dataset);

        if (dataset) {
          setSelectedDataset(datasetId);
          setDatasetDetails(dataset);
          setPreviewOpen(true);
          console.log("Preview state set to open:", true);
        } else {
          console.error("Dataset not found:", datasetId);
          dispatch(
            addNotification({
              type: "error",
              message: "Dataset details not found.",
              duration: 3000,
            })
          );
        }
      } catch (err) {
        console.error("Error in handleViewDataset:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Error loading dataset preview: " + err.message,
            duration: 3000,
          })
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [dispatch, filteredData, userId, userRole]
  );

  const handleSubsetPurchase = useCallback((subsetData) => {
    // Existing implementation
  }, []);

  const handleCreateSubset = useCallback(
    (datasetIdOrObject) => {
      // Add debug logging
      console.log("handleCreateSubset called with:", datasetIdOrObject);

      try {
        // If we received an ID string instead of a dataset object, find the dataset
        const dataset =
          typeof datasetIdOrObject === "string"
            ? filteredData.find((d) => d.id === datasetIdOrObject)
            : datasetIdOrObject;

        if (!dataset) {
          console.error("Dataset not found with ID:", datasetIdOrObject);
          dispatch(
            addNotification({
              type: "error",
              message: "Dataset not found. Cannot create subset.",
              duration: 3000,
            })
          );
          return;
        }

        // Log creation attempt
        hipaaComplianceService.createAuditLog("SUBSET_CREATION_STARTED", {
          datasetId: dataset.id,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
        });

        console.log("Starting dataset filtering for:", dataset.id);
        startFilteringDataset(dataset);

        // Close the preview if it's open
        if (previewOpen) {
          setPreviewOpen(false);
        }
      } catch (err) {
        console.error("Error in handleCreateSubset:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to create subset: " + err.message,
            duration: 3000,
          })
        );
      }
    },
    [
      dispatch,
      filteredData,
      userId,
      userRole,
      startFilteringDataset,
      previewOpen,
    ]
  );

  // Handle dataset download
  const handleDownloadDataset = useCallback(
    async (datasetId) => {
      try {
        // Set loading state
        setDetailsLoading(true);

        // Log download attempt for HIPAA compliance
        await hipaaComplianceService.createAuditLog(
          "DATASET_DOWNLOAD_ATTEMPT",
          {
            datasetId,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            action: "DOWNLOAD",
          }
        );

        // Check if the dataset exists in our data
        const datasetExists = healthData.some(
          (dataset) => dataset.id === datasetId
        );
        if (!datasetExists) {
          throw new Error(`Dataset with ID ${datasetId} not found`);
        }

        // Instead of directly accessing the API endpoint, use mockDataService
        // This avoids making requests to non-existent endpoints
        const downloadUrl =
          await mockDataService.getDatasetDownloadUrl(datasetId);

        if (!downloadUrl) {
          throw new Error("Download URL could not be generated");
        }

        // Log successful download preparation
        await hipaaComplianceService.createAuditLog(
          "DATASET_DOWNLOAD_PREPARED",
          {
            datasetId,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            action: "DOWNLOAD_READY",
          }
        );

        // Show notification to user
        dispatch(
          addNotification({
            type: "info",
            message: "Preparing download. This may take a moment...",
            duration: 3000,
          })
        );

        // Use our mock service to simulate download instead of direct API call
        const result = await mockDataService.downloadDataset(datasetId);

        if (result.success) {
          dispatch(
            addNotification({
              type: "success",
              message: "Dataset downloaded successfully!",
              duration: 5000,
            })
          );

          // Log successful download
          await hipaaComplianceService.createAuditLog(
            "DATASET_DOWNLOAD_COMPLETE",
            {
              datasetId,
              timestamp: new Date().toISOString(),
              userId,
              userRole,
              action: "DOWNLOAD_COMPLETE",
            }
          );
        } else {
          throw new Error(result.error || "Download failed");
        }
      } catch (err) {
        console.error("Download error:", err);

        // Log error
        await hipaaComplianceService.createAuditLog("DATASET_DOWNLOAD_ERROR", {
          datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          errorMessage: err.message || "Unknown download error",
          action: "DOWNLOAD_ERROR",
        });

        dispatch(
          addNotification({
            type: "error",
            message: `Download failed: ${err.message || "Unknown error"}`,
            duration: 7000,
          })
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [dispatch, userId, userRole, healthData, setDetailsLoading]
  );

  // Consent handling
  const handleConsentApproval = useCallback(
    (approved) => {
      setConsentModalOpen(false);

      // Log consent decision
      hipaaComplianceService.createAuditLog(
        approved ? "CONSENT_APPROVED" : "CONSENT_DECLINED",
        {
          consentType: pendingAction?.consentType,
          action: pendingAction?.actionType,
          datasetId: pendingAction?.datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
        }
      );

      if (approved) {
        setConsentVerified(true);

        // Execute the pending action
        if (pendingAction?.onApprove) {
          pendingAction.onApprove();
        }
      } else {
        // Handle decline - show notification
        dispatch(
          addNotification({
            type: "info",
            message: "Action cancelled - consent not provided",
            duration: 3000,
          })
        );
      }

      // Clear pending action
      setPendingAction(null);
    },
    [dispatch, pendingAction, userId, userRole]
  );

  // Handle dataset purchase
  const handlePurchase = useCallback(
    async (dataset) => {
      try {
        // Request consent first
        return requestAndVerifyConsent(dataset.id, {
          actionType: "PURCHASE",
          purpose: `Purchase dataset: ${dataset.title}`,
          consentType: hipaaComplianceService.CONSENT_TYPES.DATA_ACCESS,
          onApprove: async () => {
            setPurchasingDataset(dataset);
            setPurchaseStep("processing");

            // Check wallet balance
            const balance = await mockPaymentService.getBalance();
            setWalletBalance(balance);

            if (parseFloat(balance) < parseFloat(dataset.price)) {
              setPurchaseStep("error");
              dispatch(
                addNotification({
                  type: "error",
                  message: "Insufficient funds for this purchase",
                  duration: 5000,
                })
              );
              return;
            }

            // Process purchase
            setPurchaseStep("confirming");
            const result = await mockPaymentService.purchaseDataset(
              dataset.id,
              dataset.price
            );

            // Handle result
            if (result.success) {
              setPurchaseStep("complete");
              setTransactionDetails({
                ...result,
                datasetName: dataset.title,
                price: dataset.price,
                timestamp: new Date().toISOString(),
              });
              setShowTransactionModal(true);

              dispatch(
                addNotification({
                  type: "success",
                  message: "Dataset purchased successfully!",
                  duration: 5000,
                })
              );
            } else {
              throw new Error(result.error || "Purchase failed");
            }
          },
        });
      } catch (err) {
        console.error("Purchase error:", err);
        setPurchaseStep("error");
        dispatch(
          addNotification({
            type: "error",
            message: `Purchase failed: ${err.message}`,
            duration: 5000,
          })
        );
      }
    },
    [dispatch, requestAndVerifyConsent]
  );

  // Handle purchasing a filtered subset
  const handleFilteredSubsetPurchase = useCallback(
    (subset) => {
      return requestAndVerifyConsent(subset.datasetId, {
        actionType: "PURCHASE_SUBSET",
        purpose: `Purchase filtered subset: ${subset.name}`,
        consentType: hipaaComplianceService.CONSENT_TYPES.DATA_ACCESS,
        onApprove: () => {
          // Handle the actual purchase through the hook's functionality
          // This triggers the filtered subset purchase process
          handleSubsetPurchase(subset);
        },
      });
    },
    [requestAndVerifyConsent, handleSubsetPurchase]
  );

  // Handle viewing a subset
  const handleViewSubset = useCallback(
    (subset) => {
      try {
        setDetailsLoading(true);

        hipaaComplianceService.createAuditLog("SUBSET_VIEW", {
          subsetId: subset.id,
          datasetId: subset.datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
        });

        // Simulate loading subset details
        setTimeout(() => {
          setSelectedDataset(subset.datasetId);
          setDatasetDetails({
            ...subset,
            isSubset: true,
            parentDatasetId: subset.datasetId,
          });
          setPreviewOpen(true);
          setDetailsLoading(false);
        }, 500);
      } catch (err) {
        console.error("Error viewing subset:", err);
        setDetailsLoading(false);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load subset details",
            duration: 3000,
          })
        );
      }
    },
    [dispatch, userId, userRole]
  );

  // Handle downloading a subset
  const handleDownloadSubset = useCallback(
    async (subset) => {
      try {
        setDetailsLoading(true);

        // Log download attempt
        await hipaaComplianceService.createAuditLog("SUBSET_DOWNLOAD_ATTEMPT", {
          subsetId: subset.id,
          datasetId: subset.datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
        });

        // Simulate download
        const result = await mockDataService.downloadDataset(subset.id, true);

        if (result.success) {
          dispatch(
            addNotification({
              type: "success",
              message: "Subset downloaded successfully!",
              duration: 3000,
            })
          );

          // Log successful download
          await hipaaComplianceService.createAuditLog(
            "SUBSET_DOWNLOAD_COMPLETE",
            {
              subsetId: subset.id,
              datasetId: subset.datasetId,
              timestamp: new Date().toISOString(),
              userId,
              userRole,
            }
          );
        } else {
          throw new Error(result.error || "Download failed");
        }
      } catch (err) {
        console.error("Subset download error:", err);
        dispatch(
          addNotification({
            type: "error",
            message: `Download failed: ${err.message}`,
            duration: 5000,
          })
        );

        // Log error
        await hipaaComplianceService.createAuditLog("SUBSET_DOWNLOAD_ERROR", {
          subsetId: subset.id,
          datasetId: subset.datasetId,
          error: err.message,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
        });
      } finally {
        setDetailsLoading(false);
      }
    },
    [dispatch, userId, userRole]
  );

  // Purchase step handlers for transaction tracking
  const handlePurchaseStart = useCallback(
    (datasetId, tier) => {
      hipaaComplianceService.createAuditLog("PURCHASE_STARTED", {
        datasetId,
        tier,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      });
    },
    [userId, userRole]
  );

  const handlePurchaseComplete = useCallback(
    (datasetId, result) => {
      hipaaComplianceService.createAuditLog("PURCHASE_COMPLETED", {
        datasetId,
        transactionHash: result.hash,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      });

      dispatch(
        addNotification({
          type: "success",
          message: "Purchase completed successfully!",
          duration: 3000,
        })
      );
    },
    [dispatch, userId, userRole]
  );

  const handlePurchaseError = useCallback(
    (datasetId, error) => {
      hipaaComplianceService.createAuditLog("PURCHASE_ERROR", {
        datasetId,
        error: error.message,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      });

      dispatch(
        addNotification({
          type: "error",
          message: `Purchase failed: ${error.message}`,
          duration: 5000,
        })
      );
    },
    [dispatch, userId, userRole]
  );

  // Render consent modal component
  const renderConsentModal = () => {
    if (!consentModalOpen || !pendingAction) return null;

    const { purpose, actionType, consentType, tierInfo } = pendingAction;
    const tierDetails = tierInfo ? ` (${tierInfo.tier} tier)` : "";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2">HIPAA Consent Required</h3>
            <p className="text-gray-700">Your consent is required for:</p>
            <p className="font-medium my-2 text-blue-700">
              {purpose}
              {tierDetails}
            </p>

            <div className="my-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                By providing consent, you acknowledge:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>This action will be logged for HIPAA compliance</li>
                <li>Your consent will be securely documented</li>
                {actionType === "PURCHASE" && (
                  <li>
                    Purchasing this dataset{tierDetails} creates a permanent
                    record of your consent
                  </li>
                )}
                {consentType ===
                  hipaaComplianceService.CONSENT_TYPES.DATA_SHARING && (
                  <li>
                    You're agreeing to the secure sharing of health information
                  </li>
                )}
                <li>You can revoke consent for future access at any time</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => handleConsentApproval(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Decline
            </button>
            <button
              onClick={() => handleConsentApproval(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              I Consent
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Filtered Subset Creator */}
      {isFilteringMode && selectedDatasetForFiltering ? (
        <FilteredSubsetCreator
          datasetId={
            typeof selectedDatasetForFiltering === "string"
              ? selectedDatasetForFiltering
              : typeof selectedDatasetForFiltering === "object" &&
                selectedDatasetForFiltering !== null
                ? String(selectedDatasetForFiltering.id || "")
                : ""
          }
          onSubsetCreated={handleSubsetCreated}
          onSubsetPurchase={handleSubsetPurchase}
          onCancel={cancelFiltering}
          className="mb-6"
        />
      ) : (
        /* Data Browser View */
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
          handleDownloadDataset={handleDownloadDataset}
          handleCreateSubset={handleCreateSubset}
          datasetSubsets={getDatasetSubsets}
          onPurchaseSubset={handleFilteredSubsetPurchase}
          onViewSubset={handleViewSubset}
          onDownloadSubset={handleDownloadSubset}
          activeSubsetId={activeSubsetId}
          availableSubsets={savedSubsets.length}
          subsetProcessing={subsetPurchaseInProgress}
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
          consentVerified={consentVerified}
          purchasingDataset={purchasingDataset}
          purchaseStep={purchaseStep}
          handlePurchaseStart={handlePurchaseStart}
          handlePurchaseComplete={handlePurchaseComplete}
          handlePurchaseError={handlePurchaseError}
          walletBalance={walletBalance}
          handleTierChange={handleTierChange}
          selectedTiers={selectedTiers}
          datasetTiers={datasetTiers}
          fetchDatasetTiers={fetchDatasetTiers}
        />
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        step={purchaseStep}
        details={transactionDetails}
      />

      {/* Consent Modal */}
      {renderConsentModal()}
    </>
  );
};

DataBrowser.propTypes = {
  onPurchase: PropTypes.func,
  onDatasetSelect: PropTypes.func,
};

export default DataBrowser;
