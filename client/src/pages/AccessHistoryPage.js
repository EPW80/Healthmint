// client/src/pages/AccessHistoryPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import HashDisplay from "../components/ui/HashDisplay";
import {
  Clock,
  Search,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  FileText,
  Share2,
  Activity,
  Shield,
  User,
  Database,
} from "lucide-react";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import WalletStatus from "../components/WalletStatus";
import { addNotification } from "../redux/slices/notificationSlice";
import hipaaComplianceService from "../services/hipaaComplianceService";
import accessHistoryService from "../services/accessHistoryService";

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

const AccessHistoryPage = () => {
  // Get the user's ID from Redux
  const userId = useSelector((state) => state.wallet.address);
  const dispatch = useDispatch();

  // State
  const [accessHistory, setAccessHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    recordId: "all",
    actionType: "all",
    accessorType: "all",
    timeframe: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [selectedAccessEvent, setSelectedAccessEvent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load access history
  const loadAccessHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Log audit event for compliance
      await hipaaComplianceService.createAuditLog("ACCESS_HISTORY_VIEW", {
        timestamp: new Date().toISOString(),
        userId,
        action: "VIEW",
      });

      const result = await accessHistoryService.getAccessHistory(userId);

      if (result.success) {
        setAccessHistory(result.data);
      } else {
        throw new Error(result.message || "Failed to load access history");
      }
    } catch (err) {
      console.error("Access history load error:", err);
      setError(err.message || "Failed to load access history");

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load access history",
          duration: 5000,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [userId, dispatch]);

  // Load access history on component mount
  useEffect(() => {
    loadAccessHistory();
  }, [loadAccessHistory]);

  // Filter access history
  const filteredHistory = useCallback(() => {
    if (!accessHistory.length) return [];

    return accessHistory.filter((event) => {
      // Apply record filter
      if (filters.recordId !== "all" && event.recordId !== filters.recordId) {
        return false;
      }

      // Apply action type filter
      if (
        filters.actionType !== "all" &&
        event.actionType !== filters.actionType
      ) {
        return false;
      }

      // Apply accessor type filter
      if (
        filters.accessorType !== "all" &&
        event.accessorType !== filters.accessorType
      ) {
        return false;
      }

      // Apply timeframe filter
      if (filters.timeframe !== "all") {
        const eventDate = new Date(event.timestamp);
        const now = new Date();

        if (filters.timeframe === "custom") {
          // Custom date range
          const startDate = customDateRange.start
            ? new Date(customDateRange.start)
            : null;
          const endDate = customDateRange.end
            ? new Date(customDateRange.end)
            : null;

          if (startDate && eventDate < startDate) return false;
          if (endDate) {
            // Set end date to end of day
            endDate.setHours(23, 59, 59, 999);
            if (eventDate > endDate) return false;
          }
        } else {
          // Predefined timeframes
          const daysDiff = (now - eventDate) / (1000 * 60 * 60 * 24);

          if (filters.timeframe === "today" && daysDiff >= 1) return false;
          if (filters.timeframe === "week" && daysDiff > 7) return false;
          if (filters.timeframe === "month" && daysDiff > 30) return false;
          if (filters.timeframe === "year" && daysDiff > 365) return false;
        }
      }

      // Apply search filter - search in description, accessor name, etc.
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const descriptionMatch = event.description
          ?.toLowerCase()
          .includes(searchLower);
        const accessorMatch = event.accessorName
          ?.toLowerCase()
          .includes(searchLower);
        const purposeMatch = event.purpose?.toLowerCase().includes(searchLower);
        const recordNameMatch = event.recordName
          ?.toLowerCase()
          .includes(searchLower);

        return (
          descriptionMatch || accessorMatch || purposeMatch || recordNameMatch
        );
      }

      return true;
    });
  }, [accessHistory, filters, searchTerm, customDateRange]);

  // Update filter
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update custom date range
  const updateDateRange = (key, value) => {
    setCustomDateRange((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Automatically set timeframe to custom when dates are selected
    if (filters.timeframe !== "custom") {
      updateFilter("timeframe", "custom");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      recordId: "all",
      actionType: "all",
      accessorType: "all",
      timeframe: "all",
    });
    setSearchTerm("");
    setCustomDateRange({
      start: "",
      end: "",
    });
  };

  // Handle view details
  const handleViewDetails = (event) => {
    setSelectedAccessEvent(event);
    setDetailsOpen(true);

    // Log audit event for compliance
    hipaaComplianceService.createAuditLog("ACCESS_DETAIL_VIEW", {
      timestamp: new Date().toISOString(),
      userId,
      accessEventId: event.id,
      action: "VIEW_DETAIL",
    });
  };

  // Get action type icon
  const getActionTypeIcon = (actionType) => {
    switch (actionType) {
      case "VIEW":
        return <Eye size={18} className="text-info" />;
      case "DOWNLOAD":
        return <Download size={18} className="text-success" />;
      case "SHARE":
        return <Share2 size={18} className="text-accent" />;
      case "UPLOAD":
        return <FileText size={18} className="text-accent" />;
      case "PURCHASE":
        return <Database size={18} className="text-success" />;
      case "ANALYSIS":
        return <Activity size={18} className="text-warning" />;
      default:
        return <Eye size={18} className="text-fg-subtle" />;
    }
  };

  // Get accessor type icon
  const getAccessorTypeIcon = (accessorType) => {
    switch (accessorType) {
      case "RESEARCHER":
        return <User size={18} className="text-accent" />;
      case "INSTITUTION":
        return <Database size={18} className="text-info" />;
      case "SYSTEM":
        return <Shield size={18} className="text-fg-subtle" />;
      case "SELF":
        return <User size={18} className="text-success" />;
      default:
        return <User size={18} className="text-fg-subtle" />;
    }
  };

  // Compile record options from access history
  const recordOptions = [
    { id: "all", name: "All Records" },
    ...Array.from(new Set(accessHistory.map((event) => event.recordId))).map(
      (recordId) => {
        const record = accessHistory.find(
          (event) => event.recordId === recordId
        );
        return {
          id: recordId,
          name: record?.recordName || `Record ${recordId.substring(0, 8)}`,
        };
      }
    ),
  ];

  // Action type options
  const actionTypeOptions = [
    { id: "all", name: "All Actions" },
    { id: "VIEW", name: "View" },
    { id: "DOWNLOAD", name: "Download" },
    { id: "SHARE", name: "Share" },
    { id: "UPLOAD", name: "Upload" },
    { id: "PURCHASE", name: "Purchase" },
    { id: "ANALYSIS", name: "Analysis" },
  ];

  // Accessor type options
  const accessorTypeOptions = [
    { id: "all", name: "All Accessors" },
    { id: "RESEARCHER", name: "Researcher" },
    { id: "INSTITUTION", name: "Institution" },
    { id: "SYSTEM", name: "System" },
    { id: "SELF", name: "Self" },
  ];

  // Computed filtered history
  const filtered = filteredHistory();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg mb-2">Access History</h1>
          <p className="text-fg-muted">
            Track who has accessed your health data and when
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <WalletStatus minimal showBalance={false} showNetwork={false} />
        </div>
      </div>

      {/* HIPAA Compliance Banner */}
      <div className="bg-info-soft border border-info/30 rounded-token p-4 mb-6 flex items-start gap-3">
        <Shield className="text-info flex-shrink-0 mt-1" size={24} />
        <div>
          <h3 className="font-medium text-info">HIPAA Compliance</h3>
          <p className="text-sm text-info/80">
            In accordance with HIPAA regulations, we maintain detailed logs of
            all access to your health data. This ensures transparency and
            accountability in how your health information is used.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-line rounded-token shadow-soft-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-fg-subtle" />
              </div>
              <input
                type="text"
                placeholder="Search access events..."
                className="pl-10 pr-4 py-2 border border-line-strong rounded-token bg-surface text-fg w-full md:w-64 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <FileText size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.recordId}
                onChange={(e) => updateFilter("recordId", e.target.value)}
              >
                {recordOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <Eye size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.actionType}
                onChange={(e) => updateFilter("actionType", e.target.value)}
              >
                {actionTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
              <User size={16} className="text-fg-subtle mr-1 ml-2" />
              <select
                className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                value={filters.accessorType}
                onChange={(e) => updateFilter("accessorType", e.target.value)}
              >
                {accessorTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="flex items-center bg-surface-raised border border-line rounded-token p-1">
                <Calendar size={16} className="text-fg-subtle mr-1 ml-2" />
                <select
                  className="bg-transparent border-none text-fg text-sm font-medium focus:outline-none py-1 pr-2"
                  value={filters.timeframe}
                  onChange={(e) => {
                    updateFilter("timeframe", e.target.value);
                    if (e.target.value === "custom") {
                      setTimeframeOpen(true);
                    } else {
                      setTimeframeOpen(false);
                    }
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {timeframeOpen && (
                <div className="absolute mt-2 p-3 bg-surface-raised border border-line rounded-token shadow-soft-md z-10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-fg-muted mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full text-sm border border-line-strong rounded-token bg-surface text-fg px-2 py-1"
                        value={customDateRange.start}
                        onChange={(e) =>
                          updateDateRange("start", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-fg-muted mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="w-full text-sm border border-line-strong rounded-token bg-surface text-fg px-2 py-1"
                        value={customDateRange.end}
                        onChange={(e) => updateDateRange("end", e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="mt-2 w-full text-sm bg-accent hover:bg-accent-hover text-accent-fg py-1 rounded-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    onClick={() => setTimeframeOpen(false)}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="text-sm text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Access History Table */}
      <div className="bg-surface border border-line rounded-token shadow-soft-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner size="large" />
            <span className="ml-3 text-fg-muted">
              Loading access history...
            </span>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle size={48} className="text-danger mx-auto mb-4" />
            <h3 className="text-lg font-medium text-fg mb-2">
              Failed to load access history
            </h3>
            <p className="text-fg-muted">{error}</p>
            <button
              onClick={loadAccessHistory}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={48} className="text-fg-subtle mx-auto mb-4" />
            <h3 className="text-lg font-medium text-fg mb-2">
              No access events found
            </h3>
            <p className="text-fg-muted">
              {searchTerm ||
              filters.recordId !== "all" ||
              filters.actionType !== "all" ||
              filters.accessorType !== "all" ||
              filters.timeframe !== "all"
                ? "Try adjusting your search or filters"
                : "There have been no accesses to your health data"}
            </p>
            {(searchTerm ||
              filters.recordId !== "all" ||
              filters.actionType !== "all" ||
              filters.accessorType !== "all" ||
              filters.timeframe !== "all") && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 border border-line-strong text-fg rounded-token hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-raised">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Accessor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Health Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-line">
                {filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-surface-raised">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface-raised flex items-center justify-center">
                          {getAccessorTypeIcon(event.accessorType)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-fg">
                            {event.accessorName || "Unknown"}
                          </div>
                          <div className="text-xs text-fg-subtle capitalize">
                            {event.accessorType?.toLowerCase() || "Unknown"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionTypeIcon(event.actionType)}
                        <span className="ml-2 text-sm text-fg capitalize">
                          {event.actionType?.toLowerCase() || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-fg line-clamp-1">
                        {event.recordName || (
                          <HashDisplay value={event.recordId} startChars={8} endChars={4} />
                        )}
                      </div>
                      {event.recordCategory && (
                        <div className="text-xs text-fg-subtle">
                          {event.recordCategory}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-fg">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {formatRelativeTime(new Date(event.timestamp))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-fg line-clamp-2">
                        {event.purpose || event.description || "Not specified"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(event)}
                        className="text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Access Details Modal */}
      {detailsOpen && selectedAccessEvent && (
        <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-raised border border-line rounded-token-lg shadow-soft-lg max-w-xl w-full">
            <div className="p-6 border-b border-line">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-fg">
                  Access Details
                </h3>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-info-soft flex items-center justify-center mr-3">
                    {getActionTypeIcon(selectedAccessEvent.actionType)}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-fg capitalize">
                      {selectedAccessEvent.actionType?.toLowerCase() ||
                        "Unknown"}{" "}
                      Action
                    </h4>
                    <p className="text-sm text-fg-muted">
                      {new Date(selectedAccessEvent.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-info-soft border border-info/30 p-4 rounded-token mb-4">
                  <div className="flex items-center">
                    <Shield className="text-info mr-2" size={18} />
                    <span className="text-info font-medium">
                      HIPAA Compliant Access Log
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-info/80">
                    This access has been logged in accordance with HIPAA
                    regulations. The details of this access are immutable and
                    securely stored.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-fg-muted mb-1">
                    Who Accessed
                  </h5>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface flex items-center justify-center">
                      {getAccessorTypeIcon(selectedAccessEvent.accessorType)}
                    </div>
                    <div className="ml-3">
                      <p className="text-fg font-medium">
                        {selectedAccessEvent.accessorName || "Unknown"}
                      </p>
                      <p className="text-sm text-fg-muted capitalize">
                        {selectedAccessEvent.accessorType?.toLowerCase() ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-fg-muted mb-1">
                    Health Record
                  </h5>
                  <p className="text-fg">
                    {selectedAccessEvent.recordName || (
                      <HashDisplay value={selectedAccessEvent.recordId} startChars={8} endChars={4} />
                    )}
                  </p>
                  {selectedAccessEvent.recordCategory && (
                    <p className="text-sm text-fg-muted">
                      Category: {selectedAccessEvent.recordCategory}
                    </p>
                  )}
                </div>

                <div>
                  <h5 className="text-sm font-medium text-fg-muted mb-1">
                    Purpose
                  </h5>
                  <p className="text-fg">
                    {selectedAccessEvent.purpose || "Not specified"}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-fg-muted mb-1">
                    Description
                  </h5>
                  <p className="text-fg">
                    {selectedAccessEvent.description ||
                      "No additional details available"}
                  </p>
                </div>

                {selectedAccessEvent.ipAddress && (
                  <div>
                    <h5 className="text-sm font-medium text-fg-muted mb-1">
                      IP Address
                    </h5>
                    <p className="text-fg font-mono text-sm">
                      {selectedAccessEvent.ipAddress}
                    </p>
                  </div>
                )}

                {selectedAccessEvent.authorized !== undefined && (
                  <div>
                    <h5 className="text-sm font-medium text-fg-muted mb-1">
                      Authorization
                    </h5>
                    <div className="flex items-center">
                      {selectedAccessEvent.authorized ? (
                        <>
                          <CheckCircle
                            size={16}
                            className="text-success mr-2"
                          />
                          <span className="text-success">
                            Authorized Access
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle
                            size={16}
                            className="text-danger mr-2"
                          />
                          <span className="text-danger">
                            Unauthorized Access
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedAccessEvent.consentReference && (
                  <div>
                    <h5 className="text-sm font-medium text-fg-muted mb-1">
                      Consent Reference
                    </h5>
                    <p className="text-fg">
                      {selectedAccessEvent.consentReference}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-surface-raised px-6 py-4 border-t border-line flex justify-end">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 border border-line-strong rounded-token text-fg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Close
              </button>
              {selectedAccessEvent.accessorType !== "SELF" &&
                selectedAccessEvent.accessorType !== "SYSTEM" && (
                  <button
                    className="ml-3 px-4 py-2 bg-danger-soft border border-danger/30 rounded-token text-danger hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    onClick={() => {
                      dispatch(
                        addNotification({
                          type: "info",
                          message:
                            "Access dispute functionality would be implemented here",
                          duration: 3000,
                        })
                      );
                    }}
                  >
                    Dispute This Access
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessHistoryPage;
