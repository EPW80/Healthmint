// src/components/TransactionModal.js
import React from "react";
import PropTypes from "prop-types";
import { XCircle, Loader, CheckCircle, AlertCircle } from "lucide-react"; // Assuming lucide-react for icons

// TransactionModal: A modal component to display transaction status and details
const TransactionModal = ({ isOpen, onClose, step = "idle", details = {} }) => {
  if (!isOpen) return null;

  // Format ETH with appropriate precision (assuming amount is in wei)
  const formatEth = (amount) => {
    if (!amount) return "0.00";
    const ethAmount = parseFloat(amount) / 1e18; // Convert wei to ETH
    return ethAmount.toFixed(4); // Adjust precision as needed
  };

  // Get appropriate icon based on transaction step
  const getStepIcon = () => {
    switch (step) {
      case "processing":
        return <Loader className="animate-spin text-blue-500" size={24} />;
      case "confirming":
        return <Loader className="animate-spin text-yellow-500" size={24} />;
      case "complete":
        return <CheckCircle className="text-green-500" size={24} />;
      case "error":
        return <AlertCircle className="text-red-500" size={24} />;
      default:
        return null;
    }
  };

  // Get appropriate step title
  const getStepTitle = () => {
    switch (step) {
      case "processing":
        return "Processing Transaction";
      case "confirming":
        return "Confirming Transaction";
      case "complete":
        return "Transaction Complete";
      case "error":
        return "Transaction Error";
      default:
        return "Transaction Status";
    }
  };

  // Get appropriate message based on step
  const getStepMessage = () => {
    switch (step) {
      case "processing":
        return "Your transaction is being processed. Please wait...";
      case "confirming":
        return "Waiting for blockchain confirmation...";
      case "complete":
        return "Your transaction has been successfully completed.";
      case "error":
        return "An error occurred during the transaction.";
      default:
        return "";
    }
  };

  // Helper function to show transaction details if available
  const renderDetail = (label, value) => (
    <div className="flex justify-between text-sm mb-2">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          <XCircle size={24} />
        </button>
        <div className="flex items-center justify-center mb-4">
          {getStepIcon()}
          <h2 className="text-xl font-bold ml-2">{getStepTitle()}</h2>
        </div>
        <p className="text-center text-gray-600 mb-4">{getStepMessage()}</p>
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          {details.datasetId && renderDetail("Dataset ID", details.datasetId)}
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
          {details.recordCount &&
            renderDetail(
              "Records",
              `${details.recordCount.toLocaleString()} records`
            )}
          {details.amount &&
            renderDetail("Amount", `${formatEth(details.amount)} ETH`)}
          {details.timestamp &&
            renderDetail(
              "Time",
              new Date(details.timestamp).toLocaleTimeString()
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
  details: PropTypes.shape({
    datasetId: PropTypes.string,
    tier: PropTypes.string,
    recordCount: PropTypes.number,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    transactionHash: PropTypes.string,
    error: PropTypes.bool,
    errorMessage: PropTypes.string,
  }),
};

export default TransactionModal;
