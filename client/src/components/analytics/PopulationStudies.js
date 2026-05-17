// src/components/analytics/PopulationStudies.js
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  FileSpreadsheet,
  ArrowLeft,
  Globe,
  Map,
  Share2,
} from "lucide-react";
import LoadingSpinner from "../ui/LoadingSpinner.js";
import { useNavigate } from "react-router-dom";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

const PopulationStudies = () => {
  const navigate = useNavigate();
  const userId = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [populationFilters, setPopulationFilters] = useState({
    ageRange: [0, 100],
    gender: "all",
    region: "all",
    diagnosis: "all",
  });

  // Log component access for HIPAA compliance
  useEffect(() => {
    const logAccess = async () => {
      try {
        await hipaaComplianceService.createAuditLog(
          "POPULATION_STUDIES_ACCESS",
          {
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            action: "VIEW",
          }
        );
      } catch (error) {
        console.error("Failed to log population studies access:", error);
      }
    };

    logAccess();

    // Simulate loading datasets
    setTimeout(() => {
      setAvailableDatasets([
        {
          id: "ds-1",
          name: "Diabetes Dataset 2023",
          recordCount: 5280,
          demographic: true,
        },
        {
          id: "ds-2",
          name: "Heart Disease Analysis",
          recordCount: 3150,
          demographic: true,
        },
        {
          id: "ds-3",
          name: "COVID-19 Outcomes",
          recordCount: 8940,
          demographic: true,
        },
      ]);
      setLoading(false);
    }, 1000);
  }, [userId, userRole]);

  const handleFilterChange = (filter, value) => {
    setPopulationFilters((prev) => ({
      ...prev,
      [filter]: value,
    }));
  };

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
        <h1 className="text-2xl font-bold">Population Studies</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" label="Loading population tools..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Dataset Selection */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Select Population Dataset
            </h2>

            {availableDatasets.length === 0 ? (
              <div className="text-center py-6 bg-blue-50 rounded-lg">
                <FileSpreadsheet className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">
                  No population datasets available
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
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-gray-600 mr-3">
                            {dataset.recordCount.toLocaleString()} records
                          </p>
                          {dataset.demographic && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                              <Users size={12} className="mr-1" />
                              Demographic Data
                            </span>
                          )}
                        </div>
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

          {/* Population Filters */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Population Filters</h2>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!selectedDataset ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={populationFilters.ageRange[0]}
                    onChange={(e) =>
                      handleFilterChange("ageRange", [
                        parseInt(e.target.value),
                        populationFilters.ageRange[1],
                      ])
                    }
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={populationFilters.ageRange[1]}
                    onChange={(e) =>
                      handleFilterChange("ageRange", [
                        populationFilters.ageRange[0],
                        parseInt(e.target.value),
                      ])
                    }
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                  Gender
                </label>
                <select
                  value={populationFilters.gender}
                  onChange={(e) => handleFilterChange("gender", e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other/Non-binary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <select
                  value={populationFilters.region}
                  onChange={(e) => handleFilterChange("region", e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Regions</option>
                  <option value="north_america">North America</option>
                  <option value="europe">Europe</option>
                  <option value="asia">Asia</option>
                  <option value="south_america">South America</option>
                  <option value="africa">Africa</option>
                  <option value="oceania">Oceania</option>
                </select>

                <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                  Diagnosis/Condition
                </label>
                <select
                  value={populationFilters.diagnosis}
                  onChange={(e) =>
                    handleFilterChange("diagnosis", e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Conditions</option>
                  <option value="diabetes">Diabetes</option>
                  <option value="hypertension">Hypertension</option>
                  <option value="heart_disease">Heart Disease</option>
                  <option value="obesity">Obesity</option>
                  <option value="asthma">Asthma</option>
                  <option value="covid19">COVID-19</option>
                </select>
              </div>
            </div>
          </div>

          {/* Study Types */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Study Types</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Globe className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="font-medium text-center">
                  Demographic Analysis
                </h3>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Analyze distribution across population segments
                </p>
              </div>

              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Map className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium text-center">
                  Geographic Distribution
                </h3>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Map prevalence across regions
                </p>
              </div>

              <div
                className={`border rounded-lg p-5 hover:bg-blue-50 cursor-pointer transition-colors ${!selectedDataset ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Share2 className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="font-medium text-center">Comparative Studies</h3>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Compare outcomes between populations
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
                Run Population Study
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopulationStudies;
