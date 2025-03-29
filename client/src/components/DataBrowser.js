// src/components/DataBrowser.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
 * Enhanced DataBrowser Container Component with improved HIPAA compliance
 *
 * Manages state and data operations for browsing health datasets with:
 * - Detailed audit logging
 * - Explicit consent verification
 * - Enhanced data access controls
 */
const DataBrowser = ({ onPurchase, onDatasetSelect }) => {
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.role.role);
  const userId = useSelector(
    (state) => state.user.profile?.id || state.wallet.address
  );

  // Session identifier for audit logging
  const sessionId = useMemo(
    () => `browse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

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

  // Enhanced consent tracking
  const [consentStatus, setConsentStatus] = useState({
    dataSharing: false,
    dataDownload: false,
    sensitiveData: false,
    lastVerified: null,
  });

  // Track viewed datasets for audit
  const [viewedDatasets, setViewedDatasets] = useState(new Set());
  const [downloadedDatasets, setDownloadedDatasets] = useState(new Set());

  // Consent modal state
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Timer for consent expiration
  const consentTimerRef = useRef(null);

  // Initialize session start time for audit
  const sessionStartTime = useRef(Date.now());
  const mountedRef = useRef(true);

  // Track user activity for audit logging
  const trackUserActivity = useCallback(
    async (action, details = {}) => {
      if (!mountedRef.current) return;

      try {
        await hipaaComplianceService.createAuditLog("DATA_BROWSE_ACTIVITY", {
          action,
          timestamp: new Date().toISOString(),
          sessionId,
          userId,
          userRole,
          ...details,
        });
      } catch (error) {
        console.error(`Failed to log user activity (${action}):`, error);
      }
    },
    [sessionId, userId, userRole]
  );

  // Check consent status on component mount and periodically
  useEffect(() => {
    // Load and verify initial consent status
    const verifyConsentStatus = async () => {
      try {
        // Get status for different consent types
        const dataSharingConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          { validateExpiration: true }
        );

        const dataDownloadConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_DOWNLOAD,
          { validateExpiration: true }
        );

        const sensitiveDataConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.SENSITIVE_DATA,
          { validateExpiration: true }
        );

        setConsentStatus({
          dataSharing: dataSharingConsent,
          dataDownload: dataDownloadConsent,
          sensitiveData: sensitiveDataConsent,
          lastVerified: new Date().toISOString(),
        });

        // Log initial consent status
        await trackUserActivity("CONSENT_STATUS_CHECK", {
          dataSharingConsent,
          dataDownloadConsent,
          sensitiveDataConsent,
        });
      } catch (error) {
        console.error("Error verifying consent status:", error);
      }
    };

    // Setup re-verification on a timer (every 15 minutes)
    verifyConsentStatus();

    // Set up periodic consent verification
    const consentVerificationInterval = setInterval(
      () => {
        verifyConsentStatus();
      },
      15 * 60 * 1000
    ); // Check every 15 minutes

    return () => {
      clearInterval(consentVerificationInterval);
      mountedRef.current = false;
    };
  }, [trackUserActivity]);

  // Log browse activity on mount
  useEffect(() => {
    // Create HIPAA-compliant audit log for browse activity
    const initBrowseSession = async () => {
      try {
        // Initial session start log
        await hipaaComplianceService.createAuditLog(
          "DATA_BROWSE_SESSION_START",
          {
            userRole,
            userId,
            timestamp: new Date().toISOString(),
            sessionId,
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            initialFilters: JSON.stringify(filters),
          }
        );
      } catch (err) {
        console.error("Failed to log browse session start:", err);
      }
    };

    initBrowseSession();

    // Log browse session end on component unmount
    return async () => {
      try {
        const sessionDuration = Date.now() - sessionStartTime.current;
        await hipaaComplianceService.createAuditLog("DATA_BROWSE_SESSION_END", {
          userRole,
          userId,
          timestamp: new Date().toISOString(),
          sessionId,
          sessionDuration, // in milliseconds
          datasetsViewed: Array.from(viewedDatasets).length,
          datasetsDownloaded: Array.from(downloadedDatasets).length,
          filtersApplied: Object.entries(filters).filter(
            ([_, value]) => value !== ""
          ).length,
        });
      } catch (err) {
        console.error("Failed to log browse session end:", err);
      }
    };
  }, [
    filters,
    userRole,
    userId,
    sessionId,
    viewedDatasets,
    downloadedDatasets,
  ]);

  // Load favorites from localStorage with error handling
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(
        "healthmint_favorite_datasets"
      );
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        setFavoriteDatasets(Array.isArray(parsed) ? parsed : []);

        // Log favorites loaded
        trackUserActivity("FAVORITES_LOADED", {
          count: Array.isArray(parsed) ? parsed.length : 0,
        });
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
      // Use empty array as fallback
      setFavoriteDatasets([]);
    }
  }, [trackUserActivity]);

  // Process consent request for a specific action
  const processConsentRequest = async (consentType, purpose) => {
    try {
      const consentResult = await hipaaComplianceService.requestConsent(
        consentType,
        {
          purpose,
          sessionId,
          userId,
          userRole,
          explicitAction: true,
          timestamp: new Date().toISOString(),
          metadata: {
            browser: navigator.userAgent,
            component: "DataBrowser",
          },
        }
      );

      // Update consent status if granted
      if (consentResult) {
        setConsentStatus((prev) => {
          const updated = { ...prev, lastVerified: new Date().toISOString() };

          switch (consentType) {
            case hipaaComplianceService.CONSENT_TYPES.DATA_SHARING:
              updated.dataSharing = true;
              break;
            case hipaaComplianceService.CONSENT_TYPES.DATA_DOWNLOAD:
              updated.dataDownload = true;
              break;
            case hipaaComplianceService.CONSENT_TYPES.SENSITIVE_DATA:
              updated.sensitiveData = true;
              break;
            default:
              break;
          }

          return updated;
        });

        // Log successful consent
        await trackUserActivity("CONSENT_GRANTED", {
          consentType,
          purpose,
        });

        // If there's a pending action, execute it
        if (pendingAction) {
          const { action, id, data } = pendingAction;
          setPendingAction(null);

          // Execute the appropriate action
          if (action === "download") {
            await handleDatasetDownload(id, data);
          } else if (action === "view") {
            await handleViewDataset(id);
          } else if (action === "purchase") {
            await handlePurchase(id);
          }
        }
      } else {
        // Log consent rejection
        await trackUserActivity("CONSENT_REJECTED", {
          consentType,
          purpose,
        });

        // Clear pending action
        setPendingAction(null);

        dispatch(
          addNotification({
            type: "warning",
            message: "Consent is required to perform this action.",
            duration: 5000,
          })
        );
      }

      // Close the consent modal
      setConsentModalOpen(false);
    } catch (error) {
      console.error("Error processing consent:", error);
      setConsentModalOpen(false);
      setPendingAction(null);

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to process consent. Please try again.",
          duration: 5000,
        })
      );
    }
  };

  // Save favorites to localStorage with additional checks
  const saveFavorites = useCallback(
    (newFavorites) => {
      try {
        // Validate that newFavorites is an array
        if (!Array.isArray(newFavorites)) {
          throw new Error("Favorites must be an array");
        }

        localStorage.setItem(
          "healthmint_favorite_datasets",
          JSON.stringify(newFavorites)
        );

        // Log favorite save with count
        trackUserActivity("FAVORITES_SAVED", {
          count: newFavorites.length,
        });
      } catch (err) {
        console.error("Failed to save favorites:", err);

        dispatch(
          addNotification({
            type: "warning",
            message:
              "Failed to save favorites. Your selections may not persist.",
            duration: 5000,
          })
        );
      }
    },
    [dispatch, trackUserActivity]
  );

  // Toggle favorite dataset with audit logging
  const toggleFavorite = useCallback(
    (datasetId) => {
      setFavoriteDatasets((prev) => {
        const newFavorites = prev.includes(datasetId)
          ? prev.filter((id) => id !== datasetId)
          : [...prev, datasetId];

        saveFavorites(newFavorites);

        // Log favorite toggle action
        trackUserActivity(
          prev.includes(datasetId) ? "FAVORITE_REMOVED" : "FAVORITE_ADDED",
          { datasetId }
        );

        return newFavorites;
      });
    },
    [saveFavorites, trackUserActivity]
  );

  // Handle search with better tracking
  const handleSearch = useCallback(() => {
    // Log search action before executing
    trackUserActivity("SEARCH_EXECUTED", {
      searchTerm: searchInput,
      previousTerm: filters.searchTerm,
    });

    updateFilter("searchTerm", searchInput);
  }, [searchInput, updateFilter, trackUserActivity]);

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

  // Toggle advanced filters with tracking
  const toggleAdvancedFilters = useCallback(() => {
    const newState = !advancedFiltersOpen;
    setAdvancedFiltersOpen(newState);

    // Log filter toggle
    trackUserActivity("ADVANCED_FILTERS_TOGGLED", {
      newState: newState ? "open" : "closed",
    });
  }, [advancedFiltersOpen, trackUserActivity]);

  // Reset all filters with tracking
  const handleResetFilters = useCallback(() => {
    // Log filter reset with previous filter state
    trackUserActivity("FILTERS_RESET", {
      previousFilters: JSON.stringify(filters),
    });

    resetFilters();
    setSearchInput("");
  }, [resetFilters, filters, trackUserActivity]);

  // Handle dataset download with enhanced consent verification
  const handleDatasetDownload = async (datasetId, datasetDetails) => {
    try {
      // Always verify consent before download with detailed request
      const hasDownloadConsent = await hipaaComplianceService.verifyConsent(
        hipaaComplianceService.CONSENT_TYPES.DATA_DOWNLOAD,
        {
          requireExplicit: true,
          validateExpiration: true,
          purpose: "dataset_download",
          enforceLatestVersion: true,
        }
      );

      if (!hasDownloadConsent) {
        // Store pending action and request consent
        setPendingAction({
          action: "download",
          id: datasetId,
          data: datasetDetails,
        });

        setConsentModalOpen(true);
        return;
      }

      // Log download action with comprehensive metadata
      await hipaaComplianceService.logDataAccess(
        datasetId,
        "Downloading dataset for research purposes",
        "DOWNLOAD",
        {
          timestamp: new Date().toISOString(),
          sessionId,
          userId,
          userRole,
          dataType: datasetDetails?.dataType || "unknown",
          dataFormat: datasetDetails?.format || "unknown",
          recordCount: datasetDetails?.recordCount || "unknown",
          category: datasetDetails?.category || "unknown",
          userAgent: navigator.userAgent,
          downloadMethod: "direct",
          consentVerified: true,
        }
      );

      // Track download in state for audit
      setDownloadedDatasets((prev) => new Set([...prev, datasetId]));

      // Simulate download for demo (would be actual download in production)
      dispatch(
        addNotification({
          type: "success",
          message: "Dataset download initiated",
          duration: 5000,
        })
      );

      // Log successful download
      trackUserActivity("DATASET_DOWNLOADED", {
        datasetId,
        datasetTitle: datasetDetails?.title || "Unknown dataset",
      });

      // Actual download logic would go here
      // ...
    } catch (err) {
      console.error("Download error:", err);

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to download dataset. Please try again.",
          duration: 5000,
        })
      );

      // Log error for audit
      trackUserActivity("DOWNLOAD_ERROR", {
        datasetId,
        error: err.message,
      });
    }
  };

  // Handle dataset selection/preview with enhanced consent and logging
  const handleViewDataset = useCallback(
    async (datasetId) => {
      try {
        // First, verify data sharing consent
        const hasSharingConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          {
            validateExpiration: true,
            requireExplicit: userRole === "researcher",
          }
        );

        if (!hasSharingConsent) {
          // Store pending action and request consent
          setPendingAction({
            action: "view",
            id: datasetId,
          });

          setConsentModalOpen(true);
          return;
        }

        setDetailsLoading(true);
        setSelectedDataset(datasetId);
        setPreviewOpen(true);

        // Log access with enhanced detail for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          datasetId,
          "Viewing dataset details for research evaluation",
          "VIEW",
          {
            timestamp: new Date().toISOString(),
            sessionId,
            userId,
            userRole,
            accessMethod: "preview",
            viewContext: "modal",
            consentVerified: true,
          }
        );

        // Get dataset details
        const details = await getHealthDataDetails(datasetId);

        // Track viewed datasets for audit
        setViewedDatasets((prev) => new Set([...prev, datasetId]));

        // Log successful dataset view
        trackUserActivity("DATASET_VIEWED", {
          datasetId,
          datasetTitle: details?.title || "Unknown dataset",
          datasetCategory: details?.category || "Unknown category",
        });

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

        // Log error for audit
        trackUserActivity("DATASET_VIEW_ERROR", {
          datasetId,
          error: err.message,
        });
      } finally {
        setDetailsLoading(false);
      }
    },
    [
      getHealthDataDetails,
      dispatch,
      onDatasetSelect,
      trackUserActivity,
      userId,
      userRole,
      sessionId,
    ]
  );

  // Handle purchase of a dataset with enhanced consent verification
  const handlePurchase = useCallback(
    async (id) => {
      try {
        // Always verify both consent types for purchase
        const [hasSharingConsent, hasDownloadConsent] = await Promise.all([
          hipaaComplianceService.verifyConsent(
            hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
            {
              requireExplicit: true,
              validateExpiration: true,
              purpose: "dataset_purchase",
            }
          ),
          hipaaComplianceService.verifyConsent(
            hipaaComplianceService.CONSENT_TYPES.DATA_DOWNLOAD,
            {
              requireExplicit: true,
              validateExpiration: true,
              purpose: "dataset_purchase",
            }
          ),
        ]);

        if (!hasSharingConsent || !hasDownloadConsent) {
          // Store pending action and request consent
          setPendingAction({
            action: "purchase",
            id,
          });

          setConsentModalOpen(true);
          return;
        }

        // Log action for HIPAA compliance with enhanced detail
        await hipaaComplianceService.logDataAccess(
          id,
          "Purchasing dataset for research",
          "PURCHASE",
          {
            timestamp: new Date().toISOString(),
            sessionId,
            userId,
            userRole,
            purchaseContext: "research_use",
            purchaseMethod: "direct",
            consentVerified: hasSharingConsent && hasDownloadConsent,
          }
        );

        // Purchase data
        await purchaseData(id);

        // Track downloaded datasets for audit
        setDownloadedDatasets((prev) => new Set([...prev, id]));

        // Log successful purchase
        trackUserActivity("DATASET_PURCHASED", {
          datasetId: id,
        });

        dispatch(
          addNotification({
            type: "success",
            message: "Dataset purchased successfully!",
          })
        );

        if (onPurchase) {
          onPurchase(id);
        }

        // Close preview if open
        setPreviewOpen(false);
      } catch (err) {
        console.error("Purchase error:", err);

        dispatch(
          addNotification({
            type: "error",
            message: "Failed to purchase dataset. Please try again.",
          })
        );

        // Log error for audit
        trackUserActivity("PURCHASE_ERROR", {
          datasetId: id,
          error: err.message,
        });
      }
    },
    [
      purchaseData,
      dispatch,
      onPurchase,
      trackUserActivity,
      userId,
      userRole,
      sessionId,
    ]
  );

  // Close the preview modal
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);

    // Log preview close
    trackUserActivity("PREVIEW_CLOSED", {
      datasetId: selectedDataset,
    });
  }, [selectedDataset, trackUserActivity]);

  // Change view mode
  const handleViewModeChange = useCallback(
    (mode) => {
      setViewMode(mode);

      // Log view mode change
      trackUserActivity("VIEW_MODE_CHANGED", {
        previousMode: viewMode,
        newMode: mode,
      });
    },
    [viewMode, trackUserActivity]
  );

  // Toggle show only favorites
  const handleToggleFavorites = useCallback(
    (value) => {
      setShowOnlyFavorites(value);

      // Log favorites toggle
      trackUserActivity("FAVORITES_FILTER_TOGGLED", {
        showOnlyFavorites: value,
      });
    },
    [trackUserActivity]
  );

  // Filter datasets based on all criteria
  const filteredData = useMemo(() => {
    if (!healthData.length) return [];

    let filtered = [...healthData];

    // Track filter application for audit
    trackUserActivity("FILTERS_APPLIED", {
      filtersUsed: Object.entries(filters)
        .filter(([_, value]) => value !== "")
        .map(([key, value]) => `${key}:${value}`)
        .join(","),
      resultCount: filtered.length,
    });

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
  }, [
    healthData,
    filters,
    showOnlyFavorites,
    favoriteDatasets,
    trackUserActivity,
  ]);

  // Consent Modal Component
  const ConsentModal = () => {
    if (!consentModalOpen) return null;

    const currentPendingAction = pendingAction?.action || "unknown";
    const actionText = {
      download: "download this dataset",
      view: "view this dataset details",
      purchase: "purchase this dataset",
      unknown: "access this data",
    }[currentPendingAction];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              HIPAA Consent Required
            </h3>
            <p className="text-gray-600">
              To {actionText}, you must provide consent for data access in
              accordance with HIPAA regulations.
            </p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-2">
              By providing consent, you acknowledge:
            </h4>
            <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
              <li>
                All data access is logged and audited per HIPAA requirements
              </li>
              <li>
                You will only use this data for legitimate research purposes
              </li>
              <li>You will maintain confidentiality of any patient data</li>
              <li>
                Your consent will be recorded with a timestamp and your user ID
              </li>
              <li>You can revoke consent at any time via privacy settings</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setConsentModalOpen(false);
                setPendingAction(null);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={() =>
                processConsentRequest(
                  currentPendingAction === "view"
                    ? hipaaComplianceService.CONSENT_TYPES.DATA_SHARING
                    : hipaaComplianceService.CONSENT_TYPES.DATA_DOWNLOAD,
                  currentPendingAction === "download"
                    ? "dataset_download"
                    : currentPendingAction === "purchase"
                      ? "dataset_purchase"
                      : "dataset_view"
                )
              }
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              I Consent
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Pass props to the view component
  return (
    <>
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
        handleDatasetDownload={handleDatasetDownload}
        sessionId={sessionId}
        consentStatus={consentStatus}
      />

      {/* Consent Modal */}
      <ConsentModal />
    </>
  );
};

DataBrowser.propTypes = {
  onPurchase: PropTypes.func,
  onDatasetSelect: PropTypes.func,
};

export default DataBrowser;
