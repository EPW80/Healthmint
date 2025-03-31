// client/src/components/dashboard/Dashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import {
  FileText,
  Upload,
  Clock,
  Shield,
  AlertCircle,
  Check,
  Bell,
  Database,
  Download,
  Search,
  BarChart,
  Filter,
  Microscope,
  BookOpen,
  Info,
  CheckCircle,
  Share2,
  Eye,
  Lock,
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { selectRole } from "../../redux/slices/roleSlice.js";
import useHealthData from "../../hooks/useHealthData.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import useAsyncOperation from "../../hooks/useAsyncOperation.js";
import ErrorDisplay from "../ui/ErrorDisplay.js";
import LoadingSpinner from "../ui/LoadingSpinner.js";
import RoleSwitcher from "./RoleSwitcher.js";

/**
 * Unified Dashboard Component
 *
 * Combines both patient and researcher dashboard functionality into a single component
 * that renders the appropriate interface based on the user's role.
 */
const Dashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get state from Redux
  const userRole = useSelector(selectRole);
  const { loading: uiLoading, error: uiError } = useSelector(
    (state) => state.ui
  );
  const userProfile = useSelector((state) => state.user.profile || {});
  const userId = useSelector((state) => state.wallet.address);

  // Extract only needed properties from user profile to avoid unnecessary re-renders
  const {
    pendingRequests = 0,
    securityScore = 85,
    activeStudies = 0,
    appliedFilters = 0,
  } = useMemo(() => userProfile, [userProfile]);

  // Use health data hook for data management
  const {
    userRecords,
    healthData,
    getRecordDetails,
    downloadRecord,
    loading: healthDataLoading,
  } = useHealthData({
    userRole,
    loadOnMount: true,
  });

  // Use our async operation hook for async operations
  const {
    loading: asyncLoading,
    execute: executeAsync,
    clearError: clearAsyncError,
  } = useAsyncOperation({
    componentId: "Dashboard",
    userId,
    onError: (error) => {
      dispatch(
        addNotification({
          type: "error",
          message: error.message || "Dashboard operation failed",
        })
      );
    },
  });

  // Memoize records length to prevent unnecessary re-renders
  const totalRecords = useMemo(() => userRecords.length, [userRecords]);

  // Memoize shared records count
  const sharedRecords = useMemo(
    () => userRecords.filter((record) => record.shared).length || 0,
    [userRecords]
  );

  // Local state with safe default values - separate by logical groups
  const [dashboardData, setDashboardData] = useState({
    // Common data
    recentActivity: [],
    // Patient specific
    securityScore: 85,
    // Researcher specific
    availableDatasets: [],
  });

  const [downloadLoading, setDownloadLoading] = useState(false);

  // State for viewing records (patient dashboard)
  const [viewingRecord, setViewingRecord] = useState(null);

  // State for dataset preview (researcher dashboard)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [datasetDetails, setDatasetDetails] = useState(null);

  // Combine loading states
  const isLoading = uiLoading || healthDataLoading || asyncLoading;

  // ADD LOADING TIMEOUT FIX
  useEffect(() => {
    if (isLoading && !uiError) {
      console.log("Still loading on Dashboard page...");
      // Force exit loading state after 5 seconds for testing
      const timer = setTimeout(() => {
        console.log("Forcing loading state to false after timeout");
        dispatch(setLoading(false));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, uiError, dispatch]);

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    console.log("Starting fetchDashboardData");
    try {
      console.log("Setting loading state to true");
      dispatch(setLoading(true));
      dispatch(setError(null));

      console.log("About to call hipaaComplianceService.createAuditLog");
      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("DASHBOARD_ACCESS", {
        action: "VIEW",
        userRole,
        userId,
        timestamp: new Date().toISOString(),
      });
      console.log("Audit log created successfully");

      console.log("Setting dashboard data");
      // Set appropriate dashboard data based on role
      setDashboardData((prevData) => ({
        ...prevData,
        securityScore: userProfile.securityScore || 85,
        recentActivity: [],
        availableDatasets: userRole === "researcher" ? healthData || [] : [],
      }));
      console.log("Dashboard data set successfully");

      console.log("Setting loading state to false");
      dispatch(setLoading(false));
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      dispatch(setError(err?.message || "Failed to load dashboard data"));

      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load dashboard data. Please try again.",
        })
      );

      console.log("Setting loading state to false after error");
      dispatch(setLoading(false));
    }
  }, [userRole, userId, dispatch, healthData, userProfile.securityScore]);

  // Fetch dashboard data when component mounts or when dependencies change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers - memoized to prevent unnecessary recreations
  const handleNavigateTo = useCallback(
    (path) => {
      if (onNavigate) {
        onNavigate(path);
      } else {
        navigate(path);
      }
    },
    [navigate, onNavigate]
  );

  // Handle record viewing (Patient dashboard)
  const handleViewRecord = useCallback(
    async (recordId) => {
      executeAsync(async () => {
        // Log access for HIPAA compliance
        await hipaaComplianceService.createAuditLog("RECORD_VIEW", {
          action: "VIEW",
          recordId,
          timestamp: new Date().toISOString(),
          userId,
        });

        // Get record details
        await getRecordDetails(recordId);

        // Set the viewing record
        setViewingRecord(recordId);
      });
    },
    [executeAsync, getRecordDetails, userId]
  );

  // Handle record download (Patient dashboard)
  const handleDownloadRecord = useCallback(
    async (recordId) => {
      setDownloadLoading(true);
      executeAsync(async () => {
        try {
          await downloadRecord(recordId);
  
          // Log download for HIPAA compliance
          await hipaaComplianceService.createAuditLog("RECORD_DOWNLOAD", {
            action: "DOWNLOAD",
            recordId,
            timestamp: new Date().toISOString(),
            userId
          });
        } finally {
          setDownloadLoading(false);
        }
      });
    },
    [executeAsync, downloadRecord, userId]
  );

  // Handle share record (Patient dashboard)
  const handleShareRecord = useCallback(
    async (recordId) => {
      executeAsync(async () => {
        // Log the share attempt for HIPAA compliance
        await hipaaComplianceService.createAuditLog("RECORD_SHARE_ATTEMPT", {
          action: "SHARE",
          recordId,
          timestamp: new Date().toISOString(),
          userId,
        });

        // Verify consent before sharing
        const hasConsent = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING
        );

        if (!hasConsent) {
          throw new Error("User consent required for sharing");
        }

        // Here would be the actual sharing logic
        dispatch(
          addNotification({
            type: "success",
            message: "Sharing functionality would be implemented here",
          })
        );
      });
    },
    [executeAsync, dispatch, userId]
  );

  // Close the record viewer (Patient dashboard)
  const closeViewer = useCallback(() => {
    setViewingRecord(null);
  }, []);

  // View dataset details (Researcher dashboard)
  const handleViewDataset = useCallback(
    async (datasetId) => {
      executeAsync(async () => {
        setDetailsLoading(true);
        setSelectedDataset(datasetId);
        setPreviewOpen(true);

        // Log access for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          datasetId,
          "Viewing dataset details for research evaluation",
          "VIEW",
          {
            userId,
            userRole,
          }
        );

        // Get dataset details
        const details = await getRecordDetails(datasetId);
        setDatasetDetails(details);
        setDetailsLoading(false);
      });
    },
    [executeAsync, getRecordDetails, userId, userRole]
  );

  // Handle dataset purchase (Researcher dashboard)
  const handlePurchaseDataset = useCallback(
    async (id) => {
      executeAsync(async () => {
        // Log action for HIPAA compliance
        await hipaaComplianceService.logDataAccess(
          id,
          "Purchasing dataset for research",
          "PURCHASE",
          {
            userId,
            userRole,
          }
        );

        dispatch(
          addNotification({
            type: "success",
            message: "Dataset purchased successfully!",
          })
        );

        // Here would be the actual purchase functionality
      });
    },
    [executeAsync, dispatch, userId, userRole]
  );

  // Close the preview modal (Researcher dashboard)
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // Activity status & icon helpers for activity display
  const getActivityIcon = (type) => {
    switch (type) {
      case "upload":
        return <Upload className="w-5 h-5 text-blue-500" />;
      case "access":
        return <Check className="w-5 h-5 text-green-500" />;
      case "request":
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case "download":
        return <Download className="w-5 h-5 text-purple-500" />;
      case "access_request":
        return <Search className="w-5 h-5 text-blue-500" />;
      case "data_download":
        return <Download className="w-5 h-5 text-green-500" />;
      case "study_update":
        return <Microscope className="w-5 h-5 text-purple-500" />;
      case "publication":
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading state
  if (isLoading && !uiError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner
            size="large"
            label={`Loading ${userRole === "patient" ? "patient" : "researcher"} dashboard...`}
            showLabel={true}
          />
          <p className="text-gray-500 mt-4">
            Please wait while we retrieve your information
          </p>
        </div>
      </div>
    );
  }

  // Error state - using our standardized error component
  if (uiError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <ErrorDisplay
          error={uiError}
          onRetry={fetchDashboardData}
          size="large"
          className="max-w-lg w-full"
        />
      </div>
    );
  }

  // PATIENT DASHBOARD RENDER
  if (userRole === "patient") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User welcome with Role Switcher */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {userProfile?.name || "Patient"}
            </h1>
            <p className="text-gray-600">
              Your patient dashboard for managing health data
            </p>
          </div>
          
          {/* Role Switcher Component */}
          <div className="mt-4 md:mt-0">
            <RoleSwitcher />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <FileText className="text-blue-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Total Records</p>
                <p className="text-2xl font-semibold">{totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Database className="text-green-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Shared Records</p>
                <p className="text-2xl font-semibold">{sharedRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Bell className="text-purple-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Pending Requests</p>
                <p className="text-2xl font-semibold">{pendingRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Shield className="text-indigo-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Data Security Score</p>
                <p className="text-2xl font-semibold">
                  {dashboardData.securityScore}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => handleNavigateTo("/upload")}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Upload className="w-5 h-5" />
            Upload New Record
          </button>

          <button
            onClick={() => handleNavigateTo("/permissions")}
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Shield className="w-5 h-5" />
            Manage Permissions
          </button>

          <button
            onClick={() => handleNavigateTo("/history")}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Clock className="w-5 h-5" />
            View Access History
          </button>
        </div>

        {/* Health Records Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>

          {/* Record viewer modal */}
          {viewingRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">
                    Health Record Details
                  </h3>
                  <button
                    onClick={closeViewer}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close details"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div
                  className="p-6 overflow-y-auto"
                  style={{ maxHeight: "calc(90vh - 120px)" }}
                >
                  {/* Record details would be displayed here */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="text-blue-500" size={20} />
                      <h4 className="font-medium text-blue-700">
                        HIPAA Compliant Viewing
                      </h4>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      This access is logged and monitored in compliance with
                      HIPAA regulations.
                    </p>
                  </div>

                  {/* Record content would go here */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">
                      Record content would be displayed here in a
                      HIPAA-compliant manner.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {userRecords.length === 0 ? (
            <div className="text-center py-8 bg-blue-50 rounded-lg">
              <FileText className="w-12 h-12 text-blue-300 mx-auto mb-3" />
              <p className="text-blue-700 mb-2">
                You don't have any health records yet
              </p>
              <button
                onClick={() => handleNavigateTo("/upload")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Your First Record
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText size={16} className="text-blue-500 mr-2" />
                      <h4 className="font-medium">
                        {record.title || `Health Record ${record.id.slice(-4)}`}
                      </h4>
                    </div>
                    {record.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {record.description ||
                      `${record.category || "Health"} data record`}
                  </p>

                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <div className="flex items-center mr-3">
                      {record.anonymized ? (
                        <Lock size={12} className="mr-1" />
                      ) : (
                        <Eye size={12} className="mr-1" />
                      )}
                      <span>
                        {record.anonymized ? "Anonymized" : "Identifiable"}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <BarChart size={12} className="mr-1" />
                      <span>
                        {record.recordCount || 1}{" "}
                        {record.recordCount === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                    <span>
                      Updated:{" "}
                      {new Date(
                        record.uploadDate || Date.now()
                      ).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {record.format || "JSON"}
                    </span>
                  </div>

                  <div className="flex border-t border-gray-100 pt-3 gap-2">
                    <button
                      onClick={() => handleViewRecord(record.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownloadRecord(record)}
                      disabled={downloadLoading}
                      className={`flex items-center justify-center gap-2 px-4 py-2 ${
                        downloadLoading
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      } rounded-lg`}
                      aria-busy={downloadLoading}
                    >
                      {downloadLoading ? (
                        <LoadingSpinner size="small" color="gray" />
                      ) : (
                        <Download size={18} />
                      )}
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleShareRecord(record.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          {dashboardData.recentActivity &&
          dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-600">
                        {activity.timestamp}
                      </p>
                      <span className="text-gray-300">•</span>
                      <p className="text-sm text-gray-600">
                        {activity.category}
                      </p>
                    </div>
                  </div>
                  {activity.status && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getActivityStatusColor(activity.status)}`}
                    >
                      {activity.status.charAt(0).toUpperCase() +
                        activity.status.slice(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity to display
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESEARCHER DASHBOARD RENDER
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User welcome with Role Switcher */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {userProfile?.name || "Researcher"}
          </h1>
          <p className="text-gray-600">
            Your researcher dashboard for discovering and analyzing health data
          </p>
        </div>
        
        {/* Role Switcher Component */}
        <div className="mt-4 md:mt-0">
          <RoleSwitcher />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Database className="text-purple-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Available Datasets</p>
              <p className="text-2xl font-semibold">{healthData.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <BarChart className="text-green-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Active Studies</p>
              <p className="text-2xl font-semibold">{activeStudies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Search className="text-blue-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Data Requests</p>
              <p className="text-2xl font-semibold">{pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Filter className="text-indigo-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Applied Filters</p>
              <p className="text-2xl font-semibold">{appliedFilters}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => handleNavigateTo("/studies")}
          className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <BarChart className="w-5 h-5" />
          View Studies
        </button>

        <button
          onClick={() => handleNavigateTo("/requests")}
          className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Search className="w-5 h-5" />
          Manage Requests
        </button>
      </div>

      {/* Available Datasets */}
      <div className="bg-white rounded-xl shadow-md mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Available Datasets
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Verified Data</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">
                  Pending Verification
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Dataset preview modal */}
          {previewOpen && selectedDataset && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold">Dataset Preview</h3>
                    <button
                      onClick={handleClosePreview}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {detailsLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  ) : datasetDetails ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-start gap-2">
                          <Info
                            size={20}
                            className="text-blue-500 flex-shrink-0 mt-0.5"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-700">
                              HIPAA Compliance Notice
                            </h5>
                            <p className="text-sm text-blue-600">
                              This dataset access is logged and monitored in
                              compliance with HIPAA regulations. All data
                              accessed is de-identified according to HIPAA Safe
                              Harbor provisions.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">
                          Description
                        </h5>
                        <p className="text-gray-700">
                          {datasetDetails.description ||
                            "No description available."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">
                            Records
                          </h5>
                          <p className="text-lg font-semibold">
                            {datasetDetails.recordCount || "Unknown"}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">
                            Format
                          </h5>
                          <p className="text-lg font-semibold">
                            {datasetDetails.format || "Various"}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-1">
                            Data Type
                          </h5>
                          <p className="text-lg font-semibold">
                            {datasetDetails.anonymized
                              ? "Anonymized"
                              : "Identifiable"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle
                        size={48}
                        className="mx-auto text-gray-400 mb-4"
                      />
                      <p className="text-gray-500">
                        Dataset details not available
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleClosePreview}
                      className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>

                    <button
                      onClick={() => {
                        handlePurchaseDataset(selectedDataset);
                        handleClosePreview();
                      }}
                      className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600"
                    >
                      Purchase Dataset
                    </button>

                    <button className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 flex items-center">
                      <Download size={16} className="mr-2" />
                      Download Sample
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {healthData.length === 0 ? (
            <div className="text-center py-8 bg-purple-50 rounded-lg">
              <Database className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-purple-700 mb-2">No datasets available</p>
              <button
                onClick={() => handleNavigateTo("/browse")}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors inline-flex items-center gap-2 text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                Browse All Datasets
              </button>
            </div>
          ) : (
            healthData.slice(0, 3).map((dataset) => (
              <div
                key={dataset.id}
                className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">
                        {dataset.title || dataset.category || "Health Dataset"}
                      </h3>
                      {dataset.verified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      {dataset.recordCount || "Unknown"} records •{" "}
                      {dataset.anonymized ? "Anonymized" : "Identifiable"}
                    </p>
                    <p className="text-gray-700 mt-2">
                      {dataset.description || "No description available."}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dataset.category || "Health Data"}
                      </span>
                      {dataset.verified && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                      {dataset.studyType && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {dataset.studyType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => handleViewDataset(dataset.id)}
                      className="w-full lg:w-auto bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Access
                    </button>
                    <button className="w-full lg:w-auto border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Sample Data
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {healthData.length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleNavigateTo("/browse")}
                className="px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors inline-flex items-center gap-2"
              >
                View All Datasets
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
        {dashboardData.recentActivity &&
        dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <div
                key={activity.id || index}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">
                      {activity.timestamp}
                    </p>
                    <span className="text-gray-300">•</span>
                    <p className="text-sm text-gray-600">{activity.category}</p>
                  </div>
                </div>
                {activity.status && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getActivityStatusColor(activity.status)}`}
                  >
                    {activity.status.charAt(0).toUpperCase() +
                      activity.status.slice(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No recent activity to display woooooo
          </div>
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  onNavigate: PropTypes.func,
};

export default Dashboard;