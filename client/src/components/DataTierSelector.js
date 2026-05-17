// src/components/DataTierSelector.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { CheckCircle, AlertTriangle } from "lucide-react";

// PropTypes
const DataTierSelector = ({
  datasetId,
  datasetName,
  fullRecordCount,
  fullPrice,
  currencySymbol = "ETH",
  onTierChange,
  className = "",
}) => {
  const [selectedTier, setSelectedTier] = useState("complete");
  const [tiers, setTiers] = useState([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Get wallet state from Redux - assuming you have wallet state in Redux
  const walletAddress = useSelector((state) => state.wallet?.address);

  // Calculate tiers based on full record count and price
  useEffect(() => {
    const createTiers = () => {
      // Format price to 4 decimal places
      const formatPrice = (price) => {
        return parseFloat(price).toFixed(4);
      };

      return [
        {
          id: "basic",
          name: "Basic",
          percentage: 25,
          recordCount: Math.round(fullRecordCount * 0.25),
          price: formatPrice(fullPrice * 0.25),
          description:
            "25% sample of records, ideal for initial research exploration",
        },
        {
          id: "standard",
          name: "Standard",
          percentage: 50,
          recordCount: Math.round(fullRecordCount * 0.5),
          price: formatPrice(fullPrice * 0.5),
          description:
            "50% sample with balanced representation of the full dataset",
        },
        {
          id: "complete",
          name: "Complete",
          percentage: 100,
          recordCount: fullRecordCount,
          price: formatPrice(fullPrice),
          description: "Full dataset with all available records",
        },
      ];
    };

    setTiers(createTiers());
  }, [fullRecordCount, fullPrice]);

  // Check if wallet is connected when component mounts
  useEffect(() => {
    setIsWalletConnected(!!walletAddress);
  }, [walletAddress]);

  // Handle tier selection
  const handleTierSelect = (tierId) => {
    setSelectedTier(tierId);

    // Find the selected tier
    const selectedTierData = tiers.find((tier) => tier.id === tierId);

    // Call the onTierChange callback with tier data
    if (onTierChange && selectedTierData) {
      onTierChange({
        datasetId,
        tier: selectedTierData,
      });
    }
  };

  // Get the currently selected tier object
  const getSelectedTier = () => {
    return tiers.find((tier) => tier.id === selectedTier) || tiers[2]; // Default to complete tier
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-4">Select Data Tier</h3>

      <div className="space-y-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedTier === tier.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
            }`}
            onClick={() => handleTierSelect(tier.id)}
          >
            <div className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                  selectedTier === tier.id
                    ? "bg-blue-500"
                    : "border border-gray-300"
                }`}
              >
                {selectedTier === tier.id && (
                  <CheckCircle size={14} className="text-white" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier.name}</span>
                  <span className="font-bold text-blue-600">
                    {tier.price} {currencySymbol}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {tier.recordCount.toLocaleString()} records (
                    {tier.percentage}%)
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-1">{tier.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center ${
            isWalletConnected
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!isWalletConnected}
          onClick={() => {
            // You would implement purchase logic here or use existing purchase functionality
            const selectedTierData = getSelectedTier();
            console.log(
              `Purchasing ${selectedTierData.name} tier of ${datasetName}`
            );
            // Dispatch purchase action or call API
          }}
        >
          {isWalletConnected ? (
            <>
              Purchase ({getSelectedTier().price} {currencySymbol})
            </>
          ) : (
            <div className="flex items-center">
              <AlertTriangle size={16} className="mr-2" />
              Connect wallet to purchase
            </div>
          )}
        </button>
      </div>

      {!isWalletConnected && (
        <p className="text-xs text-center text-gray-500 mt-2">
          You need to connect your wallet to purchase data.
        </p>
      )}
    </div>
  );
};

DataTierSelector.propTypes = {
  datasetId: PropTypes.string.isRequired,
  datasetName: PropTypes.string.isRequired,
  fullRecordCount: PropTypes.number.isRequired,
  fullPrice: PropTypes.number.isRequired,
  currencySymbol: PropTypes.string,
  onTierChange: PropTypes.func,
  className: PropTypes.string,
};

export default DataTierSelector;
