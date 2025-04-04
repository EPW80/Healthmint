import React, { useState } from "react";
import { DollarSign, Lock } from "lucide-react";
import PropTypes from "prop-types";
import paymentProvider from "../services/paymentProvider";

/**
 * DatasetPurchaseButton Component
 *
 * A simple button component that handles dataset purchase interactions.
 * Shows appropriate states for the purchase process.
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

  const handlePurchase = async () => {
    try {
      // Notify parent component that purchase is starting
      if (onPurchaseStart) {
        onPurchaseStart(dataset.id);
      }

      setPurchaseState("processing");
      setError(null);

      // Initialize payment provider if needed
      await paymentProvider.initializeProvider();

      // Process the payment
      const result = await paymentProvider.purchaseDataset(
        dataset.id,
        dataset.price
      );

      if (result.success) {
        setPurchaseState("success");

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
            <span className="text-sm">Failed - Try Again</span>
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
