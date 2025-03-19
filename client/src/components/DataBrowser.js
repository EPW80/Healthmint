// src/components/DataBrowser.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";

// API URL from environment
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
console.log("Resolved API_URL:", API_URL);

// Categories from backend
const CATEGORIES = [
  "All",
  "General Health",
  "Cardiology",
  "Physical Exam",
  "Laboratory",
  "Immunization",
  "Genetics",
  "Psychology",
  "Dental",
  "Ophthalmology",
  "Allergy",
  "Neurology",
  "Physical Therapy",
  "Nutrition",
  "Dermatology",
  "Orthopedics",
  "Pulmonology",
  "Endocrinology",
  "Obstetrics",
  "Pediatrics",
  "Sports Medicine",
];

const DataBrowser = ({ onPurchase }) => {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minAge: "",
    maxAge: "",
    verifiedOnly: false,
    category: "All",
    priceRange: "all",
  });

  // Fetch data from API
  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const formattedUrl = `${API_URL.replace(/\/$/, "")}/api/data/browse`;
      const response = await axios.get(formattedUrl, {
        params: {
          minAge: filters.minAge || undefined,
          maxAge: filters.maxAge || undefined,
          verified: filters.verifiedOnly || undefined,
          category: filters.category === "All" ? undefined : filters.category,
          priceRange:
            filters.priceRange === "all" ? undefined : filters.priceRange,
        },
      });
      setHealthData(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load health data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Handle filter changes
  const handleFilterChange = useCallback((name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Memoized filtered data (client-side filtering for performance)
  const filteredData = useMemo(() => {
    if (!healthData.length) return [];

    return healthData.filter((data) => {
      if (filters.verifiedOnly && !data.verified) return false;
      if (filters.minAge && data.age < parseInt(filters.minAge)) return false;
      if (filters.maxAge && data.age > parseInt(filters.maxAge)) return false;
      if (filters.category !== "All" && data.category !== filters.category)
        return false;

      const price = parseFloat(data.price);
      switch (filters.priceRange) {
        case "low":
          return price <= 0.1;
        case "medium":
          return price > 0.1 && price <= 0.25;
        case "high":
          return price > 0.25;
        default:
          return true;
      }
    });
  }, [healthData, filters]);

  // Handle purchase
  const handlePurchase = useCallback(
    async (id) => {
      try {
        setError(null);
        await onPurchase?.(id);
      } catch (error) {
        console.error("Error purchasing data:", error);
        setError("Failed to complete purchase. Please try again.");
      }
    },
    [onPurchase]
  );

  // Filter component
  const renderFilters = () => (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/30 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label
            htmlFor="minAge"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Min Age
          </label>
          <input
            id="minAge"
            type="number"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.minAge}
            onChange={(e) => handleFilterChange("minAge", e.target.value)}
            min="0"
            max="120"
          />
        </div>

        <div>
          <label
            htmlFor="maxAge"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Max Age
          </label>
          <input
            id="maxAge"
            type="number"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.maxAge}
            onChange={(e) => handleFilterChange("maxAge", e.target.value)}
            min="0"
            max="120"
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <select
            id="category"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="priceRange"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price Range
          </label>
          <select
            id="priceRange"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.priceRange}
            onChange={(e) => handleFilterChange("priceRange", e.target.value)}
          >
            <option value="all">All Prices</option>
            <option value="low">Low (≤ 0.1 ETH)</option>
            <option value="medium">Medium (0.1-0.25 ETH)</option>
            <option value="high">High ({"> "}0.25 ETH)</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              checked={filters.verifiedOnly}
              onChange={(e) =>
                handleFilterChange("verifiedOnly", e.target.checked)
              }
            />
            <span className="text-gray-700">Show verified data only</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Render health data card
  const renderHealthDataCard = useCallback(
    (data) => (
      <div
        key={data.id}
        className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1"
      >
        <div className="bg-white/90 backdrop-blur-md h-full rounded-2xl shadow-md border border-white/30 transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl flex flex-col">
          <div className="p-6 flex-grow">
            <h3 className="text-xl font-semibold mb-2">{data.category}</h3>
            <div className="bg-black/5 p-2 rounded text-sm text-gray-600 mb-3">
              Owner: {data.owner}
            </div>
            <p className="text-gray-700 mb-4">{data.description}</p>
            <p className="text-lg font-bold text-blue-600 mt-2">
              {data.price} ETH
            </p>
            {data.verified && (
              <div className="flex items-center gap-1 text-green-600 mt-2">
                <CheckCircle size={16} />
                <span className="font-medium text-sm">Verified</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <button
              onClick={() => handlePurchase(data.id)}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors"
            >
              Purchase
            </button>
          </div>
        </div>
      </div>
    ),
    [handlePurchase]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mt-4">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          Browse Health Data
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            <span>{error}</span>
            <button
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={() => setError(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {renderFilters()}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <p className="mb-6 text-gray-600 font-medium">
              Showing {filteredData.length} of {healthData.length} records
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredData.map(renderHealthDataCard)}
            </div>
            {filteredData.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-blue-500" />
                <span>
                  No records match your current filters. Try adjusting your
                  search criteria.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

DataBrowser.propTypes = {
  onPurchase: PropTypes.func,
};

export default DataBrowser;
