// src/components/DatasetCardWithTiers.js
import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Check,
  FileText,
  AlertCircle,
  BarChart,
  Beaker,
  Heart,
  Activity,
  Calendar,
  Loader,
  DollarSign,
  FileBarChart,
  Shield,
} from "lucide-react";
import DataTierSelector from "./DataTierSelector";

/**
 * Enhanced Dataset Card Component with Tier Selection
 *
 * Displays dataset information and allows selecting different tiers for purchase
 * with improved accessibility, error handling, and user experience
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
  isLoading = false,
  purchaseInProgress = false,
  errorMessage = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [tierLoadError, setTierLoadError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Format price for better readability
  const formattedPrice = useMemo(() => {
    return typeof price === "number" ? price.toFixed(4) : price;
  }, [price]);

  // Get current effective price
  const currentPrice = useMemo(() => {
    if (selectedTier) {
      return selectedTier.price;
    }
    return formattedPrice;
  }, [selectedTier, formattedPrice]);

  // Handle tier fetch error
  const handleTierError = useCallback((error) => {
    console.error("Error loading tiers:", error);
    setTierLoadError("Unable to load pricing tiers. Please try again later.");
  }, []);

  // Handle tier change
  const handleTierChange = useCallback((tierData) => {
    setSelectedTier(tierData.tier);
    setTierLoadError(null);
    console.log("Tier selected:", tierData);
  }, []);

  // Handle purchase flow
  const handlePurchaseClick = useCallback(() => {
    if (purchaseInProgress) return;
    setShowConfirmation(true);
  }, [purchaseInProgress]);

  // Handle confirmation
  const handleConfirmPurchase = useCallback(() => {
    if (purchaseInProgress) return;

    setShowConfirmation(false);

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
        price: formattedPrice,
        recordCount: recordCount,
      });
    }
  }, [
    selectedTier,
    id,
    formattedPrice,
    recordCount,
    onPurchase,
    purchaseInProgress,
  ]);

  // Handle cancellation
  const handleCancelPurchase = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Get icon based on data type
  const getTypeIcon = useCallback(() => {
    switch (type.toLowerCase()) {
      case "laboratory":
        return (
          <Beaker className="text-blue-500" size={16} aria-hidden="true" />
        );
      case "physical exam":
        return (
          <FileText className="text-green-500" size={16} aria-hidden="true" />
        );
      case "cardiology":
        return <Heart className="text-red-500" size={16} aria-hidden="true" />;
      case "immunization":
        return (
          <Shield className="text-purple-500" size={16} aria-hidden="true" />
        );
      case "continuous":
        return (
          <Activity className="text-orange-500" size={16} aria-hidden="true" />
        );
      default:
        return (
          <FileBarChart
            className="text-gray-500"
            size={16}
            aria-hidden="true"
          />
        );
    }
  }, [type]);

  // Card loading state
  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-lg shadow-md overflow-hidden p-5 ${className}`}
        aria-busy="true"
      >
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="flex space-x-2">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-md px-2 py-1"
            aria-expanded={isExpanded}
            aria-controls={`tiers-section-${id}`}
          >
            {isExpanded ? "Simple View" : "Show Tiers"}
          </button>
        </div>

        <p className="text-gray-600 mt-2 line-clamp-2">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
            {getTypeIcon()}
            <span className="ml-1">{type}</span>
          </span>

          {isVerified && (
            <span
              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center"
              title="Verified dataset"
            >
              <Check size={12} className="mr-1" aria-hidden="true" />
              Verified
            </span>
          )}

          {isAnonymized && (
            <span
              className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center"
              title="Anonymized data"
            >
              <Shield size={12} className="mr-1" aria-hidden="true" />
              Anonymized
            </span>
          )}

          {tags.length > 0 &&
            tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}

          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center">
            <FileText size={12} className="mr-1" aria-hidden="true" />
            {format}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <BarChart size={16} className="mr-1" aria-hidden="true" />
            <span>{recordCount.toLocaleString()} records</span>
          </div>

          <div className="flex items-center">
            <Calendar size={16} className="mr-1" aria-hidden="true" />
            <span>30 days access</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-xl font-bold text-blue-600 mb-4 flex items-center">
          <DollarSign size={20} className="mr-1" aria-hidden="true" />
          {currentPrice} ETH
          {selectedTier && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({selectedTier.name} tier)
            </span>
          )}
        </div>

        {/* Display any errors */}
        {(errorMessage || tierLoadError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle
              size={16}
              className="mr-2 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{errorMessage || tierLoadError}</span>
          </div>
        )}

        {/* Expanded View with Tier Selection */}
        {isExpanded ? (
          <div id={`tiers-section-${id}`}>
            <DataTierSelector
              datasetId={id}
              datasetName={title}
              fullRecordCount={recordCount}
              fullPrice={price}
              onTierChange={handleTierChange}
              onError={handleTierError}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={onPreview}
                className="flex-1 py-2 px-4 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
                disabled={purchaseInProgress}
                aria-label={`Preview ${title}`}
              >
                Preview
              </button>
              <button
                onClick={handlePurchaseClick}
                className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center"
                disabled={purchaseInProgress}
                aria-label={`Purchase ${title} for ${currentPrice} ETH`}
              >
                {purchaseInProgress ? (
                  <>
                    <Loader
                      size={16}
                      className="mr-2 animate-spin"
                      aria-hidden="true"
                    />
                    Processing...
                  </>
                ) : (
                  <>Purchase ({currentPrice} ETH)</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onPreview}
              className="flex-1 py-2 px-4 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              disabled={purchaseInProgress}
              aria-label={`Preview ${title}`}
            >
              Preview
            </button>
            <button
              onClick={handlePurchaseClick}
              className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center"
              disabled={purchaseInProgress}
              aria-label={`Purchase ${title} for ${currentPrice} ETH`}
            >
              {purchaseInProgress ? (
                <>
                  <Loader
                    size={16}
                    className="mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Processing...
                </>
              ) : (
                <>Purchase ({currentPrice} ETH)</>
              )}
            </button>
          </div>
        )}

        {/* Purchase Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 max-w-md w-full m-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-purchase-title"
            >
              <h4
                id="confirm-purchase-title"
                className="text-lg font-bold text-gray-900 mb-3"
              >
                Confirm Purchase
              </h4>
              <p className="text-gray-600 mb-4">
                You are about to purchase{" "}
                <span className="font-medium">{title}</span>{" "}
                {selectedTier ? `(${selectedTier.name} tier)` : ""} for{" "}
                <span className="font-medium text-blue-600">
                  {currentPrice} ETH
                </span>
                .
              </p>

              <div className="bg-blue-50 p-3 rounded-md mb-5">
                <p className="text-sm text-blue-800 flex items-start">
                  <AlertCircle
                    size={16}
                    className="mr-2 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  This will initiate a blockchain transaction. Please ensure
                  your wallet is connected with sufficient funds.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelPurchase}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Confirm Purchase
                </button>
              </div>
            </div>
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
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  isVerified: PropTypes.bool,
  isAnonymized: PropTypes.bool,
  onPreview: PropTypes.func.isRequired,
  onPurchase: PropTypes.func.isRequired,
  className: PropTypes.string,
  isLoading: PropTypes.bool,
  purchaseInProgress: PropTypes.bool,
  errorMessage: PropTypes.string,
};

export default DatasetCardWithTiers;
