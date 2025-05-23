// src/components/DataBrowserView.js
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  CheckCircle,
  AlertCircle,
  Filter,
  Download,
  Search,
  ChevronDown,
  FileText,
  BarChart,
  Star,
  StarOff,
  X,
} from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";
import WalletBalanceDisplay from "./WalletBalanceDisplay.js";
import EnhancedPurchaseButton from "./DatasetPurchaseButton.js";
import DataTierSelector from "./DataTierSelector.js";
import DatasetSubsetList from "./DatasetSubsetList.js";

// prop types for the DataBrowserView component
const DataBrowserView = ({
  userRole,
  loading,
  error,
  filters,
  updateFilter,
  totalCount,
  filteredData,
  favoriteDatasets,
  toggleFavorite,
  handlePurchase,
  handleViewDataset,
  handleDownloadDataset,
  searchInput,
  handleSearchInputChange,
  handleSearchKeyDown,
  handleSearch,
  toggleAdvancedFilters,
  advancedFiltersOpen,
  handleResetFilters,
  handleToggleFavorites,
  showOnlyFavorites,
  viewMode,
  handleViewModeChange,
  previewOpen,
  handleClosePreview,
  selectedDataset,
  detailsLoading,
  datasetDetails,
  categories,
  studyTypes,
  dataFormats,
  purchasingDataset,
  purchaseStep,
  selectedTiers = {},
  datasetTiers = {},
  handleTierChange,
  fetchDatasetTiers,
  handleCreateSubset,
  datasetSubsets,
  onPurchaseSubset,
  onViewSubset,
  onDownloadSubset,
  activeSubsetId,
}) => {
  // Refs for managing focus and modal accessibility
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Local state for expanded tier view
  const [expandedTierCards, setExpandedTierCards] = useState({});

  // Toggle tier view expansion for a specific dataset
  const toggleTierView = (datasetId) => {
    setExpandedTierCards((prev) => ({
      ...prev,
      [datasetId]: !prev[datasetId],
    }));

    // Fetch tier data if not already loaded
    if (!datasetTiers[datasetId] && fetchDatasetTiers) {
      fetchDatasetTiers(datasetId);
    }
  };

  // Keep track of the element that opened the modal
  useEffect(() => {
    if (previewOpen && closeButtonRef.current) {
      // Store current active element as trigger before opening modal
      triggerRef.current = document.activeElement;
      // Focus the close button when modal opens
      closeButtonRef.current.focus();

      // Fetch tier data for selected dataset if not already loaded
      if (
        selectedDataset &&
        !datasetTiers[selectedDataset] &&
        fetchDatasetTiers
      ) {
        fetchDatasetTiers(selectedDataset);
      }
    }
  }, [previewOpen, selectedDataset, datasetTiers, fetchDatasetTiers]);

  // Handle focus restoration when modal closes
  useEffect(() => {
    if (!previewOpen && triggerRef.current) {
      // Restore focus to trigger when modal closes
      triggerRef.current.focus();
    }
  }, [previewOpen]);

  // Handle keyboard events (ESC key) for the modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (previewOpen && e.key === "Escape") {
        handleClosePreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen, handleClosePreview]);

  // Handle dataset purchase confirmation
  const renderSearchAndFilters = () => (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/30 shadow-md">
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search datasets by keyword, description, or category..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search datasets"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" aria-hidden="true" />
          </div>
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center bg-blue-500 text-white px-4 rounded-r-lg hover:bg-blue-600 transition-colors"
            onClick={handleSearch}
            aria-label="Search"
          >
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onChange={(e) => updateFilter("category", e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((category) => (
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
            onChange={(e) => updateFilter("priceRange", e.target.value)}
            aria-label="Filter by price range"
          >
            <option value="all">All Prices</option>
            <option value="low">Low (≤ 0.1 ETH)</option>
            <option value="medium">Medium (0.1-0.25 ETH)</option>
            <option value="high">High ({"> "}0.25 ETH)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="sortBy"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Sort By
          </label>
          <select
            id="sortBy"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={filters.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            aria-label="Sort results"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="size_asc">Size: Small to Large</option>
            <option value="size_desc">Size: Large to Small</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              checked={filters.verifiedOnly}
              onChange={(e) => updateFilter("verifiedOnly", e.target.checked)}
              aria-label="Show verified data only"
            />
            <span className="text-gray-700">Verified data only</span>
          </label>

          <div className="ml-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                checked={showOnlyFavorites}
                onChange={(e) => handleToggleFavorites(e.target.checked)}
                aria-label="Show favorites only"
              />
              <span className="text-gray-700">Show favorites only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAdvancedFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-expanded={advancedFiltersOpen}
            aria-controls="advanced-filters-section"
          >
            <Filter size={16} className="mr-2" aria-hidden="true" />
            Advanced Filters
            <ChevronDown
              size={16}
              className={`ml-1 transform transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          <button
            onClick={handleResetFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Reset all filters"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {advancedFiltersOpen && (
        <div
          className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
          id="advanced-filters-section"
          aria-label="Advanced filter options"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onChange={(e) => updateFilter("minAge", e.target.value)}
                min="0"
                max="120"
                aria-label="Minimum age"
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
                onChange={(e) => updateFilter("maxAge", e.target.value)}
                min="0"
                max="120"
                aria-label="Maximum age"
              />
            </div>

            <div>
              <label
                htmlFor="studyType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Study Type
              </label>
              <select
                id="studyType"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={filters.studyType}
                onChange={(e) => updateFilter("studyType", e.target.value)}
                aria-label="Filter by study type"
              >
                {studyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="dataFormat"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Data Format
              </label>
              <select
                id="dataFormat"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={filters.dataFormat}
                onChange={(e) => updateFilter("dataFormat", e.target.value)}
                aria-label="Filter by data format"
              >
                {dataFormats.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="recordSize"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Record Size
              </label>
              <select
                id="recordSize"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={filters.recordSize}
                onChange={(e) => updateFilter("recordSize", e.target.value)}
                aria-label="Filter by record size"
              >
                <option value="all">All Sizes</option>
                <option value="small">Small (&lt; 1,000 records)</option>
                <option value="medium">Medium (1,000-10,000 records)</option>
                <option value="large">Large (&gt; 10,000 records)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dataAge"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Data Age
              </label>
              <select
                id="dataAge"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={filters.dataAge}
                onChange={(e) => updateFilter("dataAge", e.target.value)}
                aria-label="Filter by data age"
              >
                <option value="all">All Ages</option>
                <option value="recent">Recent (&lt; 6 months)</option>
                <option value="older">Older (&gt; 6 months)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render view toggle and count
  const renderViewOptions = () => (
    <div className="flex justify-between items-center mb-6">
      <p className="text-gray-600 font-medium" aria-live="polite">
        Showing {filteredData.length} of {totalCount} datasets
      </p>

      <div
        className="flex items-center gap-2"
        role="radiogroup"
        aria-label="View mode"
      >
        <button
          onClick={() => handleViewModeChange("grid")}
          className={`p-2 rounded-md ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
          aria-label="Grid View"
          aria-pressed={viewMode === "grid"}
        >
          <div className="grid grid-cols-2 gap-1">
            <div className="w-3 h-3 bg-current rounded-sm"></div>
            <div className="w-3 h-3 bg-current rounded-sm"></div>
            <div className="w-3 h-3 bg-current rounded-sm"></div>
            <div className="w-3 h-3 bg-current rounded-sm"></div>
          </div>
        </button>

        <button
          onClick={() => handleViewModeChange("table")}
          className={`p-2 rounded-md ${viewMode === "table" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
          aria-label="Table View"
          aria-pressed={viewMode === "table"}
        >
          <div className="flex flex-col gap-1">
            <div className="w-6 h-2 bg-current rounded-sm"></div>
            <div className="w-6 h-2 bg-current rounded-sm"></div>
            <div className="w-6 h-2 bg-current rounded-sm"></div>
          </div>
        </button>
      </div>
    </div>
  );

  // Render grid view with tier selection
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredData.map((data) => (
        <div
          key={data.id}
          className="bg-white/90 backdrop-blur-md h-full rounded-xl shadow-md border border-white/30 
                     transition-all duration-300 hover:shadow-lg flex flex-col overflow-hidden"
        >
          <div className="p-6 flex-grow">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold">
                {data.title || data.category}
              </h3>
              <button
                onClick={() => toggleFavorite(data.id)}
                className={`p-1 rounded-full ${favoriteDatasets.includes(data.id) ? "text-yellow-500" : "text-gray-400"}`}
                aria-label={
                  favoriteDatasets.includes(data.id)
                    ? `Remove ${data.title || data.category} from favorites`
                    : `Add ${data.title || data.category} to favorites`
                }
              >
                {favoriteDatasets.includes(data.id) ? (
                  <Star size={18} aria-hidden="true" />
                ) : (
                  <StarOff size={18} aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {data.category}
              </span>
              {data.verified && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                  <CheckCircle size={12} className="mr-1" aria-hidden="true" />
                  Verified
                </span>
              )}
              {data.studyType && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {data.studyType}
                </span>
              )}
              {data.format && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {data.format}
                </span>
              )}
            </div>

            <div className="mt-3 text-gray-600 text-sm">
              <div className="flex items-center gap-1 mb-1">
                <FileText size={14} aria-hidden="true" />
                <span>
                  {data.recordCount?.toLocaleString() || "Unknown"} records
                </span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart size={14} aria-hidden="true" />
                <span>{data.anonymized ? "Anonymized" : "Identifiable"}</span>
              </div>
            </div>

            <p className="mt-3 text-gray-700 line-clamp-2">
              {data.description || "No description available."}
            </p>

            {expandedTierCards[data.id] ? (
              <div className="mt-4">
                {datasetTiers[data.id] ? (
                  <DataTierSelector
                    datasetId={data.id}
                    datasetName={data.title || data.category}
                    fullRecordCount={data.recordCount}
                    fullPrice={parseFloat(data.price)}
                    onTierChange={(tierData) =>
                      handleTierChange(data.id, tierData.tier)
                    }
                    className="mt-2"
                  />
                ) : (
                  <div className="flex justify-center my-4">
                    <LoadingSpinner size="small" label="Loading tiers..." />
                  </div>
                )}
                <button
                  onClick={() => toggleTierView(data.id)}
                  className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Hide tier options
                </button>
              </div>
            ) : (
              <>
                <p className="mt-4 text-xl font-bold text-blue-600">
                  {data.price} ETH
                </p>
                <button
                  onClick={() => toggleTierView(data.id)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <ChevronDown size={14} className="mr-1" />
                  View pricing tiers
                </button>
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => handleViewDataset(data.id)}
                className="flex-1 py-2 px-3 bg-white border border-blue-500 text-blue-500 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                aria-label={`Preview details for ${data.title || data.category}`}
              >
                Preview
              </button>
              <EnhancedPurchaseButton
                dataset={{
                  id: data.id,
                  price: selectedTiers[data.id]?.price || data.price,
                  title: data.title || data.category,
                }}
                selectedTier={selectedTiers[data.id]?.id || "complete"}
                onClick={() => handlePurchase(data.id)}
                loading={
                  purchasingDataset === data.id &&
                  (purchaseStep === "processing" ||
                    purchaseStep === "confirming")
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render table view with tier information
  const renderTableView = () => (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md">
      <table
        className="min-w-full divide-y divide-gray-200"
        aria-label="Available health datasets"
      >
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Dataset
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Category
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Records
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Format
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tier
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Price
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.map((data) => (
            <tr key={data.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="ml-1">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 mr-2">
                        {data.title || data.category}
                      </div>
                      {data.verified && (
                        <CheckCircle
                          size={16}
                          className="text-green-500"
                          aria-label="Verified data"
                        />
                      )}
                      <button
                        onClick={() => toggleFavorite(data.id)}
                        className={`ml-2 ${favoriteDatasets.includes(data.id) ? "text-yellow-500" : "text-gray-400"}`}
                        aria-label={
                          favoriteDatasets.includes(data.id)
                            ? `Remove ${data.title || data.category} from favorites`
                            : `Add ${data.title || data.category} to favorites`
                        }
                      >
                        {favoriteDatasets.includes(data.id) ? (
                          <Star size={16} aria-hidden="true" />
                        ) : (
                          <StarOff size={16} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 max-w-md truncate">
                      {data.description || "No description available."}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {data.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {data.recordCount?.toLocaleString() || "Unknown"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {data.format || "Various"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {datasetTiers[data.id] ? (
                  <select
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    value={selectedTiers[data.id]?.id || "complete"}
                    onChange={(e) => {
                      const selected = datasetTiers[data.id].find(
                        (t) => t.id === e.target.value
                      );
                      if (selected && handleTierChange) {
                        handleTierChange(data.id, selected);
                      }
                    }}
                  >
                    {datasetTiers[data.id].map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({tier.percentage}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() =>
                      fetchDatasetTiers && fetchDatasetTiers(data.id)
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Load Tiers
                  </button>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-blue-600">
                  {selectedTiers[data.id]?.price || data.price} ETH
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleViewDataset(data.id)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label={`Preview ${data.title || data.category}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handlePurchase(data.id)}
                    className={`text-green-600 hover:text-green-800 flex items-center gap-1 ${
                      purchasingDataset === data.id &&
                      (purchaseStep === "processing" ||
                        purchaseStep === "confirming")
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                    disabled={
                      purchasingDataset === data.id &&
                      (purchaseStep === "processing" ||
                        purchaseStep === "confirming")
                    }
                    aria-label={`Purchase ${data.title || data.category}`}
                  >
                    {purchasingDataset === data.id &&
                    (purchaseStep === "processing" ||
                      purchaseStep === "confirming") ? (
                      <>
                        <LoadingSpinner size="small" color="green" />
                        Processing...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render dataset preview modal with enhanced accessibility and tier selection
  const renderDatasetPreview = () => {
    if (!previewOpen || !selectedDataset) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        ref={modalRef}
        onClick={(e) => {
          // Close the modal when clicking outside of it
          if (modalRef.current === e.target) {
            handleClosePreview();
          }
        }}
      >
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header - make it sticky */}
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold" id="preview-title">
                Dataset Preview
              </h3>
              <button
                ref={closeButtonRef}
                onClick={handleClosePreview}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-full p-1"
                aria-label="Close preview"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content - allow scrolling in the middle section */}
          <div className="p-6 overflow-y-auto flex-grow">
            {detailsLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner
                  size="large"
                  label="Loading dataset details..."
                  showLabel={true}
                />
              </div>
            ) : datasetDetails ? (
              <div className="space-y-6">
                {/* existing content */}
                {/* ... */}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle
                  size={48}
                  className="mx-auto text-gray-400 mb-4"
                  aria-hidden="true"
                />
                <p className="text-gray-500">Dataset details not available</p>
              </div>
            )}
          </div>

          {/* Footer - make it sticky */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Close
              </button>

              <button
                onClick={() =>
                  handleCreateSubset && handleCreateSubset(selectedDataset)
                }
                className="px-4 py-2 border border-blue-500 text-blue-600 font-medium rounded-lg hover:bg-blue-50 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <Filter size={16} className="mr-2" aria-hidden="true" />
                Create Custom Subset
              </button>

              <button
                onClick={() => handleDownloadDataset(selectedDataset)}
                className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 flex items-center focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <Download size={16} className="mr-2" aria-hidden="true" />
                Download Dataset
              </button>

              <EnhancedPurchaseButton
                dataset={{
                  id: selectedDataset,
                  price:
                    selectedTiers[selectedDataset]?.price ||
                    datasetDetails?.price ||
                    "0.00",
                  title: datasetDetails?.title || "Dataset",
                }}
                selectedTier={selectedTiers[selectedDataset]?.id || "complete"}
                onClick={() => {
                  handlePurchase(selectedDataset);
                  handleClosePreview();
                }}
                loading={
                  purchasingDataset === selectedDataset &&
                  (purchaseStep === "processing" ||
                    purchaseStep === "confirming")
                }
              />

              {datasetDetails?.sampleUrl && (
                <button
                  onClick={() =>
                    window.open(datasetDetails.sampleUrl, "_blank")
                  }
                  className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <Download size={16} className="mr-2" aria-hidden="true" />
                  Download Sample
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Standard WalletBalanceDisplay component */}
      <WalletBalanceDisplay
        className="mb-6"
        refreshTrigger={purchasingDataset}
      />

      <div className="mt-4">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          Browse Health Data{userRole === "researcher" ? " for Research" : ""}
        </h1>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle
              size={20}
              className="text-red-500"
              aria-hidden="true"
            />
            <span>{error}</span>
            <button
              className="ml-auto text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded-full"
              onClick={() => window.location.reload()}
              aria-label="Reload page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
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

        {/* Search & Filters */}
        {renderSearchAndFilters()}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner
              size="large"
              label="Loading health datasets..."
              showLabel={true}
            />
          </div>
        ) : (
          <>
            {/* View Options and Count */}
            {renderViewOptions()}

            {/* Data Grid/Table */}
            {viewMode === "grid" ? renderGridView() : renderTableView()}

            {/* No Results Message */}
            {filteredData.length === 0 && (
              <div
                className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 flex items-center gap-2"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle
                  size={20}
                  className="text-blue-500"
                  aria-hidden="true"
                />
                <span>
                  No records match your current filters. Try adjusting your
                  search criteria.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dataset Preview Modal */}
      {renderDatasetPreview()}
      {selectedDataset && datasetSubsets && (
        <div className="mt-6">
          <DatasetSubsetList
            subsets={datasetSubsets(selectedDataset) || []}
            datasetName={datasetDetails?.title || "Dataset"}
            onPurchaseSubset={onPurchaseSubset}
            onViewSubset={onViewSubset}
            onDownloadSubset={onDownloadSubset}
            activeSubsetId={activeSubsetId}
          />
        </div>
      )}
    </div>
  );
};

DataBrowserView.propTypes = {
  userRole: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  filters: PropTypes.object,
  updateFilter: PropTypes.func.isRequired,
  totalCount: PropTypes.number,
  filteredData: PropTypes.array,
  favoriteDatasets: PropTypes.array,
  toggleFavorite: PropTypes.func.isRequired,
  handlePurchase: PropTypes.func.isRequired,
  handleViewDataset: PropTypes.func.isRequired,
  handleDownloadDataset: PropTypes.func.isRequired,
  searchInput: PropTypes.string,
  handleSearchInputChange: PropTypes.func.isRequired,
  handleSearchKeyDown: PropTypes.func.isRequired,
  handleSearch: PropTypes.func.isRequired,
  toggleAdvancedFilters: PropTypes.func.isRequired,
  advancedFiltersOpen: PropTypes.bool,
  handleResetFilters: PropTypes.func.isRequired,
  handleToggleFavorites: PropTypes.func.isRequired,
  showOnlyFavorites: PropTypes.bool,
  viewMode: PropTypes.string,
  handleViewModeChange: PropTypes.func.isRequired,
  previewOpen: PropTypes.bool,
  handleClosePreview: PropTypes.func.isRequired,
  selectedDataset: PropTypes.string,
  detailsLoading: PropTypes.bool,
  datasetDetails: PropTypes.object,
  categories: PropTypes.array.isRequired,
  studyTypes: PropTypes.array.isRequired,
  dataFormats: PropTypes.array.isRequired,
  consentVerified: PropTypes.bool,
  purchasingDataset: PropTypes.string,
  purchaseStep: PropTypes.string,
  handlePurchaseStart: PropTypes.func,
  handlePurchaseComplete: PropTypes.func,
  handlePurchaseError: PropTypes.func,
  walletBalance: PropTypes.string,
  selectedTiers: PropTypes.object,
  datasetTiers: PropTypes.object,
  handleTierChange: PropTypes.func,
  fetchDatasetTiers: PropTypes.func,
  handleCreateSubset: PropTypes.func,
  datasetSubsets: PropTypes.func,
  onPurchaseSubset: PropTypes.func,
  onViewSubset: PropTypes.func,
  onDownloadSubset: PropTypes.func,
  activeSubsetId: PropTypes.string,
};

export default DataBrowserView;
