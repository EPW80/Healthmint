// src/components/TransactionModal.js
import React from "react";
import PropTypes from "prop-types";
import { X, CheckCircle, AlertCircle, ArrowUpRight, Clock } from "lucide-react";

/**
 * Transaction Modal Component
 *
 * Displays a modal with transaction status and details for dataset purchases
 */
const TransactionModal = ({
  isOpen,
  onClose,
  step = "idle", // idle, processing, confirming, complete, error
  details = {},
}) => {
  if (!isOpen) return null;

  // Format ETH with appropriate precision
  const formatEth = (value) => {
    if (!value) return "0 ETH";
    const num = parseFloat(value);
    if (num === 0) return "0 ETH";
    return num < 0.001
      ? "< 0.001 ETH"
      : `${num.toFixed(num < 0.1 ? 4 : 3)} ETH`;
  };

  // Get appropriate icon based on transaction step
  const getStepIcon = () => {
    switch (step) {
      case "complete":
        return <CheckCircle size={48} className="text-green-500" />;
      case "error":
        return <AlertCircle size={48} className="text-red-500" />;
      case "confirming":
        return <Clock size={48} className="text-yellow-500" />;
      case "processing":
      default:
        return <ArrowUpRight size={48} className="text-blue-500" />;
    }
  };

  // Get appropriate step title
  const getStepTitle = () => {
    switch (step) {
      case "complete":
        return "Transaction Complete";
      case "error":
        return "Transaction Failed";
      case "confirming":
        return "Confirming Transaction";
      case "processing":
      default:
        return "Processing Transaction";
    }
  };

  // Get appropriate message based on step
  const getMessage = () => {
    if (details.message) return details.message;

    switch (step) {
      case "complete":
        return "Your purchase was successful! You now have access to this dataset.";
      case "error":
        return (
          details.errorMessage ||
          "An error occurred during the transaction. Please try again."
        );
      case "confirming":
        return "Your transaction is being confirmed on the blockchain. This may take a few moments...";
      case "processing":
      default:
        return "Processing your purchase request...";
    }
  };

  // Helper function to show transaction details if available
  const renderTransactionDetails = () => {
    if (step !== "complete" && step !== "error") return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
        <h4 className="font-medium mb-2">Transaction Details</h4>

        {details.amount && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">{formatEth(details.amount)}</span>
          </div>
        )}

        {details.datasetId && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Dataset ID:</span>
            <span className="font-medium truncate max-w-[200px]">
              {details.datasetId}
            </span>
          </div>
        )}

        {details.transactionHash && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Transaction Hash:</span>
            <span className="font-medium">{`${details.transactionHash.substring(0, 10)}...${details.transactionHash.substring(details.transactionHash.length - 6)}`}</span>
          </div>
        )}

        {details.blockNumber && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Block Number:</span>
            <span className="font-medium">{details.blockNumber}</span>
          </div>
        )}

        {details.timestamp && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">
              {new Date(details.timestamp).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{getStepTitle()}</h3>
          <button
            onClick={onClose}
            disabled={step === "processing" || step === "confirming"}
            className={`text-gray-500 hover:text-gray-700 rounded-full p-1 ${
              step === "processing" || step === "confirming"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            {step === "processing" ? (
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-blue-500"></div>
            ) : (
              getStepIcon()
            )}
          </div>

          <p
            className={`text-lg font-medium ${
              step === "error"
                ? "text-red-600"
                : step === "complete"
                  ? "text-green-600"
                  : "text-gray-800"
            }`}
          >
            {getMessage()}
          </p>

          {/* Transaction Details */}
          {renderTransactionDetails()}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end">
          {step === "complete" || step === "error" ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 bg-blue-300 text-white rounded-lg cursor-not-allowed"
            >
              {step === "confirming" ? "Confirming..." : "Processing..."}
            </button>
          )}
        </div>
      </div>
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