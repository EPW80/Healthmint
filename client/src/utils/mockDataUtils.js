// src/utils/mockDataUtils.js
import generateMockHealthRecords from "../mockData/mockHeatlhRecords.js";

/**
 * Utility functions for managing mock health data
 */
const mockDataUtils = {
  /**
   * Initialize mock data in local storage if it doesn't exist
   */
  initializeMockData: () => {
    const existingData = localStorage.getItem("healthmint_mock_health_data");

    if (!existingData) {
      const mockData = generateMockHealthRecords();
      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(mockData)
      );
      console.log("Mock health data initialized with 25 records");
      return mockData;
    }

    try {
      // Parse and return existing data
      return JSON.parse(existingData);
    } catch (err) {
      console.error("Error parsing stored mock data, regenerating:", err);
      const freshMockData = generateMockHealthRecords();
      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(freshMockData)
      );
      return freshMockData;
    }
  },

  /**
   * Get persisted mock data or generate new if none exists
   */
  getMockHealthData: () => {
    try {
      const storedData = localStorage.getItem("healthmint_mock_health_data");

      if (!storedData) {
        return mockDataUtils.initializeMockData();
      }

      return JSON.parse(storedData);
    } catch (err) {
      console.error("Error retrieving mock data:", err);
      return generateMockHealthRecords();
    }
  },

  /**
   * Update a mock record in local storage
   */
  updateMockRecord: (recordId, updateData) => {
    try {
      const mockData = mockDataUtils.getMockHealthData();
      const updatedData = mockData.map((record) =>
        record.id === recordId ? { ...record, ...updateData } : record
      );

      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(updatedData)
      );
      return updatedData;
    } catch (err) {
      console.error("Error updating mock record:", err);
      return null;
    }
  },

  /**
   * Add a new mock record to local storage
   */
  addMockRecord: (newRecord) => {
    try {
      const mockData = mockDataUtils.getMockHealthData();
      const updatedData = [
        ...mockData,
        {
          ...newRecord,
          id: newRecord.id || `record-${Date.now()}-${mockData.length}`,
        },
      ];

      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(updatedData)
      );
      return updatedData;
    } catch (err) {
      console.error("Error adding mock record:", err);
      return null;
    }
  },

  /**
   * Delete a mock record from local storage
   */
  deleteMockRecord: (recordId) => {
    try {
      const mockData = mockDataUtils.getMockHealthData();
      const filteredData = mockData.filter((record) => record.id !== recordId);

      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(filteredData)
      );
      return filteredData;
    } catch (err) {
      console.error("Error deleting mock record:", err);
      return null;
    }
  },

  /**
   * Reset mock data with fresh generated data
   */
  resetMockData: () => {
    try {
      const freshData = generateMockHealthRecords();
      localStorage.setItem(
        "healthmint_mock_health_data",
        JSON.stringify(freshData)
      );
      return freshData;
    } catch (err) {
      console.error("Error resetting mock data:", err);
      return null;
    }
  },
};

export default mockDataUtils;
