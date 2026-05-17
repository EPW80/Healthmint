// server/routes/datasets.js - MOCK IMPLEMENTATION
import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// Create mock datasets with simpler, non-timestamp-based IDs
const MOCK_DATASETS = [
  {
    id: "dataset_1",
    name: "Patient Demographics Dataset",
    description: "Mock dataset containing patient demographic information",
    format: "CSV",
    size: 1024 * 1024 * 2.5, // 2.5MB
    category: "Demographics",
    recordCount: 1250,
    createdAt: "2025-03-15T08:30:00.000Z",
    metadata: {
      type: "text/csv",
      name: "patient_demographics.csv",
    },
  },
  {
    id: "dataset_2",
    name: "Medical Imaging Metadata",
    description: "Mock dataset with anonymized medical imaging metadata",
    format: "JSON",
    size: 1024 * 1024 * 1.8, // 1.8MB
    category: "Radiology",
    recordCount: 450,
    createdAt: "2025-03-18T14:45:00.000Z",
    metadata: {
      type: "application/json",
      name: "imaging_metadata.json",
    },
  },
  {
    id: "dataset_3",
    name: "Clinical Trial Results",
    description: "Mock dataset containing anonymized clinical trial results",
    format: "CSV",
    size: 1024 * 1024 * 4.2, // 4.2MB
    category: "Research",
    recordCount: 2500,
    createdAt: "2025-03-22T09:15:00.000Z",
    metadata: {
      type: "text/csv",
      name: "clinical_trial_results.csv",
    },
  },
  {
    id: "dataset_4",
    name: "Medication History",
    description: "Mock dataset with medication history records",
    format: "JSON",
    size: 1024 * 1024 * 1.2, // 1.2MB
    category: "Pharmacy",
    recordCount: 875,
    createdAt: "2025-03-25T16:20:00.000Z",
    metadata: {
      type: "application/json",
      name: "medication_history.json",
    },
  },
  {
    id: "dataset_5",
    name: "Laboratory Test Results",
    description: "Mock dataset containing anonymized lab test results",
    format: "CSV",
    size: 1024 * 1024 * 3.7, // 3.7MB
    category: "Laboratory",
    recordCount: 1850,
    createdAt: "2025-03-28T11:10:00.000Z",
    metadata: {
      type: "text/csv",
      name: "lab_results.csv",
    },
  },
];

// Default dataset to return when a specific ID is not found
const DEFAULT_DATASET = {
  id: "default_dataset",
  name: "Default Dataset Sample",
  description: "This is a fallback dataset when the requested ID is not found",
  format: "CSV",
  size: 1024 * 1024 * 1.5, // 1.5MB
  category: "Sample",
  recordCount: 1000,
  createdAt: new Date().toISOString(),
  metadata: {
    type: "text/csv",
    name: "default_dataset.csv",
  },
};

// Logger for audit trail
const logAudit = (action, details = {}) => {
  console.log(`[MOCK AUDIT] ${action}:`, {
    timestamp: new Date().toISOString(),
    ...details,
  });
  return true;
};

// Generate mock content based on format
const generateMockContent = (dataset) => {
  if (dataset.format === "CSV") {
    // Generate mock CSV content
    let header = "id,patient_id,category,value,date\n";
    let rows = [];

    for (let i = 1; i <= 10; i++) {
      const patientId = `P${1000 + i}`;
      const date = new Date(
        Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0];
      rows.push(
        `${i},${patientId},${dataset.category},Sample Value ${i},${date}`
      );
    }

    return Buffer.from(header + rows.join("\n"));
  } else {
    // Generate mock JSON content
    const records = [];

    for (let i = 1; i <= 10; i++) {
      const patientId = `P${1000 + i}`;
      const date = new Date(
        Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
      ).toISOString();

      records.push({
        id: i,
        patient_id: patientId,
        category: dataset.category,
        value: `Sample Value ${i}`,
        date: date,
      });
    }

    return Buffer.from(JSON.stringify(records, null, 2));
  }
};

// Helper function to find dataset with flexible matching
const findDataset = (id) => {
  // If it's an exact match
  let dataset = MOCK_DATASETS.find((d) => d.id === id);

  if (!dataset) {
    // Try common test IDs
    if (["test", "demo", "sample"].includes(id.toLowerCase())) {
      return MOCK_DATASETS[0]; // Return the first dataset for test IDs
    }

    // If ID contains digits, try to match with our dataset_X format
    const numMatch = id.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      const index = (num - 1) % MOCK_DATASETS.length;
      return MOCK_DATASETS[index];
    }

    // Return default dataset as fallback
    return DEFAULT_DATASET;
  }

  return dataset;
};

// Get all datasets (with pagination)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Parse query parameters
    const { category, page = 1, limit = 10 } = req.query;

    // Log the request
    logAudit("LIST_DATASETS", {
      category,
      page,
      limit,
      ip: req.ip,
    });

    // Filter datasets by category if specified
    let filteredData = [...MOCK_DATASETS];
    if (category) {
      filteredData = filteredData.filter(
        (d) => d.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Prepare pagination info
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: filteredData.length,
      totalPages: Math.ceil(filteredData.length / parseInt(limit)),
    };

    // Return the response
    res.json({
      success: true,
      message: "Mock datasets retrieved successfully",
      data: paginatedData,
      pagination,
    });
  })
);

// Get dataset by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check for access purpose (maintain API consistency)
    const accessPurpose =
      req.headers["x-access-purpose"] || req.query.purpose || "view";

    // Log the request
    logAudit("VIEW_DATASET", {
      datasetId: id,
      purpose: accessPurpose,
      ip: req.ip,
    });

    // Find the dataset using our flexible matching function
    const dataset = findDataset(id);

    // Always return a dataset now (either a matched one or the default)
    res.json({
      success: true,
      message: "Mock dataset retrieved successfully",
      data: dataset,
    });
  })
);

// Download dataset by ID
router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check for access purpose (maintain API consistency)
    const accessPurpose =
      req.headers["x-access-purpose"] || req.query.purpose || "download";

    // Log download attempt
    logAudit("DOWNLOAD_DATASET_ATTEMPT", {
      datasetId: id,
      purpose: accessPurpose,
      ip: req.ip,
    });

    // Find the dataset using our flexible matching function
    const dataset = findDataset(id);

    try {
      // Generate mock content
      const content = generateMockContent(dataset);

      // Set appropriate headers
      res.setHeader(
        "Content-Type",
        dataset.metadata.type || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${dataset.metadata.name}"`
      );
      res.setHeader("Content-Length", content.length);
      res.setHeader("X-HIPAA-Compliant", "true");
      res.setHeader("X-Download-Purpose", accessPurpose);

      // Log successful download
      logAudit("DOWNLOAD_DATASET_COMPLETE", {
        datasetId: id,
        fileSize: content.length,
        fileName: dataset.metadata.name,
        ip: req.ip,
      });

      // Send the content
      res.send(content);
    } catch (error) {
      // Log error
      console.error("Error generating mock dataset content:", error);
      logAudit("DOWNLOAD_DATASET_FAILED", {
        datasetId: id,
        error: error.message,
        ip: req.ip,
      });

      // Return error response
      res.status(500).json({
        success: false,
        message: "Failed to generate dataset content",
        errorId: `gen_err_${Date.now()}`,
      });
    }
  })
);

// Upload new dataset (mock implementation)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Generate a new mock ID
    const newId = `dataset_${MOCK_DATASETS.length + 1}`;

    // Log upload
    logAudit("UPLOAD_DATASET", {
      datasetId: newId,
      ip: req.ip,
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "Mock dataset uploaded successfully",
      data: {
        id: newId,
        name: req.body?.name || "New Dataset",
        uploadTimestamp: new Date().toISOString(),
      },
    });
  })
);

// Add a "health" endpoint to easily check if the route is working
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Datasets mock API is operational",
    mockCount: MOCK_DATASETS.length,
    timestamp: new Date().toISOString(),
  });
});

export default router;
