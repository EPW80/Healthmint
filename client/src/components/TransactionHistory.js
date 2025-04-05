// src/components/TransactionHistory.js
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  ExternalLink,
  Download,
  Filter,
  Calendar,
  DollarSign,
} from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";
import ErrorDisplay from "./ui/ErrorDisplay.js";
import mockPaymentService from "../services/mockPaymentService.js"; // Import mock payment service
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * TransactionHistory Component
 *
 * Displays the user's transaction history for data uploads, purchases, and other blockchain
 * interactions with HIPAA-compliant logging using the mock payment service
 */
const TransactionHistory = ({
  limit = 10,
  showFilters = true,
  compact = false,
  className = "",
}) => {
  // Get user information and wallet state from Redux
  const userRole = useSelector((state) => state.role.role);
  const walletAddress = useSelector((state) => state.wallet.address);

  // Local state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    dateRange: "all",
    status: "all",
  });

  // Format ETH value with appropriate precision
  const formatEth = (value) => {
    if (!value) return "0 ETH";
    const num = parseFloat(value);
    if (num === 0) return "0 ETH";
    return num < 0.001
      ? "< 0.001 ETH"
      : `${num.toFixed(num < 0.1 ? 4 : 3)} ETH`;
  };

  // Format date in a user-friendly way
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get status badge styling based on transaction status
  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";

    switch (status) {
      case "success":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Get transaction icon based on type
  const getTransactionIcon = (txType) => {
    switch (txType) {
      case "upload":
        return <ArrowUpRight className="text-blue-500" size={18} />;
      case "purchase":
        return <ArrowDownLeft className="text-green-500" size={18} />;
      case "payment":
        return <DollarSign className="text-green-500" size={18} />;
      case "share":
        return <ExternalLink className="text-purple-500" size={18} />;
      default:
        return <Clock className="text-gray-500" size={18} />;
    }
  };

  // Initialize mock payment service on component mount
  useEffect(() => {
    const initMockService = async () => {
      if (!mockPaymentService.isInitialized) {
        try {
          await mockPaymentService.initializeProvider();
          console.log("Mock payment service initialized for transaction history");
        } catch (err) {
          console.error("Failed to initialize mock payment service:", err);
          setError("Failed to initialize payment service");
        }
      }
    };
    
    initMockService();
  }, []);

  // Fetch transaction history with HIPAA compliance
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Log the transaction history access for HIPAA compliance
      await hipaaComplianceService.createAuditLog(
        "TRANSACTION_HISTORY_ACCESS",
        {
          action: "VIEW",
          userRole,
          walletAddress,
          timestamp: new Date().toISOString(),
          filters: JSON.stringify(filters),
        }
      );

      // Make sure mock service is initialized
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      // Fetch transaction history from mock payment service
      const mockTransactions = await mockPaymentService.getPaymentHistory();

      // Transform mock transactions to match our component's expected format
      const transformedHistory = mockTransactions.map(tx => ({
        id: tx.paymentId,
        hash: tx.transactionHash,
        type: "purchase", // Set all mock transactions as purchases for now
        status: "success", // All mock transactions are successful
        amount: tx.amount,
        timestamp: tx.timestamp,
        description: `Dataset Purchase: ${tx.datasetId}`,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed,
        dataRef: tx.datasetId
      }));

      // Apply filters if needed
      let filteredHistory = [...transformedHistory];

      if (filters.type !== "all" && filters.type !== "purchase") {
        // Filter by type
        filteredHistory = [];
      }

      if (filters.status !== "all" && filters.status !== "success") {
        // Filter by status
        filteredHistory = [];
      }

      if (filters.dateRange !== "all") {
        const now = new Date();
        const cutoff = new Date();

        switch (filters.dateRange) {
          case "today":
            cutoff.setHours(0, 0, 0, 0);
            break;
          case "week":
            cutoff.setDate(now.getDate() - 7);
            break;
          case "month":
            cutoff.setMonth(now.getMonth() - 1);
            break;
          default:
            break;
        }

        filteredHistory = filteredHistory.filter(
          (tx) => new Date(tx.timestamp) >= cutoff
        );
      }

      // Sort by timestamp (newest first)
      filteredHistory.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Apply limit
      if (limit > 0) {
        filteredHistory = filteredHistory.slice(0, limit);
      }

      setTransactions(filteredHistory);
    } catch (err) {
      console.error("Error fetching transaction history:", err);
      setError(err.message || "Failed to load transaction history");

      // Log the error for HIPAA compliance
      await hipaaComplianceService.createAuditLog("TRANSACTION_HISTORY_ERROR", {
        action: "VIEW_ERROR",
        userRole,
        walletAddress,
        timestamp: new Date().toISOString(),
        errorMessage:
          err.message || "Unknown error during transaction history load",
      });
    } finally {
      setLoading(false);
    }
  }, [userRole, walletAddress, filters, limit]);

  // Toggle transaction details
  const toggleTransactionDetails = (txId) => {
    setExpandedTransaction(expandedTransaction === txId ? null : txId);
  };

  // Update filters and refetch
  const updateFilter = (filterKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      type: "all",
      dateRange: "all",
      status: "all",
    });
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Export transaction history as CSV
  const exportHistory = async () => {
    try {
      // Log the export for HIPAA compliance
      await hipaaComplianceService.createAuditLog(
        "TRANSACTION_HISTORY_EXPORT",
        {
          action: "EXPORT",
          userRole,
          walletAddress,
          timestamp: new Date().toISOString(),
          format: "CSV",
          recordCount: transactions.length,
        }
      );

      // Create CSV content
      const headers = [
        "Transaction ID",
        "Type",
        "Status",
        "Amount",
        "Date",
        "Description",
        "Block Number",
        "Gas Used"
      ];
      const csvRows = [headers];

      transactions.forEach((tx) => {
        csvRows.push([
          tx.id,
          tx.type,
          tx.status,
          tx.amount,
          new Date(tx.timestamp).toISOString(),
          tx.description || "",
          tx.blockNumber || "",
          tx.gasUsed || ""
        ]);
      });

      const csvContent = csvRows.map((row) => row.join(",")).join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.setAttribute(
        "download",
        `transaction-history-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting transaction history:", err);
      setError("Failed to export transaction history");
    }
  };

  // Render the filters section
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="mb-4">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm mb-3"
        >
          <Filter size={16} />
          <span>Filters</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>

        {filtersOpen && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="tx-type-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Transaction Type
                </label>
                <select
                  id="tx-type-filter"
                  value={filters.type}
                  onChange={(e) => updateFilter("type", e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="purchase">Purchases</option>
                  <option value="upload">Uploads</option>
                  <option value="share">Sharing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="date-range-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date Range
                </label>
                <select
                  id="date-range-filter"
                  value={filters.dateRange}
                  onChange={(e) => updateFilter("dateRange", e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="status-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filters.status}
                  onChange={(e) => updateFilter("status", e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset Filters
              </button>
              <button
                onClick={exportHistory}
                className="ml-3 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center gap-1"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render a compact list view
  const renderCompactView = () => (
    <div className="divide-y divide-gray-200">
      {transactions.map((tx) => (
        <div key={tx.id} className="py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3">{getTransactionIcon(tx.type)}</div>
            <div>
              <p className="font-medium text-sm">
                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}:{" "}
                {tx.description || `Transaction ${tx.id.substring(0, 8)}`}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(tx.timestamp)}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <span className={getStatusBadge(tx.status)}>
              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
            </span>
            <span className="ml-3 font-medium">{formatEth(tx.amount)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Render a detailed table view
  const renderDetailedView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Transaction
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Type
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Amount
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => (
            <React.Fragment key={tx.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {tx.description ||
                          `Transaction ${tx.id.substring(0, 8)}...`}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {tx.id.substring(0, 8)}...
                        {tx.id.substring(tx.id.length - 4)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">
                    {tx.type}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(tx.timestamp)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatEth(tx.amount)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(tx.status)}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => toggleTransactionDetails(tx.id)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  >
                    <span className="sr-only">
                      {expandedTransaction === tx.id
                        ? "Hide details"
                        : "View details"}
                    </span>
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
              {expandedTransaction === tx.id && (
                <tr className="bg-gray-50">
                  <td colSpan="6" className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">
                            Transaction Details
                          </h4>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Transaction ID:</span>{" "}
                            {tx.id}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Block Number:</span>{" "}
                            {tx.blockNumber || "Pending"}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Gas Used:</span>{" "}
                            {tx.gasUsed || "N/A"}
                          </p>
                          {tx.hash && (
                            <p className="text-xs text-gray-500 mb-1">
                              <span className="font-medium">
                                Transaction Hash:
                              </span>{" "}
                              <a
                                href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {tx.hash.substring(0, 16)}...
                                <ExternalLink
                                  size={12}
                                  className="inline ml-1"
                                />
                              </a>
                            </p>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">
                            Additional Information
                          </h4>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Dataset ID:</span>{" "}
                            {tx.dataRef || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Timestamp:</span>{" "}
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Payment Amount:</span>{" "}
                            {formatEth(tx.amount)}
                          </p>
                          {tx.error && (
                            <p className="text-xs text-red-500 mb-1">
                              <span className="font-medium">Error:</span>{" "}
                              {tx.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Display current wallet balance
  const [currentBalance, setCurrentBalance] = useState(null);
  
  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (mockPaymentService.isInitialized) {
          const balance = await mockPaymentService.getBalance();
          setCurrentBalance(balance);
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };
    
    fetchBalance();
    
    // Update balance periodically
    const intervalId = setInterval(fetchBalance, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // If loading, show spinner
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[200px] ${className}`}
      >
        <LoadingSpinner size="medium" label="Loading transaction history..." />
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className={className}>
        <ErrorDisplay
          error={error}
          onRetry={fetchTransactions}
          className="my-4"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Wallet Balance Display */}
      {currentBalance !== null && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
          <div className="flex items-center">
            <DollarSign className="text-blue-600 mr-2" size={18} />
            <div>
              <p className="text-sm text-blue-700">Current Estimated Earnings</p>
              <p className="text-lg font-semibold text-blue-800">{currentBalance} ETH</p>
            </div>
          </div>
          <div className="text-xs text-blue-600">
            Transactions: {transactions.length}
          </div>
        </div>
      )}

      {renderFilters()}
      
      {/* If no transactions, show empty state */}
      {transactions.length === 0 ? (
        <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No Transactions Found
          </h3>
          <p className="text-gray-500 mb-4">
            You don't have any transactions in your history yet.
          </p>
          {showFilters && filtersOpen && (
            <p className="text-sm text-gray-500">
              Try changing your filter settings to see more results.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          {compact ? renderCompactView() : renderDetailedView()}
        </div>
      )}
    </div>
  );
};

TransactionHistory.propTypes = {
  limit: PropTypes.number,
  showFilters: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default TransactionHistory;