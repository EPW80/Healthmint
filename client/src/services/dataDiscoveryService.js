import axios from 'axios';

// Mock datasets for development
const mockDatasets = [
  {
    id: "dataset-001",
    title: "Diabetes Type 2 Patient Data",
    description: "Anonymized blood glucose monitoring data from patients with Type 2 diabetes over a 6-month period.",
    fileCount: 42,
    totalSize: 15728640, // 15MB
    dataTypes: ["Clinical", "Time Series"],
    researcher: "0x4a8b...1c93",
    format: "CSV",
    tags: ["diabetes", "glucose", "medication"],
    createdAt: "04/05/2025",
    isMockData: true
  },
  // You can add more mock datasets here
];

export const fetchAvailableDatasets = async (includeTestData = true) => {
  try {
    // Try to fetch real data from MongoDB
    let datasets = [];
    
    try {
      // Get files from MongoDB through your backend API
      const response = await axios.get('/api/researcher/datasets/discover');
      datasets = response.data.datasets || [];
      console.log("Real datasets loaded:", datasets);
    } catch (error) {
      console.warn("Failed to load real datasets:", error);
      // Continue with mock data if real data fails
    }
    
    // Optionally include mock data
    if (includeTestData) {
      datasets = [...datasets, ...mockDatasets];
    }
    
    return datasets;
  } catch (error) {
    console.error('Error fetching datasets:', error);
    // If all fails, return mock data as fallback
    return includeTestData ? mockDatasets : [];
  }
};