// client/src/pages/TransactionPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Clock,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Database,
  FileText,
  Calendar,
} from "lucide-react";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import HashDisplay from "../components/ui/HashDisplay";
import WalletStatus from "../components/WalletStatus";
import { addNotification } from "../redux/slices/notificationSlice";

// Import a transaction service for each role
import researcherTransactionService from "../services/researcherTransactionService";
import patientTransactionService from "../services/patientTransactionService";

const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30)
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12)
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`;
};

const TransactionsPage = () => {
  // Get the user's role from Redux
  const userRole = useSelector((state) => state.role.role);
  const walletAddress = useSelector((state) => state.wallet.address);
  const dispatch = useDispatch();

  // State
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    timeframe: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Load transactions based on role
  const loadTransactions = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Use different service based on role
      const service =
        userRole === "researcher"
          ? researcherTransactionService
          : patientTransactionService;

      const result = await service.getTransactions(walletAddress);

      if (result.success) {
        setTransactions(result.data);
      } else {
        throw new Error(result.message || "Failed to load transactions");
      }
    } catch (err) {
      console.error("Transaction load error:", err);
      setError(err.message || "Failed to load transactions");

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load transaction history",
          duration: 5000,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [walletAddress, userRole, dispatch]);

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Format transaction timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";

    try {
      const date = new Date(timestamp);
      return `${date.toLocaleDateString()} (${formatRelativeTime(date)})`;
    } catch (err) {
      return "Invalid date";
    }
  };

  // Get transaction status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={18} className="text-success" />;
      case "pending":
        return <Clock size={18} className="text-warning" />;
      case "failed":
        return <AlertCircle size={18} className="text-danger" />;
      default:
        return <Clock size={18} className="text-fg-subtle" />;
    }
  };

  // Get transaction type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "purchase":
        return <Download size={18} className="text-info" />;
      case "share":
        return <Upload size={18} className="text-accent" />;
      case "consent":
        return <CheckCircle size={18} className="text-success" />;
      case "upload":
        return <Upload size={18} className="text-accent" />;
      default:
        return <FileText size={18} className="text-fg-subtle" />;
    }
  };

  // Format the transaction amount
  const formatAmount = (amount, currency = "ETH") => {
    if (!amount) return "N/A";

    // Convert from Wei to ETH if needed
    const amountInEth = parseFloat(amount) / 1e18;

    if (amountInEth === 0) return "Free";
    if (amountInEth < 0.001) return "< 0.001 " + currency;

    return amountInEth.toFixed(4) + " " + currency;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Apply status filter
    if (filters.status !== "all" && tx.status !== filters.status) {
      return false;
    }

    // Apply type filter
    if (filters.type !== "all" && tx.type !== filters.type) {
      return false;
    }

    // Apply timeframe filter
    if (filters.timeframe !== "all") {
      const now = new Date();
      const txDate = new Date(tx.timestamp);
      const daysDiff = (now - txDate) / (1000 * 60 * 60 * 24);

      if (filters.timeframe === "week" && daysDiff > 7) return false;
      if (filters.timeframe === "month" && daysDiff > 30) return false;
      if (filters.timeframe === "year" && daysDiff > 365) return false;
    }

    // Apply search filter - search in description and data name/id
    if (searchTerm && searchTerm.length > 0) {
      const searchLower = searchTerm.toLowerCase();
      const descriptionMatch = tx.description
        ?.toLowerCase()
        .includes(searchLower);
      const dataIdMatch = tx.dataId?.toLowerCase().includes(searchLower);
      const dataNameMatch = tx.dataName?.toLowerCase().includes(searchLower);

      return descriptionMatch || dataIdMatch || dataNameMatch;
    }

    return true;
  });

  // Render researcher-specific transaction details
  const renderResearcherTransactionDetails = (tx) => {
    return (
      <div className="mt-2">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-fg-muted">Data Type:</span>
            <p className="font-medium">{tx.dataType || "Unknown"}</p>
          </div>
          <div>
            <span className="text-fg-muted">File Size:</span>
            <p className="font-medium">{tx.fileSize || "Unknown"}</p>
          </div>
          <div>
            <span className="text-fg-muted">Records:</span>
            <p className="font-medium">{tx.recordCount || "N/A"}</p>
          </div>
        </div>

        {tx.dataAvailable && (
          <div className="mt-2">
            <button
              className="text-sm bg-info-soft hover:bg-info/20 text-info px-3 py-1 rounded-token flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => window.open(tx.downloadUrl || "#", "_blank")}
            >
              <Database size={14} className="mr-1" />
              View Dataset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render patient-specific transaction details
  const renderPatientTransactionDetails = (tx) => {
    return (
      <div className="mt-2">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-fg-muted">Shared With:</span>
            <p className="font-medium truncate">
              {tx.sharedWith || "Anonymous"}
            </p>
          </div>
          <div>
            <span className="text-fg-muted">Permission:</span>
            <p className="font-medium">{tx.permission || "Read-only"}</p>
          </div>
          <div>
            <span className="text-fg-muted">Expiration:</span>
            <p className="font-medium">
              {tx.expiration ? formatTimestamp(tx.expiration) : "Never"}
            </p>
          </div>
        </div>

        {tx.type === "share" && tx.canRevoke && (
          <div className="mt-2">
            <button
              className="text-sm bg-danger-soft hover:bg-danger/20 text-danger px-3 py-1 rounded-token flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => {
                // Placeholder for revoke functionality
                alert("Revoke access functionality would be implemented here");
              }}
            >
              <AlertCircle size={14} className="mr-1" />
              Revoke Access
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg mb-2">
            {userRole === "researcher"
              ? "Data Purchase History"
              : "Data Sharing Transactions"}
          </h1>
          <p className="text-fg-muted">
            {userRole === "researcher"
              ? "View your history of purchased health data records"
              : "Track who has access to your health data and manage sharing permissions"}
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <WalletStatus minimal showBalance showNetwork={false} />
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-surface border border-line rounded-token shadow-soft-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-fg-subtle" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                className="pl-10 pr-4 py-2 border border-line-strong rounded-token bg-surface text-fg w-full md:w-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <Filter size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <FileText size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="all">All Types</option>
                {userRole === "researcher" ? (
                  <option value="purchase">Purchases</option>
                ) : (
                  <>
                    <option value="share">Sharing</option>
                    <option value="consent">Consent</option>
                    <option value="upload">Uploads</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <Calendar size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.timeframe}
                onChange={(e) =>
                  setFilters({ ...filters, timeframe: e.target.value })
                }
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFilters({
                  status: "all",
                  type: "all",
                  timeframe: "all",
                });
                setSearchTerm("");
              }}
              className="text-sm text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-surface border border-line rounded-token shadow-soft-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner size="large" />
            <span className="ml-3 text-fg-muted">Loading transactions...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle size={48} className="text-danger mx-auto mb-4" />
            <h3 className="text-lg font-medium text-fg mb-2">
              Failed to load transactions
            </h3>
            <p className="text-fg-muted">{error}</p>
            <button
              onClick={loadTransactions}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={48} className="text-fg-subtle mx-auto mb-4" />
            <h3 className="text-lg font-medium text-fg mb-2">
              No transactions found
            </h3>
            <p className="text-fg-muted">
              {searchTerm
                ? "Try adjusting your search or filters"
                : userRole === "researcher"
                  ? "You haven't purchased any health data yet"
                  : "You haven't shared any health data yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <caption className="sr-only">Transaction records</caption>
              <thead className="bg-surface-raised">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    {userRole === "researcher" ? "Dataset" : "Data"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    {userRole === "researcher" ? "Cost" : "Reward"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-line">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-raised">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-surface-raised rounded-token">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <div className="font-medium text-fg">
                            {tx.type === "purchase"
                              ? "Data Purchase"
                              : tx.type === "share"
                                ? "Data Sharing"
                                : tx.type === "consent"
                                  ? "Consent Update"
                                  : tx.type === "upload"
                                    ? "Data Upload"
                                    : "Transaction"}
                          </div>
                          <div className="text-sm text-fg-muted">
                            {tx.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-fg">
                        {tx.dataName || tx.dataId || "Unknown"}
                      </div>
                      {userRole === "researcher"
                        ? renderResearcherTransactionDetails(tx)
                        : renderPatientTransactionDetails(tx)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-fg">
                        {formatTimestamp(tx.timestamp)}
                      </div>
                      <div className="text-xs text-fg-muted font-mono">
                        {tx.hash ? (
                          <HashDisplay value={tx.hash} startChars={8} endChars={4} />
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-fg">
                        {formatAmount(tx.amount)}
                      </div>
                      {tx.gasUsed && (
                        <div className="text-xs text-fg-muted">
                          Gas: {formatAmount(tx.gasUsed)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className="ml-2 text-sm text-fg capitalize">
                          {tx.status || "Unknown"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
