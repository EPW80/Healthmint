// src/hooks/useFilteredSubset.js
import { useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import mockPaymentService from "../services/mockPaymentService.js";

/**
 * Custom hook to manage filtered dataset subset creation and purchase
 */
const useFilteredSubset = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);

  // State
  const [isFilteringMode, setIsFilteringMode] = useState(false);
  const [selectedDatasetForFiltering, setSelectedDatasetForFiltering] = useState(null);
  const [savedSubsets, setSavedSubsets] = useState([]);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [activeSubsetId, setActiveSubsetId] = useState(null);

  /**
   * Enter filtering mode for a specific dataset
   */
  const startFilteringDataset = useCallback((datasetId, datasetInfo) => {
    setSelectedDatasetForFiltering({
      id: datasetId,
      ...datasetInfo
    });
    setIsFilteringMode(true);

    // Log HIPAA compliant audit
    hipaaComplianceService.createAuditLog("SUBSET_FILTER_MODE_ENTER", {
      datasetId,
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action: "START_FILTERING",
    });
  }, [userId, userRole]);

  /**
   * Exit filtering mode
   */
  const cancelFiltering = useCallback(() => {
    setIsFilteringMode(false);
    setSelectedDatasetForFiltering(null);

    // Log HIPAA compliant audit
    hipaaComplianceService.createAuditLog("SUBSET_FILTER_MODE_EXIT", {
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action: "CANCEL_FILTERING",
    });
  }, [userId, userRole]);

  /**
   * Handle when a subset is created
   */
  const handleSubsetCreated = useCallback((subsetData) => {
    setSavedSubsets(prev => {
      // Check if subset already exists
      const existingIndex = prev.findIndex(s => s.id === subsetData.id);
      
      if (existingIndex >= 0) {
        // Update existing subset
        const updated = [...prev];
        updated[existingIndex] = subsetData;
        return updated;
      } else {
        // Add new subset
        return [...prev, subsetData];
      }
    });

    // Notify user
    dispatch(addNotification({
      type: "success",
      message: `Subset "${subsetData.name}" created successfully!`,
      duration: 5000,
    }));

    // Log HIPAA compliant audit
    hipaaComplianceService.createAuditLog("SUBSET_CREATED", {
      subsetId: subsetData.id,
      subsetName: subsetData.name,
      parentDatasetId: subsetData.parentDatasetId,
      recordCount: subsetData.recordCount,
      price: subsetData.price,
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action: "SUBSET_SAVED",
    });
  }, [dispatch, userId, userRole]);

  /**
   * Handle subset purchase
   */
  const handleSubsetPurchase = useCallback(async (subsetData) => {
    try {
      setPurchaseInProgress(true);
      setActiveSubsetId(subsetData.id);

      // Log HIPAA compliant audit
      hipaaComplianceService.createAuditLog("SUBSET_PURCHASE_START", {
        subsetId: subsetData.id,
        subsetName: subsetData.name,
        parentDatasetId: subsetData.parentDatasetId,
        price: subsetData.price,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_START",
      });

      // Initialize payment service if needed
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      // Check wallet balance
      const balance = await mockPaymentService.getBalance();
      if (parseFloat(balance) < parseFloat(subsetData.price)) {
        throw new Error("Insufficient funds to complete this purchase");
      }

      // Process the payment
      const result = await mockPaymentService.purchaseDataset(
        subsetData.id, 
        subsetData.price,
        "complete", // Tier is always complete for custom subsets
        subsetData.recordCount
      );

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      // Add the subset to the purchased list
      setSavedSubsets(prev => {
        return prev.map(subset => {
          if (subset.id === subsetData.id) {
            return {
              ...subset,
              purchased: true,
              purchaseDate: new Date().toISOString(),
              transactionHash: result.transactionHash
            };
          }
          return subset;
        });
      });

      // Exit filtering mode
      setIsFilteringMode(false);
      setSelectedDatasetForFiltering(null);

      // Notify user
      dispatch(addNotification({
        type: "success",
        message: `Successfully purchased "${subsetData.name}" subset!`,
        duration: 5000,
      }));

      // Log HIPAA compliant audit
      hipaaComplianceService.createAuditLog("SUBSET_PURCHASE_COMPLETE", {
        subsetId: subsetData.id,
        subsetName: subsetData.name,
        parentDatasetId: subsetData.parentDatasetId,
        price: subsetData.price,
        transactionHash: result.transactionHash,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_COMPLETE",
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
        subsetData
      };

    } catch (error) {
      console.error("Error purchasing subset:", error);
      
      // Notify user
      dispatch(addNotification({
        type: "error",
        message: `Failed to purchase subset: ${error.message}`,
        duration: 7000,
      }));

      // Log HIPAA compliant audit
      hipaaComplianceService.createAuditLog("SUBSET_PURCHASE_ERROR", {
        subsetId: subsetData.id,
        subsetName: subsetData.name,
        error: error.message,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "PURCHASE_ERROR",
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setPurchaseInProgress(false);
      setActiveSubsetId(null);
    }
  }, [dispatch, userId, userRole]);

  /**
   * Check if a dataset has any saved subsets
   */
  const getDatasetSubsets = useCallback((datasetId) => {
    return savedSubsets.filter(subset => subset.parentDatasetId === datasetId);
  }, [savedSubsets]);

  return {
    // State
    isFilteringMode,
    selectedDatasetForFiltering,
    savedSubsets,
    purchaseInProgress,
    activeSubsetId,

    // Methods
    startFilteringDataset,
    cancelFiltering,
    handleSubsetCreated,
    handleSubsetPurchase,
    getDatasetSubsets
  };
};

export default useFilteredSubset;