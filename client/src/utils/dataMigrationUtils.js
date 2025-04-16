// client/src/utils/dataMigrationUtils.js
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import apiConfig from "../config/apiConfig.js";

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

export const hasHealthData = (records) => {
  return Array.isArray(records) && records.length > 0;
};

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

export default {
  convertMockToStandardFormat,
  importMockDataToBackend,
  hasHealthData,
  generateDataStats,
  migrateLocalHealthData,
};
