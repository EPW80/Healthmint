// src/components/WalletBalanceDisplay.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  RefreshCw,
  Wallet,
  DollarSign,
  AlertTriangle,
  X,
  TrendingUp,
  Clock,
} from "lucide-react";
import mockPaymentService from "../services/mockPaymentService.js";
import "./WalletBalanceDisplay.css";

const WalletBalanceDisplay = ({ className = "", refreshTrigger = null }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Fetch recent transactions (mock data for now)
  const fetchTransactionHistory = async () => {
    try {
      setLoadingHistory(true);
      // Mock transaction history - in a real app would call a blockchain service
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay

      setTransactionHistory([
        {
          id: "tx1",
          type: "purchase",
          amount: "0.015",
          date: new Date(Date.now() - 12 * 60 * 60 * 1000),
          description: "Dataset Purchase",
        },
        {
          id: "tx2",
          type: "deposit",
          amount: "0.25",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          description: "Wallet Funding",
        },
        {
          id: "tx3",
          type: "purchase",
          amount: "0.008",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          description: "Data Subset",
        },
      ]);
    } catch (err) {
      console.error("Error fetching transaction history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open modal and fetch transaction history
  const openDetailsModal = () => {
    setShowModal(true);
    fetchTransactionHistory();
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
        className={`bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm ${className}`}
      >
        <div className="flex items-center">
          <AlertTriangle
            size={20}
            className="text-red-500 mr-2 flex-shrink-0"
          />
          <div>
            <p className="text-sm font-medium text-red-700">
              Balance update failed
            </p>
            <button
              onClick={fetchBalance}
              className="mt-1 text-xs text-red-600 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-full mr-3 shadow-sm">
              <Wallet className="text-white" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">
                Wallet Balance
              </h3>
              <div className="flex items-center mt-1">
                {loading ? (
                  <div className="h-6 w-20 bg-blue-100/70 animate-pulse rounded"></div>
                ) : (
                  <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    {formatEth(balance)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={openDetailsModal}
              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading}
            >
              Details
            </button>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className={`p-2 rounded-full text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Refresh balance"
              aria-label="Refresh wallet balance"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 ml-1">
          Available for dataset purchases and transactions
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Wallet Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg mb-5">
                <h4 className="text-sm font-medium text-gray-600 mb-1">
                  Current Balance
                </h4>
                <div className="flex items-center">
                  <DollarSign className="text-blue-600 h-5 w-5 mr-1" />
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    {formatEth(balance)}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Clock size={16} className="mr-1.5 text-gray-500" />
                Recent Transactions
              </h4>

              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-blue-100 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-blue-50 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactionHistory.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {transactionHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div
                        className={`p-2 rounded-full mr-3 ${
                          tx.type === "purchase"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {tx.type === "purchase" ? (
                          <TrendingUp size={16} />
                        ) : (
                          <DollarSign size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {tx.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.date.toLocaleDateString()} ·{" "}
                          {tx.type === "purchase" ? "-" : "+"}
                          {formatEth(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent transactions found
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 text-right">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors mr-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
              <button
                onClick={fetchBalance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

WalletBalanceDisplay.propTypes = {
  className: PropTypes.string,
  refreshTrigger: PropTypes.any, // Can be any type, used to trigger refresh
};

export default WalletBalanceDisplay;
