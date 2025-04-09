// src/components/TransactionModal.js
import React from "react";
import PropTypes from "prop-types";

/**
 * Transaction Modal Component
 *
 * Displays a modal with transaction status and details for dataset purchases
 */
const TransactionModal = ({
  isOpen,
  details = {},
}) => {
  if (!isOpen) return null;

  // Format ETH with appropriate precision

  // Get appropriate icon based on transaction step

  // Get appropriate step title

  // Get appropriate message based on step

  // Helper function to show transaction details if available

  return (
    <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
      {details.datasetId && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Dataset ID:</span>
          <span className="font-medium">{details.datasetId}</span>
        </div>
      )}

      {/* Add tier information here */}
      {details.tier && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Data Tier:</span>
          <span className="font-medium capitalize">
            {details.tier === "basic" && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                Basic (25%)
              </span>
            )}
            {details.tier === "standard" && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                Standard (50%)
              </span>
            )}
            {details.tier === "complete" && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                Complete (100%)
              </span>
            )}
            {!["basic", "standard", "complete"].includes(details.tier) &&
              details.tier}
          </span>
        </div>
      )}

      {/* Record count information if available */}
      {details.recordCount && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Records:</span>
          <span className="font-medium">
            {details.recordCount.toLocaleString()} records
          </span>
        </div>
      )}

      {details.amount && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">{details.amount} ETH</span>
        </div>
      )}

      {details.timestamp && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Time:</span>
          <span className="font-medium">
            {new Date(details.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {details.transactionHash && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Transaction:</span>
          <span className="font-medium font-mono text-xs">
            {details.transactionHash.substring(0, 6)}...
            {details.transactionHash.substring(
              details.transactionHash.length - 4
            )}
          </span>
        </div>
      )}

      {details.error && details.errorMessage && (
        <div className="mt-3 text-sm text-red-600">
          <span className="font-medium">Error: </span>
          <span>{details.errorMessage}</span>
        </div>
      )}
    </div>
  );
};

TransactionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  step: PropTypes.oneOf([
    "idle",
    "processing",
    "confirming",
    "complete",
    "error",
  ]),
  details: PropTypes.object,
};

export default TransactionModal;
