import React, { useState, useEffect } from "react";
import { fetchAvailableDatasets } from "../services/dataDiscoveryService";
import { Search, AlertTriangle, FileText, Download } from "lucide-react";

const DataBrowser = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setSelectedDataset] = useState(null);
  const [showMockData, setShowMockData] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchAvailableDatasets(showMockData);
      setDatasets(data);
      setError(null);
    } catch (err) {
      console.error("Error in data browser:", err);
      setError("Failed to load datasets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showMockData]);

  // Filtering and dataset selection logic would go here

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Browse Datasets</h1>

        <div className="flex items-center">
          <div className="mr-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={showMockData}
                onChange={() => setShowMockData(!showMockData)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-sm text-fg">
                Include sample datasets
              </span>
            </label>
          </div>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and filters section */}
      <div className="bg-surface p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4">
          <div className="flex-grow relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-fg-subtle" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-line rounded-md leading-5 bg-surface"
              placeholder="Search datasets..."
            />
          </div>

          <div className="w-48">
            <select className="block w-full pl-3 pr-10 py-2 text-base border border-line focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="all">All Types</option>
              <option value="imaging">Imaging</option>
              <option value="clinical">Clinical</option>
              <option value="genomic">Genomic</option>
              <option value="wearable">Wearable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Datasets display */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-fg-muted">Loading datasets...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => setSelectedDataset(dataset)}
              className={`w-full text-left bg-surface border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                dataset.isMockData
                  ? "border-amber-200 bg-amber-50"
                  : "border-line"
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-fg flex items-center">
                    {dataset.title}
                    {dataset.isMockData && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
                        Sample
                      </span>
                    )}
                  </h3>
                </div>

                <p className="mt-2 text-sm text-fg-muted line-clamp-2">
                  {dataset.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-fg-muted">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>{dataset.fileCount || "?"} files</span>
                  </div>
                  <div className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    <span>{formatFileSize(dataset.totalSize || 0)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(dataset.dataTypes || ["Unknown"])
                    .slice(0, 3)
                    .map((type, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full"
                      >
                        {type}
                      </span>
                    ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dataset detail modal would go here */}
    </div>
  );
};

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default DataBrowser;
