// src/utils/mockDataUtils.js
import generateMockHealthRecords from "../mockData/mockHeatlhRecords.js";

/**
 * Constants for storage keys and configuration
 */
const CONSTANTS = {
  STORAGE_KEY: "healthmint_mock_health_data",
  DEFAULT_RECORD_COUNT: 25,
  CACHE_EXPIRY: 60000, // 1 minute in milliseconds
};

/**
 * In-memory cache to reduce localStorage reads
 */
let dataCache = {
  records: null,
  timestamp: 0,
};

/**
 * Mock data utilities for managing health records in development environment
 */
class MockDataManager {
  /**
   * Initialize mock data in localStorage if not present
   * @param {Object} options - Configuration options
   * @param {boolean} options.forceRefresh - Force regeneration of data
   * @param {number} options.recordCount - Number of records to generate
   * @returns {Array} Generated or retrieved mock data
   */
  initializeMockData(options = {}) {
    const {
      forceRefresh = false,
      recordCount = CONSTANTS.DEFAULT_RECORD_COUNT,
    } = options;

    if (forceRefresh) {
      return this._generateAndStore(recordCount);
    }

    const existingData = localStorage.getItem(CONSTANTS.STORAGE_KEY);

    if (!existingData) {
      return this._generateAndStore(recordCount);
    }

    try {
      // Parse and return existing data
      const parsedData = JSON.parse(existingData);
      this._updateCache(parsedData);
      return parsedData;
    } catch (err) {
      console.error("Error parsing stored mock data, regenerating:", err);
      return this._generateAndStore(recordCount);
    }
  }

  /**
   * Get mock health data from cache or localStorage
   * @param {boolean} bypassCache - Whether to bypass the cache
   * @returns {Array} Mock health records
   */
  getMockHealthData(bypassCache = false) {
    // Check cache first if not bypassing
    if (!bypassCache && this._isCacheValid()) {
      return dataCache.records;
    }

    try {
      const storedData = localStorage.getItem(CONSTANTS.STORAGE_KEY);

      if (!storedData) {
        return this.initializeMockData();
      }

      const parsedData = JSON.parse(storedData);
      this._updateCache(parsedData);
      return parsedData;
    } catch (err) {
      console.error("Error retrieving mock data:", err);
      return this._generateAndStore();
    }
  }

  /**
   * Update a mock health record
   * @param {string} recordId - ID of the record to update
   * @param {Object} updateData - New data to apply to the record
   * @returns {Array|null} Updated records array or null if error
   */
  updateMockRecord(recordId, updateData) {
    if (!recordId) {
      console.error("Record ID is required for update");
      return null;
    }

    try {
      const mockData = this.getMockHealthData();
      const recordIndex = mockData.findIndex(
        (record) => record.id === recordId
      );

      if (recordIndex === -1) {
        console.warn(`Record with ID ${recordId} not found`);
        return mockData;
      }

      const updatedData = [...mockData];
      updatedData[recordIndex] = {
        ...updatedData[recordIndex],
        ...updateData,
        lastUpdated: new Date().toISOString(),
      };

      this._storeData(updatedData);
      return updatedData;
    } catch (err) {
      console.error("Error updating mock record:", err);
      return null;
    }
  }

  /**
   * Add a new mock health record
   * @param {Object} newRecord - Record to add
   * @returns {Array|null} Updated records array or null if error
   */
  addMockRecord(newRecord) {
    if (!newRecord || typeof newRecord !== "object") {
      console.error("Valid record object is required");
      return null;
    }

    try {
      const mockData = this.getMockHealthData();

      // Generate ID if not provided
      const id =
        newRecord.id ||
        `record-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Ensure required fields are present
      const recordWithDefaults = {
        id,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        ...newRecord,
      };

      const updatedData = [...mockData, recordWithDefaults];

      this._storeData(updatedData);
      return updatedData;
    } catch (err) {
      console.error("Error adding mock record:", err);
      return null;
    }
  }

  /**
   * Delete a mock health record
   * @param {string} recordId - ID of record to delete
   * @returns {Array|null} Updated records array or null if error
   */
  deleteMockRecord(recordId) {
    if (!recordId) {
      console.error("Record ID is required for deletion");
      return null;
    }

    try {
      const mockData = this.getMockHealthData();
      const recordExists = mockData.some((record) => record.id === recordId);

      if (!recordExists) {
        console.warn(`Record with ID ${recordId} not found for deletion`);
        return mockData;
      }

      const filteredData = mockData.filter((record) => record.id !== recordId);

      this._storeData(filteredData);
      return filteredData;
    } catch (err) {
      console.error("Error deleting mock record:", err);
      return null;
    }
  }

  /**
   * Reset mock data to fresh generated state
   * @param {number} recordCount - Number of records to generate
   * @returns {Array|null} Fresh records array or null if error
   */
  resetMockData(recordCount = CONSTANTS.DEFAULT_RECORD_COUNT) {
    try {
      return this._generateAndStore(recordCount);
    } catch (err) {
      console.error("Error resetting mock data:", err);
      return null;
    }
  }

  /**
   * Perform batch operations on mock records
   * @param {Array} operations - Array of operation objects
   * @returns {Array|null} Updated records array or null if error
   */
  batchOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      console.error("Valid operations array is required");
      return null;
    }

    try {
      let mockData = this.getMockHealthData();

      // Apply each operation
      operations.forEach((op) => {
        switch (op.type) {
          case "add":
            if (op.record) {
              const id =
                op.record.id ||
                `record-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              mockData.push({
                id,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                ...op.record,
              });
            }
            break;
          case "update":
            if (op.id && op.data) {
              const index = mockData.findIndex((record) => record.id === op.id);
              if (index !== -1) {
                mockData[index] = {
                  ...mockData[index],
                  ...op.data,
                  lastUpdated: new Date().toISOString(),
                };
              }
            }
            break;
          case "delete":
            if (op.id) {
              mockData = mockData.filter((record) => record.id !== op.id);
            }
            break;
          default:
            console.warn(`Unknown operation type: ${op.type}`);
        }
      });

      this._storeData(mockData);
      return mockData;
    } catch (err) {
      console.error("Error executing batch operations:", err);
      return null;
    }
  }

  /**
   * Search mock health records by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching records
   */
  searchMockData(criteria = {}) {
    try {
      const mockData = this.getMockHealthData();

      if (Object.keys(criteria).length === 0) {
        return mockData;
      }

      return mockData.filter((record) => {
        return Object.entries(criteria).every(([key, value]) => {
          if (typeof value === "string") {
            // Case-insensitive string search
            return (
              record[key] &&
              record[key].toString().toLowerCase().includes(value.toLowerCase())
            );
          } else {
            // Exact match for non-strings
            return record[key] === value;
          }
        });
      });
    } catch (err) {
      console.error("Error searching mock data:", err);
      return [];
    }
  }

  /**
   * Export mock data to JSON
   * @returns {string|null} JSON string or null if error
   */
  exportData() {
    try {
      const mockData = this.getMockHealthData();
      return JSON.stringify(mockData, null, 2);
    } catch (err) {
      console.error("Error exporting mock data:", err);
      return null;
    }
  }

  /**
   * Import mock data from JSON
   * @param {string} jsonData - JSON string to import
   * @returns {Array|null} Imported records array or null if error
   */
  importData(jsonData) {
    if (!jsonData) {
      console.error("JSON data is required for import");
      return null;
    }

    try {
      const parsedData = JSON.parse(jsonData);

      if (!Array.isArray(parsedData)) {
        throw new Error("Imported data must be an array");
      }

      this._storeData(parsedData);
      return parsedData;
    } catch (err) {
      console.error("Error importing mock data:", err);
      return null;
    }
  }

  /**
   * Clear all mock health data
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      localStorage.removeItem(CONSTANTS.STORAGE_KEY);
      this._updateCache(null);
      return true;
    } catch (err) {
      console.error("Error clearing mock data:", err);
      return false;
    }
  }

  /**
   * Get count of mock records
   * @returns {number} Number of records
   */
  getRecordCount() {
    try {
      const mockData = this.getMockHealthData();
      return mockData.length;
    } catch (err) {
      console.error("Error counting mock records:", err);
      return 0;
    }
  }

  /**
   * Generate new mock data and store it
   * @private
   * @param {number} count - Number of records to generate
   * @returns {Array} Generated records
   */
  _generateAndStore(count = CONSTANTS.DEFAULT_RECORD_COUNT) {
    const freshData = generateMockHealthRecords(count);
    this._storeData(freshData);
    console.log(
      `Mock health data regenerated with ${freshData.length} records`
    );
    return freshData;
  }

  /**
   * Store data in localStorage and update cache
   * @private
   * @param {Array} data - Data to store
   */
  _storeData(data) {
    localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(data));
    this._updateCache(data);
  }

  /**
   * Update the in-memory cache
   * @private
   * @param {Array} data - Data to cache
   */
  _updateCache(data) {
    dataCache.records = data;
    dataCache.timestamp = Date.now();
  }

  /**
   * Check if cache is still valid
   * @private
   * @returns {boolean} Whether cache is valid
   */
  _isCacheValid() {
    return (
      dataCache.records !== null &&
      Date.now() - dataCache.timestamp < CONSTANTS.CACHE_EXPIRY
    );
  }
}

// Create singleton instance
const mockDataUtils = new MockDataManager();

// Export individual functions for tree-shaking
export const {
  initializeMockData,
  getMockHealthData,
  updateMockRecord,
  addMockRecord,
  deleteMockRecord,
  resetMockData,
  batchOperations,
  searchMockData,
  exportData,
  importData,
  clearAllData,
  getRecordCount,
} = mockDataUtils;

// Default export for backward compatibility
export default mockDataUtils;
