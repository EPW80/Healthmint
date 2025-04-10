import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Lock,
  AlertCircle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import PropTypes from "prop-types";
import mockPaymentService from "../services/mockPaymentService.js";

// This component is responsible for rendering a button that allows users to purchase a dataset.
// It handles the purchase process, including payment processing and transaction confirmation.
const DatasetPurchaseButton = ({
  dataset,
  selectedTier = "complete",
  onPurchaseStart,
  onPurchaseComplete,
  onPurchaseError,
  className = "",
}) => {
  const [purchaseState, setPurchaseState] = useState("ready"); // ready, processing, confirming, success, error
  const [error, setError] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  // Animation for processing state
  useEffect(() => {
    let intervalId;
    if (purchaseState === "processing" || purchaseState === "confirming") {
      intervalId = setInterval(() => {
        setProgressStep((prev) => (prev + 1) % 3);
      }, 800);
    } else {
      setProgressStep(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [purchaseState]);

  // Expand transaction details automatically when purchase succeeds
  useEffect(() => {
    if (purchaseState === "success" && transactionDetails) {
      setShowTransactionDetails(true);
    }
  }, [purchaseState, transactionDetails]);

  const handlePurchase = async () => {
    try {
      // Notify parent component that purchase is starting
      if (onPurchaseStart) {
        onPurchaseStart(dataset.id, selectedTier);
      }

      // Calculate the price based on tier
      let purchasePrice = dataset.price;
      if (selectedTier === "basic") {
        purchasePrice = parseFloat(dataset.price) * 0.25;
      } else if (selectedTier === "standard") {
        purchasePrice = parseFloat(dataset.price) * 0.5;
      }

      setPurchaseState("processing");
      setError(null);
      setShowTransactionDetails(false);

      // Initialize mock payment provider if needed
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      // Check balance before proceeding
      const balance = await mockPaymentService.getBalance();
      if (parseFloat(balance) < parseFloat(purchasePrice)) {
        // Use purchasePrice here instead of dataset.price
        setPurchaseState("error");
        setError(
          "Insufficient funds to complete this purchase. Please add more ETH to your wallet."
        );

        // Notify parent component of error
        if (onPurchaseError) {
          onPurchaseError(dataset.id, {
            message: "Insufficient funds to complete this purchase",
          });
        }
        return; // Exit early if insufficient funds
      }

      // Update state to confirming - simulates blockchain confirmation
      setPurchaseState("confirming");

      // Process the payment with mock service - use purchasePrice here
      const result = await mockPaymentService.purchaseDataset(
        dataset.id,
        purchasePrice
      );

      if (result.success) {
        setPurchaseState("success");
        setTransactionDetails({
          ...result,
          timestamp: new Date().toISOString(),
          amount: purchasePrice, // Amount paid
        });

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
    setShowTransactionDetails(false);
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

      case "confirming":
        return (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            <span>Confirming...</span>
          </>
        );

      case "success":
        return (
          <>
            <Check className="w-4 h-4 mr-2" />
            <span>Purchase Complete</span>
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
            <DollarSign
              className={`w-4 h-4 mr-2 transition-transform duration-300 ${hovered ? "scale-110" : ""}`}
            />
            <span>Purchase ({dataset.price} ETH)</span>
            <ArrowRight
              className={`ml-1 w-4 h-4 transition-transform duration-300 ${hovered ? "translate-x-1" : ""}`}
            />
          </>
        );
    }
  };

  // Style based on state
  const buttonStyle = () => {
    switch (purchaseState) {
      case "processing":
        return "bg-blue-500 cursor-not-allowed";
      case "confirming":
        return "bg-purple-500 cursor-not-allowed";
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

  // Render progress indicator for processing state
  const renderProgressIndicator = () => {
    if (purchaseState !== "processing" && purchaseState !== "confirming")
      return null;

    return (
      <div className="mt-2 flex items-center justify-between bg-blue-50 p-2 rounded-lg">
        {/* Node 1 */}
        <div
          className={`w-8 h-8 rounded-full ${progressStep >= 0 ? "bg-blue-100 border-blue-500" : "bg-gray-100 border-gray-300"} border-2 flex items-center justify-center text-xs`}
        >
          {progressStep > 0 ? (
            <Check size={14} className="text-blue-500" />
          ) : (
            "1"
          )}
        </div>
        {/* Line */}
        <div className="h-[2px] flex-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressStep >= 1 ? "100%" : "0%"}` }}
          ></div>
        </div>
        {/* Node 2 */}
        <div
          className={`w-8 h-8 rounded-full ${progressStep >= 1 ? "bg-blue-100 border-blue-500" : "bg-gray-100 border-gray-300"} border-2 flex items-center justify-center text-xs`}
        >
          {progressStep > 1 ? (
            <Check size={14} className="text-blue-500" />
          ) : (
            "2"
          )}
        </div>
        {/* Line */}
        <div className="h-[2px] flex-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressStep >= 2 ? "100%" : "0%"}` }}
          ></div>
        </div>
        {/* Node 3 */}
        <div
          className={`w-8 h-8 rounded-full ${progressStep >= 2 ? "bg-blue-100 border-blue-500" : "bg-gray-100 border-gray-300"} border-2 flex items-center justify-center text-xs`}
        >
          {progressStep > 2 ? (
            <Check size={14} className="text-blue-500" />
          ) : (
            "3"
          )}
        </div>
      </div>
    );
  };

  // Render transaction details section
  const renderTransactionDetails = () => {
    if (!transactionDetails || !showTransactionDetails) return null;

    return (
      <div className="mt-2 bg-green-50 p-3 rounded-lg border border-green-100 relative">
        <button
          onClick={() => setShowTransactionDetails(false)}
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          aria-label="Close details"
        >
          <X size={14} />
        </button>

        <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
          <Check size={16} className="mr-1" /> Transaction Successful
        </h4>

        <div className="text-xs space-y-1 text-green-700">
          <p>
            <span className="font-medium">Amount:</span> {dataset.price} ETH
          </p>
          <p>
            <span className="font-medium">Transaction Hash:</span>{" "}
            {transactionDetails.transactionHash.substring(0, 10)}...
            {transactionDetails.transactionHash.substring(
              transactionDetails.transactionHash.length - 6
            )}
          </p>
          <p>
            <span className="font-medium">Block:</span>{" "}
            {transactionDetails.blockNumber}
          </p>
          <p>
            <span className="font-medium">Time:</span>{" "}
            {new Date(transactionDetails.timestamp).toLocaleTimeString()}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <span className="text-green-600 font-medium">Confirmed</span>
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-green-200 flex justify-between items-center">
          <span className="text-xs text-green-600">Dataset access granted</span>
          <Lock size={14} className="text-green-600" />
        </div>
      </div>
    );
  };

  // Render error details
  const renderErrorDetails = () => {
    if (!error || purchaseState !== "error") return null;

    return (
      <div className="mt-2 bg-red-50 p-3 rounded-lg border border-red-100">
        <h4 className="text-sm font-medium text-red-800 mb-1 flex items-center">
          <AlertCircle size={16} className="mr-1" /> Transaction Failed
        </h4>
        <p className="text-xs text-red-700">{error}</p>

        {/* Add a helpful message for insufficient funds */}
        {error.includes("Insufficient funds") && (
          <p className="text-xs text-red-700 mt-2">
            Try adding more ETH to your wallet or selecting a less expensive
            dataset.
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={
          purchaseState === "processing" || purchaseState === "confirming"
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative overflow-hidden flex items-center justify-center px-4 py-2 rounded-lg text-white transition-colors ${buttonStyle()} ${className}`}
        title={error || `Purchase dataset for ${dataset.price} ETH`}
      >
        {/* Background pulse animation when hovered */}
        {purchaseState === "ready" && (
          <div
            className={`absolute inset-0 bg-blue-400 transition-opacity duration-700 ${
              hovered ? "opacity-30" : "opacity-0"
            }`}
            style={{
              animation: hovered ? "pulse 1.5s infinite" : "none",
            }}
          ></div>
        )}

        {/* Button content */}
        <div className="relative z-10 flex items-center justify-center">
          {renderButtonContent()}
        </div>
      </button>

      {/* Transaction progress indicator */}
      {renderProgressIndicator()}

      {/* Error message */}
      {renderErrorDetails()}

      {/* Transaction details */}
      {renderTransactionDetails()}

      {/* Pulse animation CSS */}
      <style>
        {`
    @keyframes pulse {
      0% {
        opacity: 0.3;
        transform: scale(1);
      }
      50% {
        opacity: 0.1;
        transform: scale(1.05);
      }
      100% {
        opacity: 0.3;
        transform: scale(1);
      }
    }
  `}
      </style>
    </div>
  );
};

DatasetPurchaseButton.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
  }).isRequired,
  selectedTier: PropTypes.oneOf(["basic", "standard", "complete"]),
  onPurchaseStart: PropTypes.func,
  onPurchaseComplete: PropTypes.func,
  onPurchaseError: PropTypes.func,
  className: PropTypes.string,
};

export default DatasetPurchaseButton;
