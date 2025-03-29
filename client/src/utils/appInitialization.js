// client/src/utils/appInitialization.js
import apiConfig from "../config/apiConfig.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import { store } from "../redux/store.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { migrateLocalHealthData } from "./dataMigrationUtils.js";

/**
 * Application Initialization Script
 *
 * Handles one-time initialization tasks when the application starts,
 * such as migrating mock data to real data, setting up health data services,
 * and ensuring HIPAA compliance throughout.
 */

/**
 * Initializes the application
 * This should be called once when the app starts
 */
export const initializeApplication = async () => {
  try {
    console.log("Initializing application...");

    // Create initial audit log
    await hipaaComplianceService.createAuditLog("APPLICATION_INIT", {
      action: "INITIALIZE",
      timestamp: new Date().toISOString(),
      environment: apiConfig.ENV.NODE_ENV,
      mockDataMode: apiConfig.shouldUseMockData(),
    });

    // Check if we need to migrate mock data to real data
    if (apiConfig.ENV.NODE_ENV !== "production") {
      await handleMockDataMigration();
    }

    // Check for connectivity
    const isConnected = await checkBackendConnectivity();

    // Set initialization complete flag
    window.healthmintInitialized = true;

    console.log("Application initialization complete");
    return { success: true, isConnected };
  } catch (error) {
    console.error("Application initialization error:", error);

    // Log initialization error for HIPAA compliance
    await hipaaComplianceService.createAuditLog("APPLICATION_INIT_ERROR", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    // Don't block app startup, but notify user
    store.dispatch(
      addNotification({
        type: "warning",
        message:
          "Some initialization tasks failed. Some features may be limited.",
        duration: 8000,
      })
    );

    return { success: false, error: error.message };
  }
};

/**
 * Handles migration of mock data to real data if needed
 */
async function handleMockDataMigration() {
  try {
    // Check if there's local mock data to migrate
    const mockHealthDataKey = "healthmint_mock_health_data";
    const hasMockData = Boolean(localStorage.getItem(mockHealthDataKey));

    // Check if mock data migration is needed
    if (!hasMockData) {
      return { success: true, message: "No mock data to migrate" };
    }

    // If we're in development and using mock data,
    // check if user wants to migrate
    if (apiConfig.shouldUseMockData()) {
      // Ask user if they want to migrate mock data
      const shouldMigrate = window.confirm(
        "Mock health data found. Would you like to migrate it to the real backend? " +
          "This will make your data persistent across sessions."
      );

      if (!shouldMigrate) {
        return { success: true, message: "Migration skipped by user" };
      }
    }

    // Migrate mock data to real backend
    const migrationResult = await migrateLocalHealthData();

    if (migrationResult.success) {
      store.dispatch(
        addNotification({
          type: "success",
          message: `Successfully migrated ${migrationResult.importedCount} health records`,
        })
      );
    } else {
      store.dispatch(
        addNotification({
          type: "warning",
          message: `Failed to migrate mock data: ${migrationResult.error}`,
        })
      );
    }

    return migrationResult;
  } catch (error) {
    console.error("Mock data migration error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks if the backend is available
 * @returns {Promise<boolean>} Whether backend is available
 */
async function checkBackendConnectivity() {
  try {
    // If using mock data, we don't need to check connectivity
    if (apiConfig.shouldUseMockData()) {
      return true;
    }

    // Make a simple request to check connectivity
    const response = await fetch(`${apiConfig.ENV.API_URL}/api/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      timeout: 5000,
    });

    return response.ok;
  } catch (error) {
    console.warn("Backend connectivity check failed:", error);

    // Log connectivity issue for HIPAA compliance
    await hipaaComplianceService.createAuditLog("CONNECTIVITY_CHECK", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    // Don't fail initialization on connectivity check
    return false;
  }
}

/**
 * Cleans up mock data and related resources
 * This should be called when the app shuts down or when explicitly removing mock data
 */
export const cleanupMockData = async () => {
  try {
    // Only run in production to ensure no data leakage
    if (apiConfig.ENV.NODE_ENV === "production") {
      console.log("Removing mock data resources in production environment");

      // Remove any mock data from localStorage
      const mockDataKeys = [
        "healthmint_mock_health_data",
        "healthmint_mock_user_records",
        "healthmint_mock_research_data",
      ];

      mockDataKeys.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });

      // Log cleanup for HIPAA compliance
      await hipaaComplianceService.createAuditLog("MOCK_DATA_CLEANUP", {
        action: "CLEANUP",
        timestamp: new Date().toISOString(),
        environment: "production",
      });

      return { success: true, message: "Mock data resources removed" };
    }

    // In development, only clean up when explicitly requested
    return { success: true, message: "No cleanup needed in development" };
  } catch (error) {
    console.error("Mock data cleanup error:", error);
    return { success: false, error: error.message };
  }
};

// Default export
export default {
  initializeApplication,
  cleanupMockData,
};
