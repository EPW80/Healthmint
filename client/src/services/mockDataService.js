// src/services/mockDataService.js
class MockDataService {
  constructor() {
    this.mockDatasets = [
      {
        id: "dataset-001",
        title: "Diabetes Patient Records",
        description: "Anonymized records of 1000+ diabetes patients including treatment outcomes and metrics",
        category: "Endocrinology",
        price: "0.15",
        recordCount: 1247,
        format: "CSV",
        verified: true,
        studyType: "Observational",
        uploadDate: "2025-03-15T14:30:00Z",
        tags: ["diabetes", "treatment", "metrics"]
      },
      {
        id: "dataset-002",
        title: "Cardiac MRI Images",
        description: "High-resolution cardiac MRI images with professional annotations",
        category: "Cardiology",
        price: "0.25",
        recordCount: 532,
        format: "DICOM",
        verified: true,
        studyType: "Clinical Trial",
        uploadDate: "2025-04-02T09:15:00Z",
        tags: ["cardiac", "MRI", "imaging"]
      },
      {
        id: "dataset-003", 
        title: "Mental Health Survey Results",
        description: "Comprehensive survey results from 5000+ participants on anxiety and depression",
        category: "Psychology",
        price: "0.10",
        recordCount: 5329,
        format: "JSON",
        verified: false,
        studyType: "Cross-sectional",
        uploadDate: "2025-02-22T11:45:00Z",
        tags: ["mental health", "survey", "anxiety", "depression"]
      }
    ];
    
    this.mockTiers = {
      "dataset-001": [
        { id: "basic", name: "Basic", percentage: 25, recordCount: 300, price: "0.05", description: "Basic sample of the dataset" },
        { id: "standard", name: "Standard", percentage: 50, recordCount: 600, price: "0.10", description: "Half of the complete dataset" },
        { id: "complete", name: "Complete", percentage: 100, recordCount: 1247, price: "0.15", description: "Full access to all records" }
      ],
      "dataset-002": [
        { id: "basic", name: "Basic", percentage: 25, recordCount: 133, price: "0.08", description: "Sample of MRI images" },
        { id: "standard", name: "Standard", percentage: 50, recordCount: 266, price: "0.15", description: "Half of the MRI dataset" },
        { id: "complete", name: "Complete", percentage: 100, recordCount: 532, price: "0.25", description: "Complete image collection" }
      ],
      "dataset-003": [
        { id: "basic", name: "Basic", percentage: 25, recordCount: 1330, price: "0.03", description: "Survey data sample" },
        { id: "standard", name: "Standard", percentage: 50, recordCount: 2665, price: "0.06", description: "50% of survey results" },
        { id: "complete", name: "Complete", percentage: 100, recordCount: 5329, price: "0.10", description: "Full survey dataset" }
      ]
    };
    
    this.mockSubsets = {};
  }

  // Allow injecting mock data from outside
  setMockData(datasets) {
    this.mockDatasets = datasets;
    return true;
  }
  
  // Get all available datasets
  async getDatasets(filters = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: [...this.mockDatasets],
      totalCount: this.mockDatasets.length
    };
  }
  
  // Get dataset by ID
  async getDataset(id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const dataset = this.mockDatasets.find(d => d.id === id);
    
    if (!dataset) {
      throw new Error(`Dataset with ID ${id} not found`);
    }
    
    return dataset;
  }
  
  // Get tiers for a dataset
  async getDatasetTiers(datasetId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockTiers[datasetId] || [];
  }
  
  // Simulate downloading a dataset
  async getDatasetDownloadUrl(datasetId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return `mock-download-url://${datasetId}`;
  }
  
  // Simulate downloading a dataset
  async downloadDataset(datasetId, isSubset = false) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate download completion
    console.log(`Mock downloading ${isSubset ? 'subset' : 'dataset'}: ${datasetId}`);
    
    return {
      success: true,
      filename: `health-data-${datasetId}.${isSubset ? 'subset' : 'full'}.csv`,
      size: Math.floor(Math.random() * 1000) + 500 + 'KB'
    };
  }
  
  // Save a subset
  async saveSubset(parentDatasetId, subsetData) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const subsetId = `subset-${Date.now().toString(36)}`;
    
    if (!this.mockSubsets[parentDatasetId]) {
      this.mockSubsets[parentDatasetId] = [];
    }
    
    const newSubset = {
      id: subsetId,
      datasetId: parentDatasetId,
      name: subsetData.name || `Subset of ${parentDatasetId}`,
      description: subsetData.description || "Custom filtered subset",
      recordCount: subsetData.recordCount || Math.floor(Math.random() * 1000) + 100,
      filters: subsetData.filters || {},
      price: subsetData.price || "0.05",
      createdAt: new Date().toISOString()
    };
    
    this.mockSubsets[parentDatasetId].push(newSubset);
    
    return {
      success: true,
      subset: newSubset
    };
  }
  
  // Get subsets for a dataset
  async getSubsets(datasetId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.mockSubsets[datasetId] || [];
  }
}

const mockDataService = new MockDataService();
export default mockDataService;
