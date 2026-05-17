// client/src/utils/appInitialization.js
import apiConfig from "../config/apiConfig.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import { store } from "../redux/store.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { migrateLocalHealthData } from "./dataMigrationUtils.js";

// Initialize the application with necessary setup steps
const CONSTANTS = {
  MOCK_DATA_KEYS: [
    "healthmint_mock_health_data",
    "healthmint_mock_user_records",
    "healthmint_mock_research_data",
  ],
  INITIALIZATION_FLAG: "healthmintInitialized",
  CONNECTIVITY_TIMEOUT: 5000, // 5 seconds
  NOTIFICATION_DURATION: {
    DEFAULT: 5000,
    WARNING: 8000,
    SUCCESS: 3000,
  },
};

// Private functions
export const initializeApplication = async () => {
  try {
    console.log("Initializing application...");

    // Create initial audit log
    await _createInitializationAuditLog();

    // Execute initialization steps with proper error handling
    const migrationResult = await _handleDataMigration();
    const connectivityResult = await _checkBackendConnectivity();

    // Set initialization complete flag
    window.healthmintInitialized = true;

    console.log("Application initialization complete");

    return {
      success: true,
      isConnected: connectivityResult,
      dataMigrated: migrationResult.success,
    };
  } catch (error) {
    console.error("Application initialization error:", error);

    // Log initialization error for HIPAA compliance
    await hipaaComplianceService.createAuditLog("APPLICATION_INIT_ERROR", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });

    _showNotification({
      type: "warning",
      message:
        "Some initialization tasks failed. Some features may be limited.",
      duration: CONSTANTS.NOTIFICATION_DURATION.WARNING,
    });

    return {
      success: false,
      error: error.message,
      details: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    };
  }
};

// creates a notification with specified options
async function _createInitializationAuditLog() {
  await hipaaComplianceService.createAuditLog("APPLICATION_INIT", {
    action: "INITIALIZE",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || apiConfig.ENV.NODE_ENV,
    mockDataMode: apiConfig.shouldUseMockData(),
    appVersion: process.env.REACT_APP_VERSION || "development",
  });
}

// handles data migration
async function _handleDataMigration() {
  // Only run in non-production environments
  if (apiConfig.ENV.NODE_ENV === "production") {
    return { success: true, message: "Migration skipped in production" };
  }

  try {
    // Check if there's local mock data to migrate
    const hasMockData = _hasMockData();

    if (!hasMockData) {
      return { success: true, message: "No mock data to migrate" };
    }

    // Skip migration if mock data is being used
    if (apiConfig.shouldUseMockData()) {
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
      _showNotification({
        type: "success",
        message: `Successfully migrated ${migrationResult.importedCount || 0} health records`,
        duration: CONSTANTS.NOTIFICATION_DURATION.SUCCESS,
      });
    } else {
      _showNotification({
        type: "warning",
        message: `Failed to migrate mock data: ${migrationResult.error}`,
        duration: CONSTANTS.NOTIFICATION_DURATION.WARNING,
      });
    }

    return migrationResult;
  } catch (error) {
    console.error("Mock data migration error:", error);

    await hipaaComplianceService.createAuditLog("MOCK_DATA_MIGRATION_ERROR", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
      message: "Failed to migrate mock data",
    };
  }
}

// checks if there's local mock data
function _hasMockData() {
  return Boolean(localStorage.getItem(CONSTANTS.MOCK_DATA_KEYS[0]));
}

// checks if the backend is reachable
async function _checkBackendConnectivity() {
  // If using mock data, we don't need to check connectivity
  if (apiConfig.shouldUseMockData()) {
    return true;
  }

  try {
    // Define timeout for fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONSTANTS.CONNECTIVITY_TIMEOUT
    );

    // Make a simple request to check connectivity
    const response = await fetch(`${apiConfig.ENV.API_URL}/api/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Client-Version": process.env.REACT_APP_VERSION || "development",
      },
      signal: controller.signal,
    });

    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Backend connectivity check failed with status: ${response.status}`
      );
    }

    // Log successful connectivity for HIPAA compliance
    await hipaaComplianceService.createAuditLog("CONNECTIVITY_CHECK", {
      action: "SUCCESS",
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.warn("Backend connectivity check failed:", error);

    // Log connectivity issue for HIPAA compliance
    await hipaaComplianceService.createAuditLog("CONNECTIVITY_CHECK", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    _showNotification({
      type: "error",
      message: "Unable to connect to HealthMint service. Using offline mode.",
      duration: CONSTANTS.NOTIFICATION_DURATION.WARNING,
    });

    // Don't fail initialization on connectivity check
    return false;
  }
}

// shows a notification with specified options
function _showNotification(notificationOptions) {
  store.dispatch(
    addNotification({
      ...notificationOptions,
      duration:
        notificationOptions.duration || CONSTANTS.NOTIFICATION_DURATION.DEFAULT,
    })
  );
}

// cleanup mock data resources
export const cleanupMockData = async () => {
  try {
    // Create audit log for cleanup attempt
    await hipaaComplianceService.createAuditLog("MOCK_DATA_CLEANUP_ATTEMPT", {
      action: "CLEANUP_START",
      timestamp: new Date().toISOString(),
      environment: apiConfig.ENV.NODE_ENV,
    });

    // Only run in production to ensure no data leakage
    if (apiConfig.ENV.NODE_ENV === "production") {
      console.log("Removing mock data resources in production environment");

      // Remove mock data from localStorage
      let removedCount = 0;

      CONSTANTS.MOCK_DATA_KEYS.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          removedCount++;
        }
      });

      // Log cleanup for HIPAA compliance
      await hipaaComplianceService.createAuditLog("MOCK_DATA_CLEANUP", {
        action: "CLEANUP_COMPLETE",
        timestamp: new Date().toISOString(),
        environment: "production",
        itemsRemoved: removedCount,
      });

      return {
        success: true,
        message: `Mock data resources removed (${removedCount} items)`,
      };
    }

    // In development, only clean up when explicitly requested
    return {
      success: true,
      message: "No cleanup needed in development environment",
    };
  } catch (error) {
    console.error("Mock data cleanup error:", error);

    // Log cleanup error for HIPAA compliance
    await hipaaComplianceService.createAuditLog("MOCK_DATA_CLEANUP_ERROR", {
      action: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
      message: "Failed to clean up mock data resources",
    };
  }
};

// checks if the application is already initialized
export const isApplicationInitialized = () => {
  return Boolean(window.healthmintInitialized);
};

// resets the application state in non-production environments
export const resetApplicationState = async () => {
  // Only available in non-production environments
  if (apiConfig.ENV.NODE_ENV === "production") {
    console.warn("Application state reset is not available in production");
    return {
      success: false,
      message: "Reset not available in production",
    };
  }

  try {
    // Remove initialization flag
    window.healthmintInitialized = false;

    // Log reset for HIPAA compliance
    await hipaaComplianceService.createAuditLog("APPLICATION_RESET", {
      action: "RESET",
      timestamp: new Date().toISOString(),
      environment: apiConfig.ENV.NODE_ENV,
    });

    return {
      success: true,
      message: "Application state reset successfully",
    };
  } catch (error) {
    console.error("Application state reset error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  initializeApplication,
  cleanupMockData,
  isApplicationInitialized,
  resetApplicationState,
};
