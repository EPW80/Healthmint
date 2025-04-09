// src/services/mockDataService.js

import mockDataUtils from "../utils/mockDataUtils.js";

/**
 * Mock Data Service that integrates with the existing app structure
 * while providing more robust error handling for dataset operations
 */
const mockDataService = {
  isInitialized: false,

  /**
   * Initialize the mock data service to load data from mockDataUtils
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log("Initializing mock data service...");
      // Load datasets from mockDataUtils
      this.mockData = mockDataUtils.getMockHealthData();

      // Also ensure we're compatible with the original hardcoded data format
      this.hardcodedDatasets = await this.getAvailableDatasets();

      // Merge datasets for comprehensive coverage
      this.allDatasets = [...this.mockData, ...this.hardcodedDatasets];

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error("Failed to initialize mock data service:", err);
      return false;
    }
  },

  /**
   * Get available datasets (original function for compatibility)
   * @returns {Promise<Array>} Promise that resolves to array of datasets
   */
  getAvailableDatasets: async () => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Return mock datasets based on the original implementation
    return [
      {
        id: "physical-exam-2023",
        title: "Annual Physical Examination",
        description:
          "Comprehensive annual physical examination including vitals, general assessment, and preventative screening recommendations.",
        type: "Physical Exam",
        category: "Physical Exam",
        tags: ["Longitudinal"],
        format: "CSV",
        recordCount: 9730,
        price: 0.3614,
        verified: true,
        anonymized: true,
      },
      {
        id: "complete-blood-count",
        title: "Complete Blood Count (CBC)",
        description:
          "Analysis of red blood cells, white blood cells, and platelets to assess overall health and detect a wide range of disorders.",
        type: "Laboratory",
        category: "Laboratory",
        tags: ["Observational"],
        format: "JSON",
        recordCount: 4944,
        price: 0.4719,
        verified: true,
        anonymized: true,
      },
      {
        id: "lipid-panel",
        title: "Lipid Panel Results",
        description:
          "Measurement of cholesterol levels including HDL, LDL, and triglycerides to assess cardiovascular health.",
        type: "Laboratory",
        category: "Laboratory",
        tags: ["Observational"],
        format: "DICOM",
        recordCount: 692,
        price: 0.4308,
        verified: true,
        anonymized: true,
      },
      {
        id: "blood-pressure-monitoring",
        title: "Blood Pressure Monitoring",
        description:
          "Continuous and spot measurements of systolic and diastolic blood pressure, recorded over various time intervals.",
        type: "Continuous",
        category: "Cardiology",
        tags: ["Longitudinal"],
        format: "CSV",
        recordCount: 7550,
        price: 0.2871,
        verified: true,
        anonymized: true,
      },
      {
        id: "electrocardiogram",
        title: "Electrocardiogram (ECG)",
        description:
          "Recording of the electrical activity of the heart over a period of time to detect heart abnormalities.",
        type: "Cardiology",
        category: "Cardiology",
        tags: ["Clinical"],
        format: "JSON",
        recordCount: 3210,
        price: 0.5102,
        verified: true,
        anonymized: true,
      },
      {
        id: "covid-vaccination",
        title: "COVID-19 Vaccination",
        description:
          "Records of COVID-19 vaccination including vaccine type, date, location, and any reported side effects.",
        type: "Immunization",
        category: "Immunization",
        tags: ["Observational"],
        format: "CSV",
        recordCount: 12405,
        price: 0.2955,
        verified: true,
        anonymized: true,
      },
    ];
  },

  /**
   * Get tiered pricing options for a dataset - FIX FOR THE ERROR
   * @param {string} datasetId - The dataset ID to get tiers for
   * @returns {Promise<Array>} Array of tier objects
   */
  getDatasetTiers: async (datasetId) => {
    // Make sure we're initialized
    if (!mockDataService.isInitialized) {
      await mockDataService.initialize();
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      // Try to find the dataset
      let dataset = null;

      // Check in hardcoded datasets
      const hardcodedDatasets = await mockDataService.getAvailableDatasets();
      dataset = hardcodedDatasets.find((d) => d.id === datasetId);

      // If not found, check in mockData from mockDataUtils
      if (!dataset && mockDataService.mockData) {
        dataset = mockDataService.mockData.find((d) => d.id === datasetId);
      }

      // If dataset not found, return default tiers instead of throwing error
      if (!dataset) {
        console.warn(
          `Dataset with ID ${datasetId} not found when fetching tiers. Using default tiers.`
        );

        // Return default tiers instead of throwing an error
        return [
          {
            id: "basic",
            name: "Basic",
            percentage: 25,
            recordCount: 250,
            price: "0.1250",
            description:
              "25% sample of records, ideal for initial research exploration",
          },
          {
            id: "standard",
            name: "Standard",
            percentage: 50,
            recordCount: 500,
            price: "0.2500",
            description:
              "50% sample with balanced representation of the full dataset",
          },
          {
            id: "complete",
            name: "Complete",
            percentage: 100,
            recordCount: 1000,
            price: "0.5000",
            description: "Full dataset with all available records",
          },
        ];
      }

      // Format price to 4 decimal places
      const formatPrice = (price) => {
        return parseFloat(price).toFixed(4);
      };

      // Calculate tiers based on the dataset
      return [
        {
          id: "basic",
          name: "Basic",
          percentage: 25,
          recordCount: Math.round(dataset.recordCount * 0.25),
          price: formatPrice(dataset.price * 0.25),
          description:
            "25% sample of records, ideal for initial research exploration",
        },
        {
          id: "standard",
          name: "Standard",
          percentage: 50,
          recordCount: Math.round(dataset.recordCount * 0.5),
          price: formatPrice(dataset.price * 0.5),
          description:
            "50% sample with balanced representation of the full dataset",
        },
        {
          id: "complete",
          name: "Complete",
          percentage: 100,
          recordCount: dataset.recordCount,
          price: formatPrice(dataset.price),
          description: "Full dataset with all available records",
        },
      ];
    } catch (error) {
      // Log the error for debugging
      console.error(`Error in getDatasetTiers for ${datasetId}:`, error);

      // Return default tiers in case of any error
      return [
        {
          id: "basic",
          name: "Basic",
          percentage: 25,
          recordCount: 100,
          price: "0.0500",
          description: "Basic tier (error recovery)",
        },
        {
          id: "standard",
          name: "Standard",
          percentage: 50,
          recordCount: 200,
          price: "0.1000",
          description: "Standard tier (error recovery)",
        },
        {
          id: "complete",
          name: "Complete",
          percentage: 100,
          recordCount: 400,
          price: "0.2000",
          description: "Complete tier (error recovery)",
        },
      ];
    }
  },

  /**
   * Purchase a dataset
   * @param {Object} details - Purchase details including datasetId, price, and tier
   * @returns {Promise<Object>} Promise that resolves to purchase result
   */
  purchaseDataset: async (details) => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Simulate API call and blockchain transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Validate wallet connection
      if (!details.walletAddress) {
        return {
          success: false,
          message: "No wallet address provided",
        };
      }

      // Validate required fields
      if (!details.datasetId || !details.price) {
        return {
          success: false,
          message: "Missing required purchase details",
        };
      }

      // Default to complete tier if not specified
      const tier = details.tier || "complete";

      // Try to find the dataset
      let dataset = null;

      // Check in hardcoded datasets
      const hardcodedDatasets = await mockDataService.getAvailableDatasets();
      dataset = hardcodedDatasets.find((d) => d.id === details.datasetId);

      // If not found in hardcoded data, check in mockData
      if (!dataset && mockDataService.mockData) {
        dataset = mockDataService.mockData.find(
          (d) => d.id === details.datasetId
        );
      }

      if (!dataset) {
        return {
          success: false,
          message: `Dataset with ID ${details.datasetId} not found`,
        };
      }

      // Calculate tier-specific details
      let recordCount;
      if (tier === "basic") {
        recordCount = Math.round(dataset.recordCount * 0.25);
      } else if (tier === "standard") {
        recordCount = Math.round(dataset.recordCount * 0.5);
      } else {
        recordCount = dataset.recordCount;
      }

      // Generate a fake transaction hash
      const transactionHash = "0x" + Math.random().toString(16).substr(2, 40);

      return {
        success: true,
        transactionHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 15000000, // Realistic block number
        gasUsed: Math.floor(Math.random() * 100000) + 50000, // Realistic gas used
        datasetId: details.datasetId,
        datasetName: dataset.title,
        tier,
        price: details.price,
        recordCount,
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
        accessUrl: `/my-data/${details.datasetId}`,
      };
    } catch (error) {
      console.error("Error in purchaseDataset:", error);
      return {
        success: false,
        message:
          error.message || "An unexpected error occurred during purchase",
      };
    }
  },

  /**
   * Get dataset preview data
   * @param {string} datasetId - Dataset ID
   * @param {string} tier - Optional tier to preview (defaults to basic sample)
   * @returns {Promise<Object>} Promise that resolves to preview data
   */
  getDatasetPreview: async (datasetId, tier = "basic") => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Determine sample size based on tier
      let sampleSize = 10;
      if (tier === "standard") {
        sampleSize = 15;
      } else if (tier === "complete") {
        sampleSize = 20;
      }

      // Return mock preview data
      return {
        id: datasetId,
        tier,
        sampleSize,
        columns: [
          {
            name: "patient_id",
            type: "string",
            description: "Anonymized patient identifier",
          },
          {
            name: "date",
            type: "date",
            description: "Date of measurement/observation",
          },
          { name: "value", type: "number", description: "Measurement value" },
          { name: "unit", type: "string", description: "Measurement unit" },
          {
            name: "normal_range",
            type: "string",
            description: "Normal reference range",
          },
        ],
        // Sample data differs by dataset
        sampleData: Array(sampleSize)
          .fill(null)
          .map((_, i) => {
            if (datasetId.includes("blood")) {
              return {
                patient_id: `P${1000 + i}`,
                date: new Date(2023, 5, i + 1).toISOString().split("T")[0],
                value: (110 + Math.floor(Math.random() * 30)).toString(),
                unit: "mmHg",
                normal_range: "90-120",
              };
            } else if (datasetId.includes("lipid")) {
              return {
                patient_id: `P${2000 + i}`,
                date: new Date(2023, 6, i + 1).toISOString().split("T")[0],
                value: (150 + Math.floor(Math.random() * 50)).toString(),
                unit: "mg/dL",
                normal_range: "<200",
              };
            } else {
              return {
                patient_id: `P${3000 + i}`,
                date: new Date(2023, 7, i + 1).toISOString().split("T")[0],
                value: (98.1 + Math.random()).toFixed(1),
                unit: "F",
                normal_range: "97.8-99.1",
              };
            }
          }),
      };
    } catch (error) {
      console.error(`Error getting preview for dataset ${datasetId}:`, error);
      // Return minimal sample data instead of throwing
      return {
        id: datasetId,
        tier,
        sampleSize: 3,
        columns: [
          { name: "patient_id", type: "string" },
          { name: "value", type: "number" },
        ],
        sampleData: [
          { patient_id: "P1000", value: "100" },
          { patient_id: "P1001", value: "120" },
          { patient_id: "P1002", value: "110" },
        ],
      };
    }
  },

  /**
   * Get user's purchased datasets
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} Promise that resolves to array of purchased datasets
   */
  getUserPurchasedDatasets: async () => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock purchased datasets for demo purposes
      return [
        {
          id: "physical-exam-2023",
          title: "Annual Physical Examination",
          purchaseDate: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          tier: "standard",
          recordCount: 4865, // 50% of full dataset
          price: "0.1807",
          format: "CSV",
          accessExpires: new Date(
            Date.now() + 25 * 24 * 60 * 60 * 1000
          ).toISOString(),
          transactionHash: "0x" + Math.random().toString(16).substr(2, 40),
        },
        {
          id: "complete-blood-count",
          title: "Complete Blood Count (CBC)",
          purchaseDate: new Date(
            Date.now() - 12 * 24 * 60 * 60 * 1000
          ).toISOString(),
          tier: "complete",
          recordCount: 4944,
          price: "0.4719",
          format: "JSON",
          accessExpires: new Date(
            Date.now() + 18 * 24 * 60 * 60 * 1000
          ).toISOString(),
          transactionHash: "0x" + Math.random().toString(16).substr(2, 40),
        },
        {
          id: "lipid-panel",
          title: "Lipid Panel Results",
          purchaseDate: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          tier: "basic",
          recordCount: 173, // 25% of full dataset
          price: "0.1077",
          format: "DICOM",
          accessExpires: new Date(
            Date.now() + 28 * 24 * 60 * 60 * 1000
          ).toISOString(),
          transactionHash: "0x" + Math.random().toString(16).substr(2, 40),
        },
      ];
    } catch (error) {
      console.error("Error getting purchased datasets:", error);
      return [];
    }
  },

  // Add compatibility methods for any new functions in the enhanced service

  /**
   * Get dataset details (backwards compatibility)
   */
  getDatasetDetails: async (datasetId) => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Try to find the dataset
      let dataset = null;

      // Check in hardcoded datasets
      const hardcodedDatasets = await mockDataService.getAvailableDatasets();
      dataset = hardcodedDatasets.find((d) => d.id === datasetId);

      // If not found in hardcoded data, check in mockData
      if (!dataset && mockDataService.mockData) {
        dataset = mockDataService.mockData.find((d) => d.id === datasetId);
      }

      if (!dataset) {
        console.warn(
          `Dataset with ID ${datasetId} not found when fetching details. Using placeholder data.`
        );

        // Return placeholder data instead of throwing
        return {
          id: datasetId,
          title: "Unavailable Dataset",
          description: "Dataset information is currently unavailable.",
          type: "Unknown",
          category: "Unknown",
          recordCount: 0,
          price: "0.0000",
          verified: false,
          format: "Unknown",
          uploadDate: new Date().toISOString(),
          errorMessage: `Dataset with ID ${datasetId} not found`,
        };
      }

      // Get tiers for the dataset
      const tiers = await mockDataService.getDatasetTiers(datasetId);

      // Return enhanced dataset details
      return {
        ...dataset,
        tiers,
        uploadDate: dataset.uploadDate || new Date().toISOString(),
        sampleData: {
          note: "Sample data available on purchase",
        },
      };
    } catch (error) {
      console.error(`Error fetching details for dataset ${datasetId}:`, error);

      // Return placeholder data instead of throwing
      return {
        id: datasetId,
        title: "Error Loading Dataset",
        description: "An error occurred while loading dataset details.",
        errorMessage: error.message,
      };
    }
  },

  /**
   * Get a download URL for a dataset - avoids hitting non-existent API endpoints
   * @param {string} datasetId - Dataset ID to download
   * @returns {Promise<string>} - Download URL or null
   */
  getDatasetDownloadUrl: async (datasetId) => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to find the dataset
      let dataset = null;

      // Check in hardcoded datasets
      const hardcodedDatasets = await mockDataService.getAvailableDatasets();
      dataset = hardcodedDatasets.find((d) => d.id === datasetId);

      // If not found in hardcoded data, check in mockData
      if (!dataset && mockDataService.mockData) {
        dataset = mockDataService.mockData.find((d) => d.id === datasetId);
      }

      if (!dataset) {
        console.warn(
          `Dataset with ID ${datasetId} not found when generating download URL.`
        );
        return null;
      }

      // In a real app, this would return an actual download URL from the server
      // Since we know the /api/datasets/:id/download endpoint doesn't exist,
      // we'll return a mock URL that will be handled by the downloadDataset method
      return `mock://datasets/${datasetId}/download`;
    } catch (err) {
      console.error("Error generating download URL:", err);
      return null;
    }
  },

  /**
   * Download a dataset without making an API call
   * @param {string} datasetId - Dataset ID to download
   * @param {string} [tierId="complete"] - Tier ID to download
   * @returns {Promise<Object>} - Download result
   */
  downloadDataset: async (datasetId, tierId = "complete") => {
    try {
      // Make sure we're initialized
      if (!mockDataService.isInitialized) {
        await mockDataService.initialize();
      }

      // Simulate download delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Try to find the dataset
      let dataset = null;

      // Check in hardcoded datasets
      const hardcodedDatasets = await mockDataService.getAvailableDatasets();
      dataset = hardcodedDatasets.find((d) => d.id === datasetId);

      // If not found in hardcoded data, check in mockData
      if (!dataset && mockDataService.mockData) {
        dataset = mockDataService.mockData.find((d) => d.id === datasetId);
      }

      if (!dataset) {
        return {
          success: false,
          error: `Dataset with ID ${datasetId} not found in available datasets`,
        };
      }

      // Get tiers info for the dataset
      const tiers = await mockDataService.getDatasetTiers(datasetId);
      const tier =
        tiers.find((t) => t.id === tierId) ||
        tiers.find((t) => t.id === "complete");

      if (!tier) {
        return {
          success: false,
          error: `Tier ${tierId} not available for dataset ${datasetId}`,
        };
      }

      // Generate sample data based on dataset type and tier
      const recordCount = tier.recordCount;
      const recordsToGenerate = Math.min(recordCount, 100); // Cap at 100 records for the mock file

      const mockRecords = [];
      for (let i = 0; i < recordsToGenerate; i++) {
        const record = {};

        // Common fields
        record.id = `record-${i + 1}`;
        record.patient_id = `P${1000 + i}`;
        record.timestamp = new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        ).toISOString();

        // Dataset-specific fields
        if (dataset.category === "Laboratory") {
          record.test_name = dataset.title;
          record.result = Math.floor(Math.random() * 100) + 50;
          record.unit = "mg/dL";
          record.reference_range = "50-150";
          record.is_abnormal = Math.random() > 0.7;
        } else if (dataset.category === "Physical Exam") {
          record.examination_type = "Annual";
          record.height = 170 + Math.floor(Math.random() * 20);
          record.weight = 60 + Math.floor(Math.random() * 40);
          record.temperature = (36.5 + Math.random()).toFixed(1);
          record.blood_pressure = `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`;
          record.heart_rate = 60 + Math.floor(Math.random() * 30);
        } else if (dataset.category === "Cardiology") {
          record.test_type = dataset.title;
          record.heart_rate = 60 + Math.floor(Math.random() * 30);
          record.rhythm = Math.random() > 0.8 ? "Irregular" : "Regular";
          record.pr_interval = 120 + Math.floor(Math.random() * 80);
          record.qrs_duration = 80 + Math.floor(Math.random() * 40);
        } else if (dataset.category === "Immunization") {
          record.vaccine_type = "COVID-19";
          record.manufacturer = ["Pfizer", "Moderna", "Johnson & Johnson"][
            Math.floor(Math.random() * 3)
          ];
          record.dose_number = Math.floor(Math.random() * 3) + 1;
          record.site = ["Left Arm", "Right Arm"][
            Math.floor(Math.random() * 2)
          ];
        } else {
          // Generic fields for other types
          record.description = `Record ${i + 1} for ${dataset.title}`;
          record.value = Math.floor(Math.random() * 100);
          record.notes = "Auto-generated sample data";
        }

        mockRecords.push(record);
      }

      // Create the mock content
      const mockContent = JSON.stringify(
        {
          metadata: {
            id: dataset.id,
            title: dataset.title,
            category: dataset.category,
            recordCount: tier.recordCount,
            tier: tier.id,
            tier_name: tier.name,
            format: dataset.format,
            timestamp: new Date().toISOString(),
            downloadId: `download-${Date.now()}`,
            description: dataset.description,
            provider: "Healthmint Mock Data Service",
          },
          records: mockRecords,
          statistics: {
            record_count: recordsToGenerate,
            formats: [dataset.format],
            record_types: [dataset.category],
          },
        },
        null,
        2
      );

      // Determine file extension based on format
      let fileExt = "json";
      if (dataset.format === "CSV") {
        fileExt = "csv";
      } else if (dataset.format === "DICOM") {
        fileExt = "dcm";
      }

      // Create file name
      const fileName =
        `${dataset.title || "dataset"}-${datasetId}-${tier.id}.${fileExt}`
          .replace(/\s+/g, "_")
          .toLowerCase();

      // Create blob and download
      const blob = new Blob([mockContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create a temporary link element to download the file
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      return {
        success: true,
        downloadId: `download-${Date.now()}`,
        fileName: fileName,
        timestamp: new Date().toISOString(),
        tierInfo: tier,
        datasetInfo: {
          id: dataset.id,
          title: dataset.title,
          category: dataset.category,
        },
      };
    } catch (err) {
      console.error("Error downloading dataset:", err);
      return {
        success: false,
        error: err.message || "An error occurred during download",
      };
    }
  },
};

// Export the singleton instance
export default mockDataService;
