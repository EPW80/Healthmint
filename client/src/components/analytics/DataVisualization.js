// src/components/analytics/DataVisualization.js
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  BarChart,
  LineChart,
  PieChart,
  FileSpreadsheet,
  Upload,
  ArrowLeft,
} from "lucide-react";
import LoadingSpinner from "../ui/LoadingSpinner.js";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const DataVisualization = () => {
  const navigate = useNavigate();
  const userId = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);

  // Log component access for HIPAA compliance
  useEffect(() => {
    const logAccess = async () => {
      try {
        await hipaaComplianceService.createAuditLog(
          "VISUALIZATION_TOOL_ACCESS",
          {
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            action: "VIEW",
          }
        );
      } catch (error) {
        console.error("Failed to log visualization tool access:", error);
      }
    };

    logAccess();

    // Simulate loading datasets
    setTimeout(() => {
      setAvailableDatasets([
        { id: "ds-1", name: "Diabetes Dataset 2023", recordCount: 5280 },
        { id: "ds-2", name: "Heart Disease Analysis", recordCount: 3150 },
        { id: "ds-3", name: "COVID-19 Outcomes", recordCount: 8940 },
      ]);
      setLoading(false);
    }, 1000);
  }, [userId, userRole]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Data Visualization</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" label="Loading visualization tools..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Dataset Selection */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Select Dataset</h2>

            {availableDatasets.length === 0 ? (
              <div className="text-center py-6 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">
                  No datasets available for visualization
                </p>
                <button
                  onClick={() => navigate("/browse")}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Browse Datasets
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selectedDataset === dataset.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => setSelectedDataset(dataset.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{dataset.name}</h3>
                        <p className="text-sm text-gray-600">
                          {dataset.recordCount.toLocaleString()} records
                        </p>
                      </div>
                      {selectedDataset === dataset.id && (
                        <div className="bg-blue-500 text-white p-1 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Upload new dataset</p>
                </div>
              </div>
            )}
          </div>

          {/* Visualization Options */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Visualization Type</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`border rounded-lg p-5 text-center hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <BarChart className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="font-medium">Bar Charts</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Compare values across categories
                </p>
              </div>

              <div
                className={`border rounded-lg p-5 text-center hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <LineChart className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium">Line Charts</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Track changes over time
                </p>
              </div>

              <div
                className={`border rounded-lg p-5 text-center hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <PieChart className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="font-medium">Pie Charts</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Show proportions of a whole
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                disabled={!selectedDataset}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                  selectedDataset
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Create Visualization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;
