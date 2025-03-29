// client/src/utils/dataMigrationUtils.js
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import apiConfig from "../config/apiConfig.js";

/**
 * Data Migration Utility
 *
 * Provides functions to handle the transition from mock to real data
 * and ensures proper data formatting for HIPAA compliance
 */

/**
 * Converts a mock health record format to the standardized backend format
 * @param {Object} mockRecord - Record in mock format
 * @returns {Object} Standardized record
 */
export const convertMockToStandardFormat = (mockRecord) => {
  // Create audit log for data transformation
  hipaaComplianceService.createAuditLog("DATA_TRANSFORMATION", {
    action: "CONVERT",
    recordId: mockRecord.id,
    timestamp: new Date().toISOString(),
  });

  // Standard format expected by the backend
  return {
    id: mockRecord.id,
    title: mockRecord.title || mockRecord.category,
    category: mockRecord.category,
    description: mockRecord.description || "",
    uploadDate: mockRecord.uploadDate || new Date().toISOString(),
    ipfsHash: mockRecord.ipfsHash || null,
    price: mockRecord.price || "0",
    fileFormat: mockRecord.format || "JSON",
    recordCount: mockRecord.recordCount || 1,
    verified: Boolean(mockRecord.verified),
    anonymized: Boolean(mockRecord.anonymized),
    metadata: {
      studyType: mockRecord.studyType || null,
      tags: mockRecord.tags || [],
      patientAge: mockRecord.age || null,
      ...(mockRecord.metadata || {}),
    },
  };
};

/**
 * Imports mock data to the backend
 * @param {Array} mockData - Array of mock records
 * @returns {Promise<Object>} Import results
 */
export const importMockDataToBackend = async (mockData) => {
  try {
    if (!Array.isArray(mockData) || mockData.length === 0) {
      throw new Error("No valid mock data to import");
    }

    // Don't allow this in production
    if (apiConfig.ENV.NODE_ENV === "production") {
      throw new Error("Mock data import is not allowed in production");
    }

    // Create HIPAA-compliant audit log
    await hipaaComplianceService.createAuditLog("MOCK_DATA_IMPORT", {
      action: "IMPORT",
      recordCount: mockData.length,
      timestamp: new Date().toISOString(),
    });

    console.log(`Importing ${mockData.length} mock records to backend...`);

    // Convert all records to standard format
    const standardRecords = mockData.map(convertMockToStandardFormat);

    // This would normally make a backend API call, but for now
    // we'll just return the converted data
    return {
      success: true,
      importedCount: standardRecords.length,
      records: standardRecords,
    };
  } catch (error) {
    console.error("Mock data import error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if user has any health data
 * @param {Array} records - User health records
 * @returns {boolean} Whether user has health data
 */
export const hasHealthData = (records) => {
  return Array.isArray(records) && records.length > 0;
};

/**
 * Generate mock data stats based on user records
 * @param {Array} records - Health records
 * @param {string} userRole - User role
 * @returns {Object} Stats object
 */
export const generateDataStats = (records, userRole) => {
  if (!Array.isArray(records)) {
    records = [];
  }

  if (userRole === "patient") {
    return {
      totalRecords: records.length,
      sharedRecords: records.filter((r) => r.shared).length,
      pendingRequests: Math.floor(Math.random() * 3), // Mock value
      securityScore: 85,
    };
  } else {
    return {
      datasetsAccessed: records.length,
      activeStudies: Math.floor(Math.random() * 5) + 1, // Mock value
      pendingRequests: Math.floor(Math.random() * 4), // Mock value
      totalSpent: records
        .reduce((sum, r) => sum + parseFloat(r.price || 0), 0)
        .toFixed(2),
    };
  }
};

/**
 * Migrate local health data to the backend
 * This is a utility function for one-time migration
 * @returns {Promise<Object>} Migration result
 */
export const migrateLocalHealthData = async () => {
  try {
    const mockHealthDataKey = "healthmint_mock_health_data";
    const localData = localStorage.getItem(mockHealthDataKey);

    if (!localData) {
      return { success: false, message: "No local health data found" };
    }

    // Create HIPAA-compliant audit log
    await hipaaComplianceService.createAuditLog("LOCAL_DATA_MIGRATION", {
      action: "MIGRATE",
      timestamp: new Date().toISOString(),
    });

    // Parse local data
    const parsedData = JSON.parse(localData);

    // Import to backend
    const result = await importMockDataToBackend(parsedData);

    if (result.success) {
      // Clear local data after successful migration
      localStorage.removeItem(mockHealthDataKey);
    }

    return result;
  } catch (error) {
    console.error("Error migrating local health data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Default export with all utility functions
export default {
  convertMockToStandardFormat,
  importMockDataToBackend,
  hasHealthData,
  generateDataStats,
  migrateLocalHealthData,
};
