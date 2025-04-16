// src/components/analytics/StatisticalAnalysis.js
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Activity,
  FileSpreadsheet,
  ArrowLeft,
  Calculator,
  Sigma,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import LoadingSpinner from "../ui/LoadingSpinner.js";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const StatisticalAnalysis = () => {
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
          "STATISTICAL_ANALYSIS_ACCESS",
          {
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            action: "VIEW",
          }
        );
      } catch (error) {
        console.error("Failed to log statistical analysis access:", error);
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
        <h1 className="text-2xl font-bold">Statistical Analysis</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" label="Loading statistical tools..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Dataset Selection */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Select Dataset for Analysis
            </h2>

            {availableDatasets.length === 0 ? (
              <div className="text-center py-6 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">
                  No datasets available for analysis
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
              </div>
            )}
          </div>

          {/* Analysis Types */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Analysis Techniques</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center">
                  <Calculator className="w-10 h-10 text-blue-500 mr-4" />
                  <div>
                    <h3 className="font-medium">Descriptive Statistics</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Calculate mean, median, mode, standard deviation
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center">
                  <Activity className="w-10 h-10 text-green-500 mr-4" />
                  <div>
                    <h3 className="font-medium">Hypothesis Testing</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      T-tests, chi-square, ANOVA
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center">
                  <TrendingUp className="w-10 h-10 text-purple-500 mr-4" />
                  <div>
                    <h3 className="font-medium">Regression Analysis</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Linear, logistic, and multivariate regression
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center">
                  <Sigma className="w-10 h-10 text-red-500 mr-4" />
                  <div>
                    <h3 className="font-medium">Correlation Analysis</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Pearson, Spearman, point-biserial
                    </p>
                  </div>
                </div>
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
                Run Analysis
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Advanced Options</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <BarChart3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Custom Models</p>
              </div>

              <div
                className={`border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-gray-500 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                  />
                </svg>
                <p className="text-sm font-medium">Export Results</p>
              </div>

              <div
                className={`border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-gray-500 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm font-medium">Settings</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticalAnalysis;
