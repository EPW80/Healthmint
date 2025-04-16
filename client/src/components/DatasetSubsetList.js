// src/components/DatasetSubsetList.js
import React from "react";
import PropTypes from "prop-types";
import { 
  Database, 
  Calendar, 
  Users, 
  Filter, 
  Download,
  Tag,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

/**
 * DatasetSubsetList Component
 * 
 * Displays a list of saved and purchased filtered subsets for a dataset
 */
const DatasetSubsetList = ({ 
  subsets = [], 
  datasetName,
  onPurchaseSubset,
  onViewSubset,
  onDownloadSubset,
  activeSubsetId = null,
  className = ""
}) => {
  // Check if there are any subsets
  if (!subsets || subsets.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-indigo-50 border-b border-indigo-100 p-4">
        <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
          <Database className="mr-2" size={18} />
          Custom Subsets for {datasetName}
        </h3>
        <p className="text-sm text-indigo-600 mt-1">
          {subsets.length} filtered subset{subsets.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {subsets.map(subset => (
          <div 
            key={subset.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${subset.purchased ? 'bg-green-50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 flex items-center">
                  {subset.name || "Unnamed Subset"}
                  {subset.purchased && (
                    <CheckCircle size={16} className="ml-2 text-green-500" />
                  )}
                </h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    <Filter size={12} className="mr-1" />
                    {subset.recordCount?.toLocaleString() || 0} records
                  </span>
                  
                  {subset.filters?.timeRange?.start && subset.filters?.timeRange?.end && (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      <Calendar size={12} className="mr-1" />
                      {new Date(subset.filters.timeRange.start).toLocaleDateString()} - {new Date(subset.filters.timeRange.end).toLocaleDateString()}
                    </span>
                  )}
                  
                  {subset.filters?.gender && subset.filters.gender !== 'all' && (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">
                      <Users size={12} className="mr-1" />
                      Gender: {subset.filters.gender}
                    </span>
                  )}
                  
                  {(subset.filters?.ageRange?.min || subset.filters?.ageRange?.max) && (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      <Tag size={12} className="mr-1" />
                      Age: {subset.filters.ageRange.min || '0'}-{subset.filters.ageRange.max || '120'}
                    </span>
                  )}
                  
                  {subset.purchased && (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      <CheckCircle size={12} className="mr-1" />
                      Purchased
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-gray-500 text-sm">
                  <Clock size={14} />
                  <span>
                    {new Date(subset.createdAt || subset.created || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-600 mt-1">
                  {subset.price} ETH
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={() => onViewSubset && onViewSubset(subset)}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center"
              >
                View Details
              </button>
              
              {subset.purchased ? (
                <button
                  onClick={() => onDownloadSubset && onDownloadSubset(subset)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                >
                  <Download size={14} className="mr-1.5" />
                  Download
                </button>
              ) : (
                <button
                  onClick={() => onPurchaseSubset && onPurchaseSubset(subset)}
                  disabled={activeSubsetId === subset.id}
                  className={`px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center ${
                    activeSubsetId === subset.id ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {activeSubsetId === subset.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign size={14} className="mr-1.5" />
                      Purchase
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

DatasetSubsetList.propTypes = {
  subsets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    filters: PropTypes.object,
    recordCount: PropTypes.number,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    purchased: PropTypes.bool,
    createdAt: PropTypes.string,
    parentDatasetId: PropTypes.string
  })),
  datasetName: PropTypes.string,
  onPurchaseSubset: PropTypes.func,
  onViewSubset: PropTypes.func,
  onDownloadSubset: PropTypes.func,
  activeSubsetId: PropTypes.string,
  className: PropTypes.string
};

export default DatasetSubsetList;