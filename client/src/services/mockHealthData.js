// src/services/mockDataService.js
/**
 * Mock Data Service
 *
 * Provides consistent mock data for UI development before blockchain integration
 * This service adheres to HIPAA compliance guidelines for handling health data
 */

// Mock categories and study types
export const CATEGORIES = [
  "All",
  "General Health",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Laboratory",
  "Radiology",
  "Genetics",
  "Mental Health",
  "Dental",
];

export const STUDY_TYPES = [
  "All Types",
  "Clinical Trial",
  "Observational",
  "Longitudinal",
  "Cross-sectional",
  "Case Control",
  "Cohort",
  "Meta-analysis",
];

// Mock health records for patient dashboard
export const MOCK_HEALTH_RECORDS = [
  {
    id: "record-1",
    category: "General Health",
    title: "Annual Physical Examination",
    description: "Results from annual physical including vitals and lab work",
    uploadDate: "2024-03-15",
    verified: true,
    recordCount: 45,
    price: "0.05",
    format: "PDF",
    anonymized: true,
  },
  {
    id: "record-2",
    category: "Cardiology",
    title: "Echocardiogram Results",
    description:
      "Cardiac ultrasound assessment of heart structure and function",
    uploadDate: "2024-02-28",
    verified: true,
    recordCount: 12,
    price: "0.08",
    format: "DICOM",
    anonymized: true,
  },
  {
    id: "record-3",
    category: "Laboratory",
    title: "Blood Panel Analysis",
    description: "Complete blood count, metabolic panel, and lipid profile",
    uploadDate: "2024-03-20",
    verified: false,
    recordCount: 18,
    price: "0.03",
    format: "CSV",
    anonymized: true,
  },
  {
    id: "record-4",
    category: "Radiology",
    title: "Chest X-Ray Images",
    description: "Standard posteroanterior and lateral view radiographs",
    uploadDate: "2024-01-15",
    verified: true,
    recordCount: 2,
    price: "0.1",
    format: "DICOM",
    anonymized: true,
  },
  {
    id: "record-5",
    category: "Genetics",
    title: "DNA Sequencing Report",
    description: "Targeted panel for hereditary disease risk factors",
    uploadDate: "2024-02-10",
    verified: true,
    recordCount: 356,
    price: "0.25",
    format: "JSON",
    anonymized: true,
  },
];

// Mock study datasets for researcher dashboard
export const MOCK_RESEARCH_DATASETS = [
  {
    id: "dataset-1",
    title: "Cardiac Health in Adults 40-60",
    category: "Cardiology",
    description:
      "Longitudinal dataset of cardiac markers across 5 years for middle-aged adults",
    studyType: "Longitudinal",
    recordCount: 5430,
    format: "CSV",
    price: "0.15",
    verified: true,
    uploadDate: "2024-02-18",
    anonymized: true,
    tags: ["cardiac", "longitudinal", "middle-age", "biomarkers"],
    sampleData: {
      patientId: "XXXX-1234",
      age: 52,
      gender: "Female",
      systolic: 125,
      diastolic: 82,
      cholesterol_total: 198,
      hdl: 55,
      ldl: 120,
      triglycerides: 150,
      blood_glucose: 92,
    },
  },
  {
    id: "dataset-2",
    title: "Pediatric Vaccination Response",
    category: "Pediatrics",
    description:
      "Immune response data for standard childhood vaccinations across diverse demographics",
    studyType: "Observational",
    recordCount: 8950,
    format: "JSON",
    price: "0.18",
    verified: true,
    uploadDate: "2024-01-05",
    anonymized: true,
    tags: ["pediatric", "vaccination", "immune response", "demographics"],
  },
  {
    id: "dataset-3",
    title: "Mental Health During Pandemic",
    category: "Mental Health",
    description:
      "Survey data on mental health indicators before, during, and after pandemic lockdowns",
    studyType: "Cross-sectional",
    recordCount: 12450,
    format: "CSV",
    price: "0.12",
    verified: true,
    uploadDate: "2024-03-01",
    anonymized: true,
    tags: ["mental health", "pandemic", "survey", "anxiety", "depression"],
  },
  {
    id: "dataset-4",
    title: "Genetic Markers for Metabolic Disorders",
    category: "Genetics",
    description:
      "Genome-wide association study of markers linked to common metabolic disorders",
    studyType: "Case Control",
    recordCount: 3650,
    format: "FHIR",
    price: "0.35",
    verified: true,
    uploadDate: "2024-02-25",
    anonymized: true,
    tags: ["genetics", "GWAS", "metabolism", "diabetes", "obesity"],
  },
  {
    id: "dataset-5",
    title: "Orthopedic Recovery Patterns",
    category: "Orthopedics",
    description:
      "Physical therapy outcomes data for knee and hip replacement patients",
    studyType: "Cohort",
    recordCount: 2840,
    format: "CSV",
    price: "0.09",
    verified: false,
    uploadDate: "2024-03-10",
    anonymized: true,
    tags: ["orthopedic", "physical therapy", "joint replacement", "recovery"],
  },
  {
    id: "dataset-6",
    title: "Neurological Effects of Sleep Pattern",
    category: "Neurology",
    description:
      "Correlation study between sleep quality metrics and neurological function tests",
    studyType: "Longitudinal",
    recordCount: 1875,
    format: "JSON",
    price: "0.22",
    verified: true,
    uploadDate: "2024-01-15",
    anonymized: true,
    tags: ["neurology", "sleep", "cognitive function", "longitudinal"],
  },
  {
    id: "dataset-7",
    title: "Dental Health Socioeconomic Factors",
    category: "Dental",
    description:
      "Analysis of dental health outcomes correlated with socioeconomic indicators",
    studyType: "Observational",
    recordCount: 9240,
    format: "CSV",
    price: "0.08",
    verified: true,
    uploadDate: "2024-02-08",
    anonymized: true,
    tags: ["dental", "socioeconomic", "public health", "prevention"],
  },
  {
    id: "dataset-8",
    title: "Laboratory Reference Ranges by Demographics",
    category: "Laboratory",
    description:
      "Comprehensive laboratory test reference ranges stratified by age, gender, and ethnicity",
    studyType: "Meta-analysis",
    recordCount: 28500,
    format: "CSV",
    price: "0.28",
    verified: true,
    uploadDate: "2024-03-05",
    anonymized: true,
    tags: [
      "laboratory",
      "reference ranges",
      "demographics",
      "statistical analysis",
    ],
  },
];

// Mock activity for timelines
export const MOCK_RECENT_ACTIVITY = [
  {
    id: "activity-1",
    type: "upload",
    message: "Uploaded new health record: Annual Physical Results",
    timestamp: "2024-03-20T14:23:45",
    category: "General Health",
    status: "success",
  },
  {
    id: "activity-2",
    type: "access",
    message: "Dr. Smith accessed your cardiology records",
    timestamp: "2024-03-18T09:15:30",
    category: "Cardiology",
    status: "success",
  },
  {
    id: "activity-3",
    type: "request",
    message: "Research Institute requested access to anonymized data",
    timestamp: "2024-03-15T16:42:10",
    category: "Research",
    status: "pending",
  },
  {
    id: "activity-4",
    type: "download",
    message: "Downloaded your laboratory results",
    timestamp: "2024-03-10T11:30:22",
    category: "Laboratory",
    status: "success",
  },
];

// Mock user stats for dashboards
export const MOCK_USER_STATS = {
  patient: {
    totalRecords: 12,
    sharedRecords: 5,
    pendingRequests: 2,
    securityScore: 85,
    totalUploads: 12,
    totalPurchases: 0,
    earnings: "0.42",
    storageUsed: "125MB",
  },
  researcher: {
    datasetsAccessed: 18,
    activeStudies: 3,
    pendingRequests: 4,
    totalSpent: "1.25",
    totalUploads: 0,
    totalPurchases: 18,
    storageUsed: "850MB",
  },
};

// Mock dataset details (for preview)
export const MOCK_DATASET_DETAILS = {
  "dataset-1": {
    id: "dataset-1",
    title: "Cardiac Health in Adults 40-60",
    category: "Cardiology",
    description:
      "This longitudinal dataset tracks cardiac health markers for adults aged 40-60 over a 5-year period. The dataset includes comprehensive biometric measurements, lab results, and lifestyle factors that influence cardiovascular health. All data has been collected with proper consent and anonymized according to HIPAA guidelines. This dataset is particularly valuable for research on preventative cardiology interventions and risk factor analysis.",
    studyType: "Longitudinal",
    recordCount: 5430,
    format: "CSV",
    price: "0.15",
    verified: true,
    uploadDate: "2024-02-18",
    anonymized: true,
    tags: [
      "cardiac",
      "longitudinal",
      "middle-age",
      "biomarkers",
      "cardiovascular",
      "preventative medicine",
    ],
    sampleData: {
      patientId: "XXXX-1234",
      age: 52,
      gender: "Female",
      visit_number: 3,
      visit_date: "XXXX-XX-XX",
      height_cm: 165,
      weight_kg: 68.5,
      bmi: 25.2,
      systolic: 125,
      diastolic: 82,
      heart_rate: 72,
      cholesterol_total: 198,
      hdl: 55,
      ldl: 120,
      triglycerides: 150,
      blood_glucose: 92,
      hba1c: 5.4,
      exercise_minutes_week: 150,
      smoking_status: "former",
      alcohol_units_week: 4,
    },
    sampleUrl: "#", // In a real implementation, this would be a download link
    dataPointsDescription:
      "Each patient record contains 45+ data points tracked across multiple visits",
    methodologyNotes:
      "Data collected through standardized clinical protocols at 8 participating hospitals",
    inclusionCriteria:
      "Adults 40-60 years old with no prior cardiac events at study start",
    publications: [
      "American Journal of Cardiology (2023), 128:45-52",
      "Journal of Preventative Medicine (2022), 56:102-118",
    ],
  },
  // Additional datasets would be defined here
};

/**
 * Provides mock implementations of the key data services functions
 * for UI development before blockchain integration
 */
class MockDataService {
  constructor() {
    this.healthRecords = MOCK_HEALTH_RECORDS;
    this.researchDatasets = MOCK_RESEARCH_DATASETS;
    this.userStats = MOCK_USER_STATS;
    this.recentActivity = MOCK_RECENT_ACTIVITY;
    this.favoriteDatasets = [];

    // Try to load favorites from localStorage
    try {
      const storedFavorites = localStorage.getItem(
        "healthmint_favorite_datasets"
      );
      if (storedFavorites) {
        this.favoriteDatasets = JSON.parse(storedFavorites);
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }

  /**
   * Get health records for a patient
   * @param {string} patientAddress - Patient wallet address
   * @returns {Promise<Array>} Array of health records
   */
  async getHealthRecords(patientAddress) {
    // In mock mode, ignore the address and return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          records: this.healthRecords,
          total: this.healthRecords.length,
        });
      }, 500); // Simulate network delay
    });
  }

  /**
   * Get available datasets for research
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of datasets
   */
  async getResearchDatasets(filters = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Apply basic filters
        let filtered = [...this.researchDatasets];

        if (filters.category && filters.category !== "All") {
          filtered = filtered.filter((d) => d.category === filters.category);
        }

        if (filters.studyType && filters.studyType !== "All Types") {
          filtered = filtered.filter((d) => d.studyType === filters.studyType);
        }

        if (filters.verifiedOnly) {
          filtered = filtered.filter((d) => d.verified);
        }

        // Apply price range filter
        if (filters.priceRange && filters.priceRange !== "all") {
          switch (filters.priceRange) {
            case "low":
              filtered = filtered.filter((d) => parseFloat(d.price) <= 0.1);
              break;
            case "medium":
              filtered = filtered.filter(
                (d) => parseFloat(d.price) > 0.1 && parseFloat(d.price) <= 0.25
              );
              break;
            case "high":
              filtered = filtered.filter((d) => parseFloat(d.price) > 0.25);
              break;
          }
        }

        resolve({
          datasets: filtered,
          total: this.researchDatasets.length,
        });
      }, 800); // Simulate network delay
    });
  }

  /**
   * Get details for a specific dataset
   * @param {string} datasetId - Dataset ID
   * @returns {Promise<Object>} Dataset details
   */
  async getDatasetDetails(datasetId) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Get the mock dataset details
        const details = MOCK_DATASET_DETAILS[datasetId];

        if (details) {
          resolve(details);
        } else {
          // If no detailed info, return the basic dataset info
          const basicInfo = this.researchDatasets.find(
            (d) => d.id === datasetId
          );
          if (basicInfo) {
            resolve(basicInfo);
          } else {
            reject(new Error("Dataset not found"));
          }
        }
      }, 1000); // Simulate network delay
    });
  }

  /**
   * Get user statistics
   * @param {string} userRole - User role (patient/researcher)
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userRole) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.userStats[userRole] || {});
      }, 500);
    });
  }

  /**
   * Get recent activity for a user
   * @returns {Promise<Array>} Recent activity
   */
  async getRecentActivity() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.recentActivity);
      }, 700);
    });
  }

  /**
   * Mock function to purchase a dataset
   * @param {string} datasetId - Dataset ID
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseDataset(datasetId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
          datasetId,
          purchaseDate: new Date().toISOString(),
        });
      }, 1500); // Longer delay to simulate blockchain transaction
    });
  }

  /**
   * Mock function to upload a health record
   * @param {Object} recordData - Record data
   * @param {File} file - File to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadHealthRecord(recordData, file) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRecord = {
          id: "record-" + Date.now(),
          title: recordData.title || "New Health Record",
          category: recordData.category || "General Health",
          description: recordData.description || "",
          uploadDate: new Date().toISOString().split("T")[0],
          verified: false, // New uploads start as unverified
          recordCount: recordData.recordCount || 1,
          price: recordData.price || "0.05",
          format: file?.type?.includes("json")
            ? "JSON"
            : file?.type?.includes("csv")
              ? "CSV"
              : file?.type?.includes("pdf")
                ? "PDF"
                : "Unknown",
          anonymized: !!recordData.anonymized,
        };

        // Add to mock records
        this.healthRecords.unshift(newRecord);

        resolve({
          success: true,
          record: newRecord,
          transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
        });
      }, 2000); // Longer delay to simulate file upload + blockchain transaction
    });
  }

  /**
   * Toggle a dataset as favorite
   * @param {string} datasetId - Dataset ID
   * @returns {Promise<Array>} Updated favorites list
   */
  async toggleFavorite(datasetId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.favoriteDatasets.includes(datasetId)) {
          this.favoriteDatasets = this.favoriteDatasets.filter(
            (id) => id !== datasetId
          );
        } else {
          this.favoriteDatasets.push(datasetId);
        }

        // Save to localStorage
        try {
          localStorage.setItem(
            "healthmint_favorite_datasets",
            JSON.stringify(this.favoriteDatasets)
          );
        } catch (err) {
          console.error("Failed to save favorites:", err);
        }

        resolve(this.favoriteDatasets);
      }, 300);
    });
  }

  /**
   * Get favorite datasets
   * @returns {Promise<Array>} Favorites list
   */
  async getFavorites() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.favoriteDatasets);
      }, 200);
    });
  }
}

// Create singleton instance
const mockDataService = new MockDataService();
export default mockDataService;
