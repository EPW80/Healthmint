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

const DataBrowser = ({ onPurchase, onDatasetSelect }) => {
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
  const [consentsHistory, setConsentsHistory] = useState([]);

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

  // Handle purchase start with tier support
  const handlePurchaseStart = useCallback(
    (datasetId) => {
      setPurchasingDataset(datasetId);
      setPurchaseStep("processing");
      setShowTransactionModal(true);

      // Get the selected tier for this dataset
      const tier = selectedTiers[datasetId] || { id: "complete" };
      const dataset = healthData.find((d) => d.id === datasetId);

      if (!dataset) {
        console.error(`Dataset with ID ${datasetId} not found`);
        return;
      }

      // Set transaction details with tier information
      setTransactionDetails({
        datasetId,
        tier: tier.id || "complete",
        recordCount: tier.recordCount || dataset.recordCount,
        amount: tier.price || dataset.price.toString(),
        timestamp: new Date().toISOString(),
      });

      // Log purchase initiation with tier information
      hipaaComplianceService.createAuditLog("PURCHASE_INITIATED", {
        datasetId,
        tier: tier.id || "complete",
        recordCount: tier.recordCount || dataset.recordCount,
        price: tier.price || dataset.price.toString(),
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_START",
      });

      // Show user notification with tier info
      dispatch(
        addNotification({
          type: "info",
          message: `Processing ${tier.id || "complete"} tier purchase request...`,
          duration: 3000,
        })
      );
    },
    [dispatch, userId, userRole, selectedTiers, healthData]
  );

  // Handle purchase completion
  const handlePurchaseComplete = useCallback(
    (datasetId, transactionDetails) => {
      setPurchaseStep("complete");

      // Update transaction modal details with tier information
      setTransactionDetails((prev) => ({
        ...prev,
        ...transactionDetails,
        datasetId,
        message:
          `Your purchase of the ${transactionDetails.tier || "complete"} tier was successful!` +
          " You now have access to this dataset.",
      }));

      // Log purchase completion with tier information
      hipaaComplianceService.createAuditLog("PURCHASE_COMPLETED", {
        datasetId,
        tier: transactionDetails.tier || "complete",
        recordCount: transactionDetails.recordCount,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_COMPLETE",
        transactionHash: transactionDetails.transactionHash,
      });

      // Show success notification
      dispatch(
        addNotification({
          type: "success",
          message: `${transactionDetails.tier || "Complete"} tier purchase completed successfully!`,
          duration: 5000,
        })
      );

      // Reset purchase state after delay
      setTimeout(() => {
        setPurchasingDataset(null);
        setPurchaseStep("idle");
      }, 2000);

      // Call original onPurchase callback if provided
      if (onPurchase) {
        onPurchase(datasetId, transactionDetails);
      }
    },
    [dispatch, onPurchase, userId, userRole]
  );

  // Handle purchase error
  const handlePurchaseError = useCallback(
    (datasetId, error) => {
      setPurchaseStep("error");

      // Update transaction modal details
      setTransactionDetails((prev) => ({
        ...prev,
        datasetId,
        error: true,
        errorMessage:
          error?.message || `An error occurred during the transaction.`,
      }));

      // Log purchase error for HIPAA compliance
      hipaaComplianceService.createAuditLog("PURCHASE_ERROR", {
        datasetId,
        tier: transactionDetails.tier || "complete",
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_ERROR",
        errorMessage: error?.message || "Unknown purchase error",
      });

      // Show error notification
      dispatch(
        addNotification({
          type: "error",
          message:
            error?.message || "Failed to complete purchase. Please try again.",
          duration: 7000,
        })
      );

      // Reset purchase state after delay
      setTimeout(() => {
        setPurchasingDataset(null);
        setPurchaseStep("idle");
      }, 3000);
    },
    [dispatch, userId, userRole, transactionDetails]
  );

  // View dataset implementation
  const viewDatasetImpl = useCallback(
    async (datasetId, consentVerified = false) => {
      try {
        setDetailsLoading(true);
        setSelectedDataset(datasetId);
        setPreviewOpen(true);

        // Fetch tier data for this dataset
        await fetchDatasetTiers(datasetId);

        // Log access for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          datasetId,
          "Viewing dataset details for research/patient evaluation",
          "VIEW",
          {
            userRole,
            userId,
            timestamp: new Date().toISOString(),
            method: "DATASET_PREVIEW",
            consentVerified: consentVerified,
            dataCategory:
              healthData.find((d) => d.id === datasetId)?.category || "Unknown",
            ipAddress: "client",
          }
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

        // Log the error for HIPAA compliance
        await hipaaComplianceService.createAuditLog("DATASET_VIEW_ERROR", {
          datasetId,
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          errorMessage: err.message || "Unknown error viewing dataset",
        });

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
    [
      getHealthDataDetails,
      dispatch,
      onDatasetSelect,
      healthData,
      userId,
      userRole,
      fetchDatasetTiers,
    ]
  );

  // Updated purchase implementation with tier support
  const purchaseDatasetImpl = useCallback(
    async (id, consentVerified = false) => {
      try {
        // Find the dataset
        const dataset = healthData.find((d) => d.id === id);
        if (!dataset) {
          throw new Error("Dataset not found");
        }

        // Get tier information
        const tier = selectedTiers[id] || { id: "complete" };
        const tierPrice = tier.price || dataset.price.toString();
        const recordCount = tier.recordCount || dataset.recordCount;

        // Set state to "processing" in the modal
        setPurchaseStep("processing");

        // Log action for HIPAA compliance with tier information
        await hipaaComplianceService.logDataAccess(
          id,
          `Purchasing ${tier.id} tier of dataset for research`,
          "PURCHASE",
          {
            userRole,
            userId,
            timestamp: new Date().toISOString(),
            consentVerified: consentVerified,
            ipAddress: "client",
            datasetInfo: {
              category: dataset.category || "Unknown",
              tier: tier.id,
              price: tierPrice,
              recordCount: recordCount,
              anonymized: dataset.anonymized || false,
            },
            transactionId: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          }
        );

        // Initialize payment service if needed
        if (!mockPaymentService.isInitialized) {
          await mockPaymentService.initializeProvider();
        }

        // Check balance before proceeding
        const balance = await mockPaymentService.getBalance();

        if (parseFloat(balance) < parseFloat(tierPrice)) {
          throw new Error("Insufficient funds to complete this purchase");
        }

        // Update transaction status to confirming
        setPurchaseStep("confirming");
        setTransactionDetails((prev) => ({
          ...prev,
          amount: tierPrice,
          tier: tier.id,
          recordCount: recordCount,
          processingStep: "blockchain-confirmation",
        }));

        // Use payment service to purchase with tier information
        const result = await mockPaymentService.purchaseDataset(
          id,
          tierPrice,
          tier.id,
          recordCount
        );

        if (!result.success) {
          throw new Error(result.error || "Transaction failed");
        }

        // Record this purchase in the consent history with tier info
        const updatedHistory = [
          ...consentsHistory,
          {
            consentType: hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
            timestamp: new Date().toISOString(),
            consentGiven: true,
            purpose: "Dataset purchase confirmation",
            datasetId: id,
            tier: tier.id,
            recordCount: recordCount,
            actionType: "PURCHASE_COMPLETED",
            transactionHash: result.transactionHash,
          },
        ];
        setConsentsHistory(updatedHistory);

        return {
          success: true,
          datasetId: id,
          timestamp: new Date().toISOString(),
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          tier: tier.id,
          recordCount: recordCount,
          price: tierPrice,
        };
      } catch (err) {
        console.error("Purchase error:", err);

        // Log purchase failure
        await hipaaComplianceService.createAuditLog("DATASET_PURCHASE_FAILED", {
          datasetId: id,
          tier: selectedTiers[id]?.id || "complete",
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          errorMessage: err.message || "Unknown purchase error",
        });

        throw err;
      }
    },
    [consentsHistory, healthData, userId, userRole, selectedTiers]
  );

  // Request and verify consent for data access
  const requestAndVerifyConsent = useCallback(
    async (purpose, datasetId = null, actionType = "VIEW") => {
      try {
        // First check if we need a new consent or already have a valid one
        if (consentVerified) {
          // Log reusing existing consent
          await hipaaComplianceService.createAuditLog("CONSENT_REUSED", {
            purpose,
            datasetId,
            actionType,
            tier: selectedTiers[datasetId]?.id,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
          });

          return true;
        }

        // Determine which consent type to verify based on action
        const consentType =
          actionType === "DOWNLOAD" || actionType === "PURCHASE"
            ? hipaaComplianceService.CONSENT_TYPES.DATA_SHARING
            : hipaaComplianceService.CONSENT_TYPES.DATA_BROWSING;

        // Include tier info for purchases
        const tierInfo =
          actionType === "PURCHASE" && datasetId && selectedTiers[datasetId]
            ? {
                tier: selectedTiers[datasetId].id,
                recordCount: selectedTiers[datasetId].recordCount,
                price: selectedTiers[datasetId].price,
              }
            : null;

        // Prepare detailed consent request metadata
        const consentRequestMetadata = {
          datasetId,
          requestReason: purpose,
          requestDateTime: new Date().toISOString(),
          actionType,
          userRole,
          ...(tierInfo && { tierInfo }),
          requesterInfo: {
            userId,
            role: userRole,
          },
        };

        // Verify consent
        const hasConsent = await hipaaComplianceService.verifyConsent(
          consentType,
          consentRequestMetadata
        );

        if (!hasConsent) {
          // Store pending action info and show consent modal
          setPendingAction({
            purpose,
            datasetId,
            actionType,
            consentType,
            tierInfo,
            metadata: consentRequestMetadata,
          });

          setConsentModalOpen(true);
          return false;
        }

        // Log successful verification
        await hipaaComplianceService.createAuditLog("CONSENT_VERIFIED", {
          purpose,
          datasetId,
          actionType,
          consentType,
          ...(tierInfo && { tier: tierInfo.tier }),
          timestamp: new Date().toISOString(),
          userId,
          userRole,
          result: "GRANTED",
        });

        // Update state to reflect verified consent
        setConsentVerified(true);
        return true;
      } catch (err) {
        console.error("Consent verification error:", err);

        // Log verification failure
        await hipaaComplianceService.createAuditLog(
          "CONSENT_VERIFICATION_ERROR",
          {
            purpose,
            datasetId,
            actionType,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            errorMessage: err.message || "Unknown consent verification error",
          }
        );

        return false;
      }
    },
    [consentVerified, userId, userRole, selectedTiers]
  );

  // Handle view dataset with consent
  const handleViewDataset = useCallback(
    async (datasetId) => {
      try {
        // Define the purpose for this action
        const purpose =
          "Viewing dataset details for research/patient evaluation";

        // Verify consent before proceeding
        const hasConsent = await requestAndVerifyConsent(
          purpose,
          datasetId,
          "VIEW"
        );
        if (!hasConsent) {
          return; // Consent modal will be shown or action was denied
        }

        // Call the implementation function with consent verified
        await viewDatasetImpl(datasetId, true);
      } catch (err) {
        console.error("Error in handleViewDataset:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to process dataset view",
          })
        );
      }
    },
    [dispatch, requestAndVerifyConsent, viewDatasetImpl]
  );

  // Handle purchase with consent and tier support
  const handlePurchase = useCallback(
    async (id) => {
      try {
        // Get the selected tier
        const tier = selectedTiers[id];

        // Start the purchase process
        handlePurchaseStart(id);

        // Define the purpose with tier info
        const purpose = `Purchasing ${tier?.id || "complete"} tier of dataset for research`;

        // Verify consent before proceeding
        const hasConsent = await requestAndVerifyConsent(
          purpose,
          id,
          "PURCHASE"
        );

        if (!hasConsent) {
          // Reset purchase state if consent was denied
          setPurchasingDataset(null);
          setPurchaseStep("idle");
          setShowTransactionModal(false);
          return;
        }

        // Proceed with the purchase
        try {
          // Use tier-aware purchaseDatasetImpl
          const result = await purchaseDatasetImpl(id, true);

          // Handle success
          handlePurchaseComplete(id, {
            timestamp: result.timestamp,
            datasetId: id,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            tier: result.tier,
            recordCount: result.recordCount,
            price: result.price,
          });
        } catch (err) {
          // Handle errors
          handlePurchaseError(id, err);
        }
      } catch (err) {
        console.error("Error in handlePurchase:", err);

        if (purchaseStep !== "error") {
          handlePurchaseError(id, err);
        }
      }
    },
    [
      handlePurchaseStart,
      handlePurchaseComplete,
      handlePurchaseError,
      requestAndVerifyConsent,
      purchaseDatasetImpl,
      purchaseStep,
      selectedTiers,
    ]
  );

  // Handle consent approval from modal
  const handleConsentApproval = useCallback(
    async (approved) => {
      try {
        if (!pendingAction) return;

        const {
          purpose,
          datasetId,
          actionType,
          consentType,
          metadata,
          tierInfo,
        } = pendingAction;

        // Record the consent decision with tier info if applicable
        await hipaaComplianceService.recordConsent(consentType, approved, {
          ...metadata,
          consentDecision: approved ? "APPROVED" : "DECLINED",
          consentMethodType: "EXPLICIT_MODAL",
          consentVersion: "1.2",
          ...(tierInfo && { tierInfo }),
          consentText: approved
            ? `User explicitly approved ${tierInfo ? tierInfo.tier + " tier " : ""}data access via consent modal`
            : `User declined ${tierInfo ? tierInfo.tier + " tier " : ""}data access via consent modal`,
          ipAddress: "client",
        });

        // Log consent decision
        await hipaaComplianceService.createAuditLog(
          approved ? "CONSENT_GRANTED" : "CONSENT_DECLINED",
          {
            purpose,
            datasetId,
            actionType,
            consentType,
            ...(tierInfo && { tier: tierInfo.tier }),
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            consentMethod: "EXPLICIT_MODAL",
          }
        );

        // Update state based on decision
        setConsentVerified(approved);
        setConsentModalOpen(false);

        // Update consents history with tier info if applicable
        const updatedHistory = [
          ...consentsHistory,
          {
            consentType,
            timestamp: new Date().toISOString(),
            consentGiven: approved,
            purpose,
            datasetId,
            ...(tierInfo && { tier: tierInfo.tier }),
          },
        ];
        setConsentsHistory(updatedHistory);

        // If approved, proceed with the pending action
        if (approved) {
          if (actionType === "VIEW" && datasetId) {
            // View dataset
            await viewDatasetImpl(datasetId, true);
          } else if (actionType === "PURCHASE" && datasetId) {
            // Start purchase
            handlePurchaseStart(datasetId);
            try {
              // Purchase with consent verified
              const result = await purchaseDatasetImpl(datasetId, true);

              // Handle successful purchase
              handlePurchaseComplete(datasetId, {
                timestamp: result.timestamp,
                datasetId,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber,
                gasUsed: result.gasUsed,
                tier: result.tier,
                recordCount: result.recordCount,
                price: result.price,
              });
            } catch (err) {
              handlePurchaseError(datasetId, err);
            }
          }
        } else {
          // Notify the user their action was canceled due to consent denial
          dispatch(
            addNotification({
              type: "info",
              message: "Action canceled due to consent denial",
            })
          );
        }

        // Clear the pending action
        setPendingAction(null);
      } catch (err) {
        console.error("Error processing consent decision:", err);

        dispatch(
          addNotification({
            type: "error",
            message: "Error processing consent decision. Please try again.",
          })
        );

        setConsentModalOpen(false);
        setPendingAction(null);
      }
    },
    [
      pendingAction,
      consentsHistory,
      dispatch,
      viewDatasetImpl,
      purchaseDatasetImpl,
      handlePurchaseStart,
      handlePurchaseComplete,
      handlePurchaseError,
      userId,
      userRole,
    ]
  );

  // Check for existing consent
  useEffect(() => {
    const checkInitialConsent = async () => {
      try {
        // Check for existing consent records
        const consentHistory = await hipaaComplianceService.getConsentHistory(
          hipaaComplianceService.CONSENT_TYPES.DATA_BROWSING
        );

        setConsentsHistory(consentHistory);

        // If we have a valid consent record that hasn't expired, use it
        const hasValidConsent = consentHistory.some((consent) => {
          const consentDate = new Date(consent.timestamp);
          const now = new Date();
          // Consider consent valid for 30 days
          const consentValid = now - consentDate < 30 * 24 * 60 * 60 * 1000;
          return consent.consentGiven && consentValid;
        });

        setConsentVerified(hasValidConsent);

        // Log browse activity for HIPAA compliance
        await hipaaComplianceService.createAuditLog("DATA_BROWSE_INIT", {
          userRole,
          userId,
          timestamp: new Date().toISOString(),
          action: "VIEW",
          hasProvidedConsent: hasValidConsent,
          filters: JSON.stringify(filters),
          sessionInfo: {
            browser: navigator.userAgent,
            viewMode,
            accessType: "WEB_INTERFACE",
          },
        });
      } catch (err) {
        console.error("Failed to check initial consent:", err);
        // Default to false to be safe
        setConsentVerified(false);
      }
    };

    checkInitialConsent();
  }, [userRole, filters, viewMode, userId]);

  // Log filter changes for HIPAA compliance
  useEffect(() => {
    const logFilterChange = async () => {
      try {
        await hipaaComplianceService.createAuditLog("DATA_FILTER_CHANGE", {
          filters: JSON.stringify(filters),
          timestamp: new Date().toISOString(),
          action: "FILTER",
          userRole,
          userId,
        });
      } catch (err) {
        console.error("Failed to log filter change:", err);
      }
    };

    logFilterChange();
  }, [filters, userRole, userId]);

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

  // Fetch wallet balance periodically
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        if (mockPaymentService.isInitialized) {
          const balance = await mockPaymentService.getBalance();
          setWalletBalance(balance);
        }
      } catch (err) {
        console.error("Error fetching wallet balance:", err);
      }
    };

    fetchWalletBalance();
    const intervalId = setInterval(fetchWalletBalance, 10000);
    return () => clearInterval(intervalId);
  }, [purchaseStep]);

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
      {/* Data Browser View */}
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
