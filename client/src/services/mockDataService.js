// src/services/mockDataService.js
import mockDataUtils from "../utils/mockDataUtils.js";

const mockDataService = {
  isInitialized: false,

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

      // Generate download URL based on dataset format
      return `mock://datasets/${datasetId}/download`;
    } catch (err) {
      console.error("Error generating download URL:", err);
      return null;
    }
  },

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

// Mock function to get dataset tiers
const getDatasetConditions = async (datasetId) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API delay

    // Sample conditions - in a real app, these would come from an API
    return [
      { id: "hypertension", name: "Hypertension" },
      { id: "diabetes", name: "Diabetes" },
      { id: "asthma", name: "Asthma" },
      { id: "copd", name: "COPD" },
      { id: "arthritis", name: "Arthritis" },
      { id: "depression", name: "Depression" },
      { id: "cancer", name: "Cancer" },
      { id: "heartdisease", name: "Heart Disease" },
    ];
  } catch (error) {
    console.error("Error fetching dataset conditions:", error);
    throw new Error("Failed to load medical conditions");
  }
};

// Mock function to get dataset record types
const getDatasetRecordTypes = async (datasetId) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API delay

    // Sample record types - in a real app, these would come from an API
    return [
      { id: "labresults", name: "Lab Results" },
      { id: "medications", name: "Medications" },
      { id: "vitals", name: "Vital Signs" },
      { id: "imaging", name: "Imaging" },
      { id: "procedures", name: "Procedures" },
      { id: "allergies", name: "Allergies" },
      { id: "immunizations", name: "Immunizations" },
      { id: "visits", name: "Office Visits" },
    ];
  } catch (error) {
    console.error("Error fetching dataset record types:", error);
    throw new Error("Failed to load record types");
  }
};

// Mock function to get dataset details
const previewFilteredSubset = async (datasetId, filters) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate processing delay

    // Get the original dataset to base calculations on
    // Instead of relying on getDatasetDetails(), we'll fetch from localStorage or use defaults
    let dataset;
    try {
      // Try to find the dataset in the mock health data in localStorage
      const allDatasets = JSON.parse(
        localStorage.getItem("healthmint_mock_health_data") || "[]"
      );
      dataset = allDatasets.find((d) => d.id === datasetId);
    } catch (e) {
      console.error("Error accessing mock data:", e);
    }

    // If dataset wasn't found, use default values
    if (!dataset) {
      dataset = {
        recordCount: 10000,
        title: "Unknown Dataset",
        category: "General Health",
        price: "0.05",
      };
    }

    // Calculate a realistic record count based on filters
    let recordCount = dataset.recordCount || 10000;
    let patientCount = Math.ceil(recordCount / 12); // Assume 12 records per patient on average

    // Apply age range filter
    if (filters.ageRange.min || filters.ageRange.max) {
      const ageRangeMin = parseInt(filters.ageRange.min) || 0;
      const ageRangeMax = parseInt(filters.ageRange.max) || 100;
      const ageSpan = ageRangeMax - ageRangeMin;
      const fullAgeSpan = 100; // Assume original dataset has ages 0-100
      const ageRatio = Math.min(ageSpan / fullAgeSpan, 1);
      recordCount = Math.floor(recordCount * ageRatio * 0.9); // Apply a 0.9 factor to account for age distribution
      patientCount = Math.floor(patientCount * ageRatio * 0.9);
    }

    // Apply gender filter
    if (filters.gender && filters.gender !== "all") {
      // Assume roughly even distribution of genders
      recordCount = Math.floor(recordCount * 0.5);
      patientCount = Math.floor(patientCount * 0.5);
    }

    // Apply time range filter
    if (filters.timeRange.start || filters.timeRange.end) {
      const start = filters.timeRange.start
        ? new Date(filters.timeRange.start).getTime()
        : new Date("2015-01-01").getTime();

      const end = filters.timeRange.end
        ? new Date(filters.timeRange.end).getTime()
        : new Date().getTime();

      const timeSpan = end - start;
      const fullTimeSpan =
        new Date().getTime() - new Date("2015-01-01").getTime();
      const timeRatio = Math.min(timeSpan / fullTimeSpan, 1);

      recordCount = Math.floor(recordCount * timeRatio);
    }

    // Apply conditions filter
    if (filters.conditions && filters.conditions.length > 0) {
      // Each condition selected narrows the dataset
      const conditionRatio = 0.7 - 0.1 * (filters.conditions.length - 1);
      recordCount = Math.floor(recordCount * Math.max(conditionRatio, 0.2));
      patientCount = Math.floor(patientCount * Math.max(conditionRatio, 0.2));
    }

    // Apply record types filter
    if (filters.recordTypes && filters.recordTypes.length > 0) {
      // Selecting specific record types reduces dataset size
      const typeRatio = filters.recordTypes.length / 8; // Assume 8 total record types
      recordCount = Math.floor(recordCount * typeRatio);
    }

    // Random variance to make it look realistic
    const variance = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    recordCount = Math.max(10, Math.floor(recordCount * variance));
    patientCount = Math.max(1, Math.floor(patientCount * variance));

    // Return preview data
    return {
      parentDatasetId: datasetId,
      recordCount: recordCount,
      patientCount: patientCount,
      appliedFilters: { ...filters },
      estimatedSize: `${((recordCount * 0.5) / 1024).toFixed(1)} MB`,
      previewGenerated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error previewing filtered subset:", error);
    throw new Error("Failed to preview filtered subset");
  }
};

// Mock function to create a filtered subset
const createFilteredSubset = async (datasetId, subsetMetadata) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing delay

    // Generate a unique ID for the subset
    const subsetId = `subset-${datasetId}-${Date.now()}`;

    // Create the subset object
    const subset = {
      id: subsetId,
      parentDatasetId: datasetId,
      name: subsetMetadata.name,
      filters: subsetMetadata.filters,
      recordCount: subsetMetadata.recordCount,
      price: subsetMetadata.price,
      createdAt: new Date().toISOString(),
      userId: subsetMetadata.userId,
      purchased: false,
      metadata: {
        generationTime: `${Math.floor(Math.random() * 60) + 10} seconds`,
        processing: "complete",
        parentDatasetName: subsetMetadata.parentDatasetName || "Parent Dataset",
      },
    };

    // In a real app, this would be saved to a database
    // Here we'll simulate by storing in localStorage
    try {
      const existingSubsets = JSON.parse(
        localStorage.getItem("healthmint_filtered_subsets") || "[]"
      );
      existingSubsets.push(subset);
      localStorage.setItem(
        "healthmint_filtered_subsets",
        JSON.stringify(existingSubsets)
      );
    } catch (e) {
      console.error("Error saving subset to localStorage:", e);
    }

    return subset;
  } catch (error) {
    console.error("Error creating filtered subset:", error);
    throw new Error("Failed to create filtered subset");
  }
};

// Mock function to download a filtered subset
const downloadSubset = async (subsetId, parentDatasetId) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate download delay

    // Simulate a successful download
    return {
      success: true,
      subsetId,
      parentDatasetId,
      downloadedAt: new Date().toISOString(),
      format: "CSV",
      fileSize: "12.4 MB",
    };
  } catch (error) {
    console.error("Error downloading subset:", error);
    throw new Error("Failed to download subset");
  }
};

// Assign the object to a variable first
const exportedService = {
  ...mockDataService, // Mock data service methods
  getDatasetConditions,
  getDatasetRecordTypes,
  previewFilteredSubset,
  createFilteredSubset,
  downloadSubset,
};

// Export the variable as default
export default exportedService;
