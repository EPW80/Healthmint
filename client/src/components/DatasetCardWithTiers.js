// src/components/DatasetCardWithTiers.js
import React, { useState } from "react";
import PropTypes from "prop-types";
import { Check, FileText, AlertCircle, BarChart } from "lucide-react";
import DataTierSelector from "./DataTierSelector";

/**
 * Enhanced Dataset Card Component with Tier Selection
 *
 * Displays dataset information and allows selecting different tiers for purchase
 */
const DatasetCardWithTiers = ({
  id,
  title,
  description,
  type,
  tags = [],
  format,
  recordCount,
  price,
  isVerified = false,
  isAnonymized = true,
  onPreview,
  onPurchase,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  // Handle tier change
  const handleTierChange = (tierData) => {
    setSelectedTier(tierData.tier);
    console.log("Tier selected:", tierData);
  };

  // Handle purchase
  const handlePurchase = () => {
    if (selectedTier) {
      onPurchase({
        datasetId: id,
        tier: selectedTier.id,
        price: selectedTier.price,
        recordCount: selectedTier.recordCount,
      });
    } else {
      // Default to complete tier if nothing selected
      onPurchase({
        datasetId: id,
        tier: "complete",
        price: price,
        recordCount: recordCount,
      });
    }
  };

  // Get icon based on data type
  const getTypeIcon = () => {
    switch (type.toLowerCase()) {
      case "laboratory":
        return <BarChart className="text-blue-500" size={16} />;
      case "physical exam":
        return <FileText className="text-blue-500" size={16} />;
      default:
        return <FileText className="text-gray-500" size={16} />;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {isExpanded ? "Simple View" : "Show Tiers"}
          </button>
        </div>

        <p className="text-gray-600 mt-2">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {getTypeIcon()}
            <span className="ml-1">{type}</span>
          </span>

          {isVerified && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
              <Check size={12} className="mr-1" />
              Verified
            </span>
          )}

          {tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}

          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            {format}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <FileText size={16} className="mr-1" />
            <span>{recordCount.toLocaleString()} records</span>
          </div>

          {isAnonymized && (
            <div className="flex items-center">
              <AlertCircle size={16} className="mr-1" />
              <span>Anonymized</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-xl font-bold text-blue-600 mb-4">{price} ETH</div>

        {/* Expanded View with Tier Selection */}
        {isExpanded ? (
          <DataTierSelector
            datasetId={id}
            datasetName={title}
            fullRecordCount={recordCount}
            fullPrice={price}
            onTierChange={handleTierChange}
          />
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onPreview}
              className="flex-1 py-2 px-4 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={handlePurchase}
              className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Purchase ({price} ETH)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

DatasetCardWithTiers.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  format: PropTypes.string.isRequired,
  recordCount: PropTypes.number.isRequired,
  price: PropTypes.number.isRequired,
  isVerified: PropTypes.bool,
  isAnonymized: PropTypes.bool,
  onPreview: PropTypes.func.isRequired,
  onPurchase: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default DatasetCardWithTiers;
