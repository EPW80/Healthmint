import React, { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Filter, ArrowUpDown } from "lucide-react";
import generateMockHealthRecords from "../mockData/mockHealthRecords.js";

const HealthDataGrid = () => {
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'verified', 'unverified'
  const [sortOrder, setSortOrder] = useState("date"); // 'date', 'category'

  useEffect(() => {
    // Simulate API call with a slight delay
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockHealthRecords();
      setHealthRecords(mockData);
      setLoading(false);
    }, 800);
  }, []);

  // Filter records based on verification status
  const filteredRecords = healthRecords.filter((record) => {
    if (filter === "all") return true;
    if (filter === "verified") return record.verified;
    if (filter === "unverified") return !record.verified;
    return true;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortOrder === "date") {
      return new Date(b.uploadDate) - new Date(a.uploadDate);
    } else if (sortOrder === "category") {
      return a.category.localeCompare(b.category);
    }
    return 0;
  });

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Health Data Records</h2>

      {/* Filters and Controls */}
      <div className="flex flex-wrap justify-between items-center bg-surface p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-2 mb-2 md:mb-0">
          <Filter className="h-5 w-5 text-fg-muted" />
          <span className="text-fg">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-line rounded px-2 py-1 text-sm"
          >
            <option value="all">All Records</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <ArrowUpDown className="h-5 w-5 text-fg-muted" />
          <span className="text-fg">Sort by:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-line rounded px-2 py-1 text-sm"
          >
            <option value="date">Date (newest first)</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Records</h3>
          <p className="text-2xl font-bold text-blue-600">
            {healthRecords.length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Verified Records</h3>
          <p className="text-2xl font-bold text-green-600">
            {healthRecords.filter((r) => r.verified).length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Unverified Records</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {healthRecords.filter((r) => !r.verified).length}
          </p>
        </div>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRecords.map((record) => (
          <div
            key={record.id}
            className="bg-surface border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg truncate">
                  {record.title}
                </h3>
                {record.verified ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </span>
                )}
              </div>

              <div className="text-sm text-fg-muted mb-2">
                <span className="inline-block px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                  {record.category}
                </span>
                <span className="text-fg-muted">
                  {formatDate(record.uploadDate)}
                </span>
              </div>

              <p className="text-fg-muted text-sm line-clamp-2 mb-4">
                {record.description}
              </p>

              <div className="text-xs text-fg-muted flex flex-wrap gap-2">
                <span className="bg-surface-raised px-2 py-1 rounded">
                  Format: {record.format}
                </span>
                <span className="bg-surface-raised px-2 py-1 rounded">
                  Records: {record.recordCount.toLocaleString()}
                </span>
                {record.anonymized && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Anonymized
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-line px-4 py-3 bg-surface flex justify-between">
              <span className="text-sm font-medium text-blue-600">
                ${record.price.toFixed(2)}
              </span>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {sortedRecords.length === 0 && (
        <div className="bg-surface p-8 rounded-lg text-center">
          <AlertCircle className="h-12 w-12 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-lg font-medium text-fg mb-1">
            No records found
          </h3>
          <p className="text-fg-muted">
            {filter !== "all"
              ? `No ${filter} records match your criteria.`
              : "No health records available."}
          </p>
        </div>
      )}
    </div>
  );
};

export default HealthDataGrid;
