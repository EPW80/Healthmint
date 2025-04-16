// src/components/WalletBalanceDisplay.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { RefreshCw, Wallet, DollarSign, AlertTriangle } from "lucide-react";
import mockPaymentService from "../services/mockPaymentService.js";

// Mock payment service
const WalletBalanceDisplay = ({ className = "", refreshTrigger = null }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format ETH with appropriate precision
  const formatEth = (value) => {
    if (!value) return "0 ETH";
    const num = parseFloat(value);
    if (num === 0) return "0 ETH";
    return num < 0.001
      ? "< 0.001 ETH"
      : `${num.toFixed(num < 0.1 ? 4 : 3)} ETH`;
  };

  // Fetch wallet balance
  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      // Make sure mock service is initialized
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      const walletBalance = await mockPaymentService.getBalance();
      setBalance(walletBalance);
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
      setError("Failed to load balance");
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchBalance();

    // Set up periodic balance updates
    const intervalId = setInterval(fetchBalance, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-100 rounded-lg p-3 ${className}`}
      >
        <div className="flex items-center">
          <AlertTriangle size={20} className="text-red-500 mr-2" />
          <div>
            <p className="text-sm text-red-700">Balance update failed</p>
            <button
              onClick={fetchBalance}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-blue-50 border border-blue-100 rounded-lg p-4 ${className}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-full mr-3">
            <Wallet className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Wallet Balance
            </h3>
            <div className="flex items-center mt-1">
              <DollarSign className="text-blue-600 h-4 w-4 mr-1" />
              {loading ? (
                <div className="h-5 w-16 bg-blue-100 animate-pulse rounded"></div>
              ) : (
                <span className="text-lg font-bold text-blue-700">
                  {formatEth(balance)}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={fetchBalance}
          disabled={loading}
          className={`p-2 rounded-full text-blue-500 hover:bg-blue-100 transition-colors ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Refresh balance"
          aria-label="Refresh wallet balance"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="text-xs text-blue-600 mt-2">
        Available for dataset purchases and transactions
      </p>
    </div>
  );
};

WalletBalanceDisplay.propTypes = {
  className: PropTypes.string,
  refreshTrigger: PropTypes.any, // Can be any type, used to trigger refresh
};

export default WalletBalanceDisplay;
