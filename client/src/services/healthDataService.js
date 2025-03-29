// client/src/services/healthDataService.js
import apiService from "./apiService.js";
import authService from "./authService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import secureStorageService from "./secureStorageService.js";
import errorHandlingService from "./errorHandlingService.js";
import { store } from "../redux/store.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { setLoading, setError } from "../redux/slices/uiSlice.js";
import { setHealthRecords, setUserRecords } from "../redux/slices/dataSlice.js";

/**
 * Health Data Service
 *
 * Centralized service for fetching, processing, and managing health data
 * with proper HIPAA compliance measures
 */
class HealthDataService {
  constructor() {
    this.basePath = "/api/data";
    this.cachedDataKey = "healthmint_cached_data";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  /**
   * Fetch patient health records from the backend
   * @param {Object} options - Query options and filters
   * @returns {Promise<Array>} Health records
   */
  async fetchPatientRecords(options = {}) {
    try {
      // Ensure valid token
      await authService.ensureValidToken();

      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("HEALTH_RECORDS_ACCESS", {
        action: "VIEW",
        timestamp: new Date().toISOString(),
        filters: JSON.stringify(options),
      });

      // Start loading state
      store.dispatch(setLoading(true));

      // Make API request
      const response = await apiService.get(
        `${this.basePath}/patient/records`,
        options
      );

      // Update Redux store
      if (response && response.data) {
        // Sanitize data for HIPAA compliance
        const sanitizedRecords = response.data.map((record) =>
          hipaaComplianceService.sanitizeData(record, {
            mode: options.includeIdentifiers ? "default" : "mask",
          })
        );

        // Store in Redux
        store.dispatch(setUserRecords(sanitizedRecords));

        // Return the records
        return sanitizedRecords;
      }

      return [];
    } catch (error) {
      // Handle and log error
      const handledError = errorHandlingService.handleError(error, {
        code: "HEALTH_RECORDS_ERROR",
        context: "Health Records",
        userVisible: true,
      });

      // Set error state
      store.dispatch(setError(handledError.userMessage));

      // Show notification
      store.dispatch(
        addNotification({
          type: "error",
          message: handledError.userMessage,
        })
      );

      // Return empty array on error
      return [];
    } finally {
      // End loading state
      store.dispatch(setLoading(false));
    }
  }

  /**
   * Fetch health data for a specific record
   * @param {string} recordId - Record ID to fetch
   * @returns {Promise<Object>} Health record data
   */
  async fetchHealthRecordDetails(recordId) {
    try {
      if (!recordId) {
        throw new Error("Record ID is required");
      }

      // Ensure valid token
      await authService.ensureValidToken();

      // Log access for HIPAA compliance
      await hipaaComplianceService.logDataAccess(
        recordId,
        "Viewing detailed health record",
        "VIEW"
      );

      // Make API request
      const response = await apiService.get(
        `${this.basePath}/record/${recordId}`
      );

      if (response && response.data) {
        // Sanitize data for HIPAA compliance
        return hipaaComplianceService.sanitizeData(response.data);
      }

      throw new Error("Record not found");
    } catch (error) {
      // Handle error
      errorHandlingService.handleError(error, {
        code: "RECORD_DETAILS_ERROR",
        context: "Health Record Details",
        userVisible: true,
      });

      return null;
    }
  }

  /**
   * Fetch health data for research purposes
   * @param {Object} filters - Search and filter criteria
   * @returns {Promise<Array>} Research datasets
   */
  async fetchResearchData(filters = {}) {
    try {
      // Ensure valid token
      await authService.ensureValidToken();

      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("RESEARCH_DATA_ACCESS", {
        action: "SEARCH",
        timestamp: new Date().toISOString(),
        filters: JSON.stringify(filters),
      });

      // Set loading state
      store.dispatch(setLoading(true));

      // Make API request
      const response = await apiService.get(
        `${this.basePath}/research`,
        filters
      );

      // Update Redux store
      if (response && response.data) {
        // Sanitize data for HIPAA compliance (always anonymized for research)
        const sanitizedData = response.data.map((dataset) =>
          hipaaComplianceService.sanitizeData(dataset, {
            mode: "mask", // Always mask identifiers for research data
          })
        );

        // Store in Redux
        store.dispatch(setHealthRecords(sanitizedData));

        return {
          datasets: sanitizedData,
          total: response.total || sanitizedData.length,
        };
      }

      return { datasets: [], total: 0 };
    } catch (error) {
      // Handle error
      errorHandlingService.handleError(error, {
        code: "RESEARCH_DATA_ERROR",
        context: "Research Data",
        userVisible: true,
      });

      return { datasets: [], total: 0 };
    } finally {
      // End loading state
      store.dispatch(setLoading(false));
    }
  }

  /**
   * Upload health data with HIPAA compliance
   * @param {Object} data - Metadata for the health record
   * @param {File} file - The file to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadHealthData(data, file, onProgress = () => {}) {
    try {
      if (!data || !file) {
        throw new Error("Both data and file are required");
      }

      // Validate data for HIPAA compliance
      const phiCheck = hipaaComplianceService.checkForPHI(JSON.stringify(data));
      if (phiCheck.hasPHI && !data.anonymized) {
        // If PHI is detected and not explicitly marked as anonymized, warn user
        store.dispatch(
          addNotification({
            type: "warning",
            message:
              "Potential PHI detected in your data. Please ensure all data is properly anonymized or de-identified.",
          })
        );
      }

      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("HEALTH_DATA_UPLOAD", {
        action: "UPLOAD",
        timestamp: new Date().toISOString(),
        category: data.category,
        fileType: file.type,
        fileSize: file.size,
        isAnonymized: Boolean(data.anonymized),
      });

      // Upload file to secure storage
      const uploadResult = await secureStorageService.uploadFile(file, {
        onProgress,
        auditMetadata: {
          uploadType: "HEALTH_DATA",
          category: data.category,
          price: data.price,
        },
      });

      if (!uploadResult.success) {
        throw new Error(
          uploadResult.error || "Failed to upload file to secure storage"
        );
      }

      // Prepare record data
      const recordData = {
        ...data,
        ipfsHash: uploadResult.reference,
        uploadDate: new Date().toISOString(),
      };

      // Save record metadata to backend
      const response = await apiService.post(
        `${this.basePath}/records`,
        recordData
      );

      return {
        success: true,
        record: response.data,
        ipfsHash: uploadResult.reference,
      };
    } catch (error) {
      // Handle error
      errorHandlingService.handleError(error, {
        code: "HEALTH_DATA_UPLOAD_ERROR",
        context: "Health Data Upload",
        userVisible: true,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Purchase health data
   * @param {string} dataId - The ID of the data to purchase
   * @param {Object} options - Purchase options
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseHealthData(dataId, options = {}) {
    try {
      if (!dataId) {
        throw new Error("Data ID is required");
      }

      // Ensure valid token
      await authService.ensureValidToken();

      // Log purchase for HIPAA compliance
      await hipaaComplianceService.createAuditLog("HEALTH_DATA_PURCHASE", {
        action: "PURCHASE",
        dataId,
        timestamp: new Date().toISOString(),
        ...options,
      });

      // Make API request
      const response = await apiService.post(`${this.basePath}/purchase`, {
        dataId,
        timestamp: new Date().toISOString(),
        ...options,
      });

      // Show success notification
      store.dispatch(
        addNotification({
          type: "success",
          message: "Health data purchased successfully",
        })
      );

      return {
        success: true,
        purchase: response.data,
      };
    } catch (error) {
      // Handle error
      errorHandlingService.handleError(error, {
        code: "PURCHASE_ERROR",
        context: "Health Data Purchase",
        userVisible: true,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Download a purchased health record
   * @param {string} recordId - The ID of the record to download
   * @returns {Promise<Blob>} The file data
   */
  async downloadHealthRecord(recordId) {
    try {
      if (!recordId) {
        throw new Error("Record ID is required");
      }

      // Ensure valid token
      await authService.ensureValidToken();

      // Log download for HIPAA compliance
      await hipaaComplianceService.createAuditLog("HEALTH_DATA_DOWNLOAD", {
        action: "DOWNLOAD",
        recordId,
        timestamp: new Date().toISOString(),
      });

      // Make API request
      const response = await apiService.get(
        `${this.basePath}/download/${recordId}`,
        {
          responseType: "blob",
        }
      );

      return {
        success: true,
        data: response.data,
        filename:
          response.headers?.["content-disposition"]?.split("filename=")[1] ||
          `healthdata-${recordId}.json`,
      };
    } catch (error) {
      // Handle error
      errorHandlingService.handleError(error, {
        code: "DOWNLOAD_ERROR",
        context: "Health Record Download",
        userVisible: true,
      });

      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const healthDataService = new HealthDataService();
export default healthDataService;
