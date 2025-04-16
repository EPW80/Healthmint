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

class HealthDataService {
  constructor() {
    this.basePath = "/api/data";
    this.cachedDataKey = "healthmint_cached_data";
    this.isProduction = process.env.NODE_ENV === "production";
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL
  }

  async fetchPatientRecords(options = {}) {
    const actionId = `fetchPatientRecords_${Date.now()}`;
    try {
      // Ensure valid token
      const token = await authService.ensureValidToken();

      // Check cache first in non-production or if specified
      const cacheKey = `${this.cachedDataKey}_patient_${JSON.stringify(options)}`;
      if (!this.isProduction && !options.forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < this.cacheTTL) {
            console.log("[HealthDataService] Using cached patient records");
            store.dispatch(setUserRecords(data));
            return data;
          }
        }
      }

      // Log access for HIPAA compliance
      await hipaaComplianceService.createAuditLog("HEALTH_RECORDS_ACCESS", {
        action: "VIEW",
        timestamp: new Date().toISOString(),
        filters: JSON.stringify(options),
        actionId,
      });

      store.dispatch(setLoading(true));

      // Make API request with token
      const response = await apiService.get(
        `${this.basePath}/patient/records`,
        {
          ...options,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response || !response.data) {
        throw new Error("No patient records returned from API");
      }

      // Sanitize data for HIPAA compliance
      const sanitizedRecords = response.data.map((record) =>
        hipaaComplianceService.sanitizeData(record, {
          mode: options.includeIdentifiers ? "default" : "mask",
        })
      );

      // Cache result if not in production
      if (!this.isProduction) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: sanitizedRecords, timestamp: Date.now() })
        );
      }

      // Update Redux store
      store.dispatch(setUserRecords(sanitizedRecords));

      return sanitizedRecords;
    } catch (error) {
      const handledError = errorHandlingService.handleError(error, {
        code: "HEALTH_RECORDS_ERROR",
        context: "Health Records",
        userVisible: true,
        actionId,
      });

      store.dispatch(setError(handledError.userMessage));
      store.dispatch(
        addNotification({
          type: "error",
          message: handledError.userMessage,
        })
      );

      return [];
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  async fetchHealthRecordDetails(recordId) {
    const actionId = `fetchHealthRecordDetails_${recordId}`;
    try {
      if (!recordId) throw new Error("Record ID is required");

      const token = await authService.ensureValidToken();

      await hipaaComplianceService.logDataAccess(
        recordId,
        "Viewing detailed health record",
        "VIEW",
        { actionId }
      );

      const response = await apiService.get(
        `${this.basePath}/record/${recordId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response || !response.data) {
        throw new Error("Record not found");
      }

      return hipaaComplianceService.sanitizeData(response.data);
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "RECORD_DETAILS_ERROR",
        context: "Health Record Details",
        userVisible: true,
        actionId,
      });
      return null;
    }
  }

  async fetchResearchData(filters = {}) {
    const actionId = `fetchResearchData_${Date.now()}`;
    try {
      const token = await authService.ensureValidToken();

      await hipaaComplianceService.createAuditLog("RESEARCH_DATA_ACCESS", {
        action: "SEARCH",
        timestamp: new Date().toISOString(),
        filters: JSON.stringify(filters),
        actionId,
      });

      store.dispatch(setLoading(true));

      const response = await apiService.get(`${this.basePath}/research`, {
        ...filters,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response || !response.data) {
        return { datasets: [], total: 0 };
      }

      const sanitizedData = response.data.map((dataset) =>
        hipaaComplianceService.sanitizeData(dataset, { mode: "mask" })
      );

      store.dispatch(setHealthRecords(sanitizedData));

      return {
        datasets: sanitizedData,
        total: response.total || sanitizedData.length,
      };
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "RESEARCH_DATA_ERROR",
        context: "Research Data",
        userVisible: true,
        actionId,
      });
      return { datasets: [], total: 0 };
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  async uploadHealthData(data, file, onProgress = () => {}) {
    const actionId = `uploadHealthData_${Date.now()}`;
    try {
      if (!data || !file) throw new Error("Both data and file are required");

      const token = await authService.ensureValidToken();

      const phiCheck = hipaaComplianceService.checkForPHI(JSON.stringify(data));
      if (phiCheck.hasPHI && !data.anonymized) {
        store.dispatch(
          addNotification({
            type: "warning",
            message:
              "Potential PHI detected. Ensure data is anonymized or de-identified.",
          })
        );
      }

      await hipaaComplianceService.createAuditLog("HEALTH_DATA_UPLOAD", {
        action: "UPLOAD",
        timestamp: new Date().toISOString(),
        category: data.category,
        fileType: file.type,
        fileSize: file.size,
        isAnonymized: Boolean(data.anonymized),
        actionId,
      });

      const uploadResult = await secureStorageService.uploadFile(file, {
        onProgress,
        auditMetadata: {
          uploadType: "HEALTH_DATA",
          category: data.category,
          price: data.price,
        },
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "File upload failed");
      }

      const recordData = {
        ...data,
        ipfsHash: uploadResult.reference,
        uploadDate: new Date().toISOString(),
      };

      const response = await apiService.post(
        `${this.basePath}/records`,
        recordData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return {
        success: true,
        record: response.data,
        ipfsHash: uploadResult.reference,
      };
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "HEALTH_DATA_UPLOAD_ERROR",
        context: "Health Data Upload",
        userVisible: true,
        actionId,
      });
      return { success: false, error: error.message };
    }
  }

  async purchaseHealthData(dataId, options = {}) {
    const actionId = `purchaseHealthData_${dataId}`;
    try {
      if (!dataId) throw new Error("Data ID is required");

      const token = await authService.ensureValidToken();

      await hipaaComplianceService.createAuditLog("HEALTH_DATA_PURCHASE", {
        action: "PURCHASE",
        dataId,
        timestamp: new Date().toISOString(),
        ...options,
        actionId,
      });

      const response = await apiService.post(
        `${this.basePath}/purchase`,
        {
          dataId,
          timestamp: new Date().toISOString(),
          ...options,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
      errorHandlingService.handleError(error, {
        code: "PURCHASE_ERROR",
        context: "Health Data Purchase",
        userVisible: true,
        actionId,
      });
      return { success: false, error: error.message };
    }
  }

  async downloadHealthRecord(recordId) {
    const actionId = `downloadHealthRecord_${recordId}`;
    try {
      if (!recordId) throw new Error("Record ID is required");

      const token = await authService.ensureValidToken();

      await hipaaComplianceService.createAuditLog("HEALTH_DATA_DOWNLOAD", {
        action: "DOWNLOAD",
        recordId,
        timestamp: new Date().toISOString(),
        actionId,
      });

      const response = await apiService.get(
        `${this.basePath}/download/${recordId}`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response || !response.data) {
        throw new Error("Failed to retrieve record data");
      }

      return {
        success: true,
        data: response.data,
        filename:
          response.headers?.["content-disposition"]?.split("filename=")[1] ||
          `healthdata-${recordId}.json`,
      };
    } catch (error) {
      errorHandlingService.handleError(error, {
        code: "DOWNLOAD_ERROR",
        context: "Health Record Download",
        userVisible: true,
        actionId,
      });
      return { success: false, error: error.message };
    }
  }
}

const healthDataService = new HealthDataService();
export default healthDataService;
