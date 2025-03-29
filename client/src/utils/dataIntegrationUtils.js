// client/src/utils/dataIntegrationUtils.js
/**
 * Data Integration Utilities
 *
 * This module provides functions to integrate health data from various sources
 * and ensure HIPAA compliance throughout the process.
 */

import apiConfig from "../config/apiConfig.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import errorHandlingService from "../services/errorHandlingService.js";

// Define source types with proper HIPAA compliance requirements
const SOURCE_TYPES = {
  ELECTRONIC_HEALTH_RECORD: "ehr",
  PATIENT_UPLOADED: "patient_uploaded",
  RESEARCH_DATASET: "research_dataset",
  WEARABLE_DEVICE: "wearable_device",
  LABORATORY_RESULTS: "lab_results",
  IMAGING_DATA: "imaging",
};

/**
 * Validates health data for HIPAA compliance
 * @param {Object} data - The health data to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation results
 */
export const validateHealthData = (data, options = {}) => {
  try {
    if (!data) {
      return { valid: false, errors: ["No data provided"] };
    }

    const errors = [];
    const warnings = [];

    // Check for required fields
    const requiredFields = ["category"];
    requiredFields.forEach((field) => {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Check for PHI (Protected Health Information)
    const phiCheck = hipaaComplianceService.checkForPHI(JSON.stringify(data));
    if (phiCheck.hasPHI && !data.anonymized) {
      warnings.push(
        `Potential PHI detected in fields: ${phiCheck.types.join(", ")}. Consider anonymizing this data.`
      );
    }

    // Check de-identification if data claims to be anonymized
    if (data.anonymized) {
      const deIdVerification =
        hipaaComplianceService.verifyDeIdentification(data);
      if (!deIdVerification.isDeIdentified) {
        errors.push(
          `Data claims to be anonymized but contains identifiers: ${deIdVerification.issues.map((i) => i.field).join(", ")}`
        );
      }
    }

    // Log validation results for HIPAA compliance
    hipaaComplianceService.createAuditLog("DATA_VALIDATION", {
      action: "VALIDATE",
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      timestamp: new Date().toISOString(),
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error("Health data validation error:", error);
    return {
      valid: false,
      errors: [error.message || "Unknown validation error"],
      warnings: [],
    };
  }
};

/**
 * Processes health data from external sources
 * @param {Object} data - The data to process
 * @param {string} sourceType - Source type from SOURCE_TYPES
 * @returns {Object} Processed data
 */
export const processExternalHealthData = async (data, sourceType) => {
  try {
    if (!data) {
      throw new Error("No data provided");
    }

    if (!Object.values(SOURCE_TYPES).includes(sourceType)) {
      throw new Error(`Invalid source type: ${sourceType}`);
    }

    // Create audit log for data processing
    await hipaaComplianceService.createAuditLog("EXTERNAL_DATA_PROCESSING", {
      action: "PROCESS",
      sourceType,
      timestamp: new Date().toISOString(),
    });

    // Different processing based on source type
    let processedData = { ...data };

    switch (sourceType) {
      case SOURCE_TYPES.ELECTRONIC_HEALTH_RECORD:
        // Process EHR data - typically needs normalization
        processedData = normalizeEHRData(data);
        break;

      case SOURCE_TYPES.PATIENT_UPLOADED:
        // Process patient-uploaded data - needs verification
        processedData = verifyPatientData(data);
        break;

      case SOURCE_TYPES.WEARABLE_DEVICE:
        // Process wearable device data - typically time series
        processedData = processWearableData(data);
        break;

      case SOURCE_TYPES.LABORATORY_RESULTS:
        // Process lab results - typically structured values
        processedData = processLabResults(data);
        break;

      default:
        // Default processing
        processedData = data;
    }

    // Add metadata
    processedData.metadata = {
      ...processedData.metadata,
      processedAt: new Date().toISOString(),
      sourceType,
      processingVersion: "1.0.0",
    };

    // Validate the processed data
    const validation = validateHealthData(processedData);

    if (!validation.valid) {
      throw new Error(
        `Processed data validation failed: ${validation.errors.join(", ")}`
      );
    }

    return {
      success: true,
      data: processedData,
      validation,
    };
  } catch (error) {
    // Handle error with service
    errorHandlingService.handleError(error, {
      code: "DATA_PROCESSING_ERROR",
      context: "External Health Data Processing",
      userVisible: false,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Normalizes Electronic Health Record data
 * @param {Object} data - The EHR data to normalize
 * @returns {Object} Normalized data
 */
function normalizeEHRData(data) {
  // Implementation would convert EHR-specific formats to standard format
  return {
    ...data,
    normalized: true,
  };
}

/**
 * Verifies patient-uploaded health data
 * @param {Object} data - The patient data to verify
 * @returns {Object} Verified data
 */
function verifyPatientData(data) {
  // Implementation would add verification flags
  return {
    ...data,
    verified: false, // Start unverified
    needsVerification: true,
    patientUploaded: true,
  };
}

/**
 * Processes wearable device data
 * @param {Object} data - The wearable data to process
 * @returns {Object} Processed data
 */
function processWearableData(data) {
  // Implementation would typically handle time series data
  return {
    ...data,
    dataType: "timeSeries",
    processed: true,
  };
}

/**
 * Processes laboratory results
 * @param {Object} data - The lab results to process
 * @returns {Object} Processed lab results
 */
function processLabResults(data) {
  // Implementation would handle lab-specific data
  return {
    ...data,
    category: "Laboratory",
    processed: true,
  };
}

/**
 * Integrates health data from different sources
 * @param {Array} dataSources - Array of data sources to integrate
 * @returns {Promise<Object>} Integrated data result
 */
export const integrateHealthData = async (dataSources) => {
  try {
    if (!Array.isArray(dataSources) || dataSources.length === 0) {
      throw new Error("No data sources provided");
    }

    // Create audit log for data integration
    await hipaaComplianceService.createAuditLog("HEALTH_DATA_INTEGRATION", {
      action: "INTEGRATE",
      sourceCount: dataSources.length,
      timestamp: new Date().toISOString(),
    });

    // Process each data source
    const processedResults = await Promise.all(
      dataSources.map(async (source) => {
        // Skip invalid sources
        if (!source.data || !source.type) {
          return { success: false, error: "Invalid data source" };
        }

        // Process the source data
        return processExternalHealthData(source.data, source.type);
      })
    );

    // Filter successful results
    const successfulResults = processedResults.filter(
      (result) => result.success
    );

    if (successfulResults.length === 0) {
      throw new Error("No data sources were successfully processed");
    }

    // Combine the data (implementation depends on data structure)
    // This is a simplified version
    const integratedData = {
      sources: successfulResults.map((result) => result.data),
      metadata: {
        integratedAt: new Date().toISOString(),
        sourceCount: successfulResults.length,
        version: "1.0.0",
      },
    };

    return {
      success: true,
      data: integratedData,
      processedCount: successfulResults.length,
      totalCount: dataSources.length,
    };
  } catch (error) {
    // Handle error with service
    errorHandlingService.handleError(error, {
      code: "DATA_INTEGRATION_ERROR",
      context: "Health Data Integration",
      userVisible: false,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// Default export
export default {
  SOURCE_TYPES,
  validateHealthData,
  processExternalHealthData,
  integrateHealthData,
};
