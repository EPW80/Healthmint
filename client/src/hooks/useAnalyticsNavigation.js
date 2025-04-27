// src/hooks/useAnalyticsNavigation.js
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import useNavigation from "./useNavigation.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

// Handle navigation to data visualization tool
const useAnalyticsNavigation = ({ onStartFiltering } = {}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Use the existing navigation context if available
  const navigationContext = useNavigation();

  // Log analytics tool access for HIPAA compliance
  const logToolAccess = useCallback(async (toolName, userId, userRole) => {
    try {
      await hipaaComplianceService.createAuditLog("ANALYTICS_TOOL_ACCESS", {
        toolName,
        timestamp: new Date().toISOString(),
        userId,
        userRole,
        action: "NAVIGATE",
      });
    } catch (error) {
      console.error(`Failed to log access to ${toolName}:`, error);
    }
  }, []);

  // Navigate to data visualization tool
  const navigateToVisualization = useCallback(
    (userId, userRole) => {
      logToolAccess("Data Visualization", userId, userRole);
      navigate("/analysis/visualization");
      dispatch(
        addNotification({
          type: "info",
          message: "Opening Data Visualization tool...",
          duration: 3000,
        })
      );
    },
    [navigate, dispatch, logToolAccess]
  );

  // Navigate to statistical analysis tool
  const navigateToStatistics = useCallback(
    (userId, userRole) => {
      logToolAccess("Statistical Analysis", userId, userRole);
      navigate("/analysis/statistics");
      dispatch(
        addNotification({
          type: "info",
          message: "Opening Statistical Analysis tool...",
          duration: 3000,
        })
      );
    },
    [navigate, dispatch, logToolAccess]
  );

  // Navigate to population studies tool
  const navigateToPopulationStudies = useCallback(
    (userId, userRole) => {
      logToolAccess("Population Studies", userId, userRole);
      navigate("/analysis/population-studies");
      dispatch(
        addNotification({
          type: "info",
          message: "Opening Population Studies tool...",
          duration: 3000,
        })
      );
    },
    [navigate, dispatch, logToolAccess]
  );

  // Start data filtering (redirect to subset creation)
  const startDataFiltering = useCallback(
    (datasetId, userId, userRole) => {
      logToolAccess("Data Filtering", userId, userRole);

      if (!datasetId) {
        // If no dataset provided, navigate to browse page with filter flag
        navigate("/browse?filter=true");
        dispatch(
          addNotification({
            type: "info",
            message: "Please select a dataset to filter",
            duration: 3000,
          })
        );
        return;
      }

      // If onStartFiltering provided, use it (for subset creation)
      if (typeof onStartFiltering === "function") {
        onStartFiltering(datasetId);
        dispatch(
          addNotification({
            type: "info",
            message: "Opening Data Filtering tool...",
            duration: 3000,
          })
        );
      } else {
        // Fallback to browse page with dataset ID
        navigate(`/browse?dataset=${datasetId}&filter=true`);
      }
    },
    [navigate, dispatch, onStartFiltering, logToolAccess]
  );

  return {
    navigateToVisualization,
    navigateToStatistics,
    navigateToPopulationStudies,
    startDataFiltering,
    ...navigationContext,
  };
};

export default useAnalyticsNavigation;
