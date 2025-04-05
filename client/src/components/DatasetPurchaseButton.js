import React, { useState } from "react";
import { DollarSign, Lock, AlertCircle } from "lucide-react";
import PropTypes from "prop-types";
import mockPaymentService from "../services/mockPaymentService.js";

/**
 * DatasetPurchaseButton Component
 *
 * A button component that handles dataset purchase interactions
 * using the mock payment service.
 */
const DatasetPurchaseButton = ({
  dataset,
  onPurchaseStart,
  onPurchaseComplete,
  onPurchaseError,
  className = "",
}) => {
  const [purchaseState, setPurchaseState] = useState("ready"); // ready, processing, success, error
  const [error, setError] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);

  const handlePurchase = async () => {
    try {
      // Notify parent component that purchase is starting
      if (onPurchaseStart) {
        onPurchaseStart(dataset.id);
      }

      setPurchaseState("processing");
      setError(null);

      // Initialize mock payment provider if needed
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      // Check balance before proceeding (optional)
      const balance = await mockPaymentService.getBalance();
      if (parseFloat(balance) < parseFloat(dataset.price)) {
        throw new Error("Insufficient funds to complete this purchase");
      }

      // Process the payment with mock service
      const result = await mockPaymentService.purchaseDataset(
        dataset.id,
        dataset.price
      );

      if (result.success) {
        setPurchaseState("success");
        setTransactionDetails(result);

        // Notify parent component of successful purchase
        if (onPurchaseComplete) {
          onPurchaseComplete(dataset.id, result);
        }
      } else {
        setError(result.error || "Transaction failed");
        setPurchaseState("error");

        // Notify parent component of error
        if (onPurchaseError) {
          onPurchaseError(dataset.id, result.error);
        }
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err.message || "An unexpected error occurred");
      setPurchaseState("error");

      // Notify parent component of error
      if (onPurchaseError) {
        onPurchaseError(dataset.id, err.message);
      }
    }
  };

  // Reset to ready state
  const handleReset = () => {
    setPurchaseState("ready");
    setError(null);
    setTransactionDetails(null);
  };

  // Different button states
  const renderButtonContent = () => {
    switch (purchaseState) {
      case "processing":
        return (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            <span>Processing...</span>
          </>
        );

      case "success":
        return (
          <>
            <Lock className="w-4 h-4 mr-2" />
            <span>Access Granted</span>
          </>
        );

      case "error":
        return (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Failed - Try Again</span>
          </>
        );

      case "ready":
      default:
        return (
          <>
            <DollarSign className="w-4 h-4 mr-2" />
            <span>Purchase ({dataset.price} ETH)</span>
          </>
        );
    }
  };

  // Style based on state
  const buttonStyle = () => {
    switch (purchaseState) {
      case "processing":
        return "bg-blue-400 cursor-not-allowed";
      case "success":
        return "bg-green-500 hover:bg-green-600";
      case "error":
        return "bg-red-500 hover:bg-red-600";
      case "ready":
      default:
        return "bg-blue-500 hover:bg-blue-600";
    }
  };

  const handleClick = () => {
    if (purchaseState === "ready") {
      handlePurchase();
    } else if (purchaseState === "error" || purchaseState === "success") {
      handleReset();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={purchaseState === "processing"}
        className={`flex items-center justify-center px-4 py-2 rounded-lg text-white transition-colors ${buttonStyle()} ${className}`}
        title={error || `Purchase dataset for ${dataset.price} ETH`}
      >
        {renderButtonContent()}
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {purchaseState === "success" && transactionDetails && (
        <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
          <p>
            Transaction Hash:{" "}
            {transactionDetails.transactionHash.substring(0, 10)}...
          </p>
          <p>Block: {transactionDetails.blockNumber}</p>
        </div>
      )}
    </div>
  );
};

DatasetPurchaseButton.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
  }).isRequired,
  onPurchaseStart: PropTypes.func,
  onPurchaseComplete: PropTypes.func,
  onPurchaseError: PropTypes.func,
  className: PropTypes.string,
};

export default DatasetPurchaseButton;
