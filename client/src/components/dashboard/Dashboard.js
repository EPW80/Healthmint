// client/src/components/dashboard/Dashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  Bell,
  Database,
  Download,
  Search,
  BarChart,
  Filter,
  Microscope,
  BookOpen,
  Share2,
  Eye,
  Lock,
  Settings,
  Activity,
  Briefcase,
  Clipboard,
  Award,
  Layers,
  HelpCircle,
  Zap,
  Users,
  FileSpreadsheet,
  PieChart,
  HeartPulse,
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { selectRole } from "../../redux/slices/roleSlice.js";
import useHealthData from "../../hooks/useHealthData.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import useAsyncOperation from "../../hooks/useAsyncOperation.js";
import useAnalyticsNavigation from "../../hooks/useAnalyticsNavigation.js";
import ErrorDisplay from "../ui/ErrorDisplay.js";
import LoadingSpinner from "../ui/LoadingSpinner.js";
import { statusBadgeClass } from "../../theme/statusColors.js";

const Dashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get user information from Redux
  const userRole = useSelector(selectRole) || "patient"; // Default to 'patient'
  const { loading: uiLoading = false, error: uiError = null } = useSelector(
    (state) => state.ui || {}
  );
  const userProfile = useSelector((state) => state.user.profile || {});
  const userId = useSelector(
    (state) =>
      state.wallet.address ||
      localStorage.getItem("healthmint_wallet_address") ||
      "unknown"
  );

  // Get user metrics based on role - removing unused variables to fix warnings
  const {
    pendingRequests = 0,
    activeStudies = 0,
    securityScore = 85,
  } = userProfile || {};

  // Get health data state from hook
  const {
    userRecords = [],
    healthData = [],
    getRecordDetails,
    downloadRecord,
    loading: healthDataLoading = false,
    refreshData,
  } = useHealthData({
    userRole,
    loadOnMount: true,
    initialData: [],
  });

  // Set up async operation handling
  const { loading: asyncLoading = false, execute: executeAsync } =
    useAsyncOperation({
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
    }) || {};

  // Local state for UI
  const [viewingRecord, setViewingRecord] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [datasetDetails, setDatasetDetails] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadingRecordId, setDownloadingRecordId] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    recentActivity: [],
    availableDatasets: [],
  });

  // Combine loading states
  const isLoading = uiLoading || healthDataLoading || asyncLoading;

  // Derived state
  const totalRecords = useMemo(() => userRecords.length || 0, [userRecords]);
  const sharedRecords = useMemo(
    () => userRecords.filter((record) => record?.shared).length || 0,
    [userRecords]
  );

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("DASHBOARD_ACCESS", {
        action: "VIEW",
        userRole,
        userId,
        timestamp: new Date().toISOString(),
      });

      // Generate sample activities based on user role
      const sampleActivities = generateSampleActivities(userRole);

      // Set appropriate dashboard data based on role
      setDashboardData((prevData) => ({
        ...prevData,
        securityScore: userProfile?.securityScore || 85,
        recentActivity: sampleActivities,
        availableDatasets: userRole === "researcher" ? healthData || [] : [],
      }));

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

      dispatch(setLoading(false));
    }
  }, [userRole, userId, dispatch, healthData, userProfile]);

  // Add this function to generate sample activities
  const generateSampleActivities = (role) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (role === "patient") {
      return [
        {
          id: "act-001",
          type: "upload",
          message: "New health record uploaded",
          timestamp: now.toLocaleDateString(),
          category: "Records",
          status: "success",
        },
        {
          id: "act-002",
          type: "access",
          message: "Dr. Smith viewed your medical history",
          timestamp: yesterday.toLocaleDateString(),
          category: "Access",
          status: "success",
        },
        {
          id: "act-003",
          type: "request",
          message: "Research Institute requested data access",
          timestamp: twoDaysAgo.toLocaleDateString(),
          category: "Requests",
          status: "pending",
        },
        {
          id: "act-004",
          type: "download",
          message: "Downloaded vaccination records",
          timestamp: threeDaysAgo.toLocaleDateString(),
          category: "Downloads",
          status: "success",
        },
      ];
    } else {
      // Researcher activities
      return [
        {
          id: "act-r001",
          type: "access_request",
          message: "Access requested for Diabetes Dataset 2023",
          timestamp: now.toLocaleDateString(),
          category: "Data Access",
          status: "pending",
        },
        {
          id: "act-r002",
          type: "data_download",
          message: "Downloaded Heart Disease Dataset",
          timestamp: yesterday.toLocaleDateString(),
          category: "Downloads",
          status: "success",
        },
        {
          id: "act-r003",
          type: "study_update",
          message: "Updated COVID-19 Outcomes Study",
          timestamp: twoDaysAgo.toLocaleDateString(),
          category: "Studies",
          status: "success",
        },
        {
          id: "act-r004",
          type: "publication",
          message: "Published findings to Medical Journal",
          timestamp: threeDaysAgo.toLocaleDateString(),
          category: "Publications",
          status: "success",
        },
      ];
    }
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    // Refresh data when component mounts or when returning to dashboard
    refreshData();
  }, [refreshData]);

  // Navigation handler
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

  // Patient-specific handlers
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

        await getRecordDetails(recordId);
        setViewingRecord(recordId);
      });
    },
    [executeAsync, getRecordDetails, userId]
  );

  const handleDownloadRecord = useCallback(
    async (recordId) => {
      try {
        setDownloadLoading(true);
        setDownloadingRecordId(recordId);

        await hipaaComplianceService.createAuditLog("RECORD_DOWNLOAD", {
          action: "DOWNLOAD",
          recordId,
          timestamp: new Date().toISOString(),
          userId,
        });

        await downloadRecord(recordId);

        // Show success notification
        dispatch(
          addNotification({
            type: "success",
            message: "Record downloaded successfully",
          })
        );
      } catch (error) {
        console.error("Download error:", error);

        // Show error notification
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to download record",
          })
        );
      } finally {
        setDownloadLoading(false);
        setDownloadingRecordId(null);
      }
    },
    [downloadRecord, dispatch, userId]
  );

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

  // Researcher-specific handlers
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
      });
    },
    [executeAsync, dispatch, userId, userRole]
  );

  // Close the preview modal (Researcher dashboard)
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // Analytics navigation setup - moved after handleViewDataset is defined
  const {
    navigateToVisualization,
    navigateToStatistics,
    navigateToPopulationStudies,
    startDataFiltering,
  } = useAnalyticsNavigation({
    onStartFiltering: handleViewDataset,
  });

  // Activity status & icon helpers
  const getActivityIcon = (type) => {
    switch (type) {
      case "upload":
        return <Upload className="w-5 h-5 text-blue-500" />;
      case "access":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
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
        return <Clock className="w-5 h-5 text-fg-muted" />;
    }
  };

  const getActivityStatusColor = (status) => statusBadgeClass(status);

  // Loading state
  if (isLoading && !uiError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-fg mb-8">Dashboard</h1>
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-8 flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner
            size="large"
            color="accent"
            label={`Loading ${userRole === "patient" ? "patient" : "researcher"} dashboard...`}
            showLabel={true}
          />
          <p className="text-fg-muted mt-4">
            Please wait while we retrieve your information
          </p>
        </div>
      </div>
    );
  }

  // Error state
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

  // PATIENT DASHBOARD
  if (userRole === "patient") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User welcome - Patient */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fg">
            Welcome, {userProfile?.name || "Patient"}
          </h1>
          <p className="text-fg-muted">
            Manage your health data securely with Healthmint
          </p>
        </div>

        {/* Stats Grid - Patient */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <FileText className="text-accent w-8 h-8" />
              <div>
                <p className="text-fg-muted text-sm">My Health Records</p>
                <p className="text-2xl font-semibold">{totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Share2 className="text-success w-8 h-8" />
              <div>
                <p className="text-fg-muted text-sm">Shared Records</p>
                <p className="text-2xl font-semibold">{sharedRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Bell className="text-accent w-8 h-8" />
              <div>
                <p className="text-fg-muted text-sm">Access Requests</p>
                <p className="text-2xl font-semibold">{pendingRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
              <Shield className="text-accent w-8 h-8" />
              <div>
                <p className="text-fg-muted text-sm">Privacy Score</p>
                <p className="text-2xl font-semibold">{securityScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Patient */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => handleNavigateTo("/storage")}
            className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Upload className="w-5 h-5" />
            Upload Health Record
          </button>

          <button
            onClick={() => handleNavigateTo("/contribute")}
            className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <HeartPulse className="w-5 h-5" />
            Contribute Data
          </button>

          <button
            onClick={() => handleNavigateTo("/history")}
            className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Clock className="w-5 h-5" />
            Access History
          </button>
        </div>

        {/* HIPAA Compliance Banner - Patient */}
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Shield className="text-accent flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-medium text-accent">Your Data is Protected</h3>
            <p className="text-sm text-fg-muted">
              Your health information is securely stored and protected in
              accordance with HIPAA regulations. You control who can access your
              data and all access is logged for your security.
            </p>
          </div>
        </div>

        {/* Health Records Section - Patient */}
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>

          {/* Record viewer modal */}
          {viewingRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-surface border border-line rounded-token-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-line flex justify-between items-center">
                  <h3 className="text-xl font-semibold">
                    Health Record Details
                  </h3>
                  <button
                    onClick={closeViewer}
                    className="text-fg-muted hover:text-fg"
                    aria-label="Close details"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
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
                  <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="text-accent" size={20} />
                      <h4 className="font-medium text-accent">
                        HIPAA Compliant Viewing
                      </h4>
                    </div>
                    <p className="text-sm text-fg-muted mt-1">
                      This access is logged and monitored in compliance with
                      HIPAA regulations.
                    </p>
                  </div>

                  {/* Record content */}
                  <div className="bg-surface-raised p-4 rounded-lg">
                    <div className="border-b border-line pb-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-fg">
                          Patient Record
                        </h4>
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                          Last updated: {new Date().toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-fg-muted">
                        Record ID:{" "}
                        {viewingRecord?.substring(0, 8) || "REC-12345-XYZ"} •
                        HIPAA-compliant viewing session • Access logged
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Vital Signs */}
                      <div className="bg-surface p-3 rounded border border-line">
                        <h5 className="font-medium text-fg mb-2">
                          Vital Signs
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-accent/10 p-2 rounded">
                            <p className="text-fg-subtle">Blood Pressure</p>
                            <p className="font-semibold">120/80 mmHg</p>
                          </div>
                          <div className="bg-accent/10 p-2 rounded">
                            <p className="text-fg-subtle">Heart Rate</p>
                            <p className="font-semibold">72 bpm</p>
                          </div>
                          <div className="bg-accent/10 p-2 rounded">
                            <p className="text-fg-subtle">Temperature</p>
                            <p className="font-semibold">98.6 °F</p>
                          </div>
                          <div className="bg-accent/10 p-2 rounded">
                            <p className="text-fg-subtle">SpO2</p>
                            <p className="font-semibold">98%</p>
                          </div>
                        </div>
                      </div>

                      {/* Medications */}
                      <div className="bg-surface p-3 rounded border border-line">
                        <h5 className="font-medium text-fg mb-2">
                          Current Medications
                        </h5>
                        <table className="min-w-full text-sm">
                          <thead className="bg-surface-raised">
                            <tr>
                              <th className="text-left p-2">Medication</th>
                              <th className="text-left p-2">Dosage</th>
                              <th className="text-left p-2">Frequency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            <tr>
                              <td className="p-2">Lisinopril</td>
                              <td className="p-2">10mg</td>
                              <td className="p-2">Once daily</td>
                            </tr>
                            <tr>
                              <td className="p-2">Metformin</td>
                              <td className="p-2">500mg</td>
                              <td className="p-2">Twice daily</td>
                            </tr>
                            <tr>
                              <td className="p-2">Atorvastatin</td>
                              <td className="p-2">20mg</td>
                              <td className="p-2">Once daily at bedtime</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Diagnoses */}
                      <div className="bg-surface p-3 rounded border border-line">
                        <h5 className="font-medium text-fg mb-2">Diagnoses</h5>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          <li>Type 2 Diabetes Mellitus (E11.9)</li>
                          <li>Essential Hypertension (I10)</li>
                          <li>Hyperlipidemia (E78.5)</li>
                        </ul>
                      </div>

                      {/* Doctor's Notes */}
                      <div className="bg-surface p-3 rounded border border-line">
                        <h5 className="font-medium text-fg mb-2">
                          Clinical Notes
                        </h5>
                        <div className="text-sm text-fg bg-surface-raised p-3 rounded-sm">
                          <p>
                            Patient is showing good management of glucose levels
                            with current medication regimen. Blood pressure is
                            within target range. Discussed importance of regular
                            physical activity and consistent medication
                            adherence.
                          </p>
                          <p className="mt-2">
                            Follow-up appointment scheduled in 3 months. Patient
                            expressed understanding of care plan.
                          </p>
                          <p className="mt-2 text-xs text-fg-subtle">
                            Dr. Johnson • Primary Care • 03/15/2025
                          </p>
                        </div>
                      </div>

                      {/* HIPAA Compliance Footer */}
                      <div className="mt-4 pt-3 border-t border-line text-xs text-fg-subtle">
                        <p>
                          This medical record is protected under HIPAA Privacy
                          Rule (45 CFR Parts 160 and 164). Unauthorized access,
                          use, or disclosure is strictly prohibited and may
                          result in penalties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!userRecords || userRecords.length === 0 ? (
            <div className="text-center py-8 bg-accent/10 rounded-lg">
              <FileText className="w-12 h-12 text-accent/50 mx-auto mb-3" />
              <p className="text-accent mb-2">
                You don't have any health records yet
              </p>
              <button
                onClick={() => handleNavigateTo("/storage")}
                className="px-4 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
              >
                Upload Your First Record
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userRecords.slice(0, 6).map((record) => (
                <div
                  key={record.id}
                  className="border border-line rounded-lg p-4 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText size={16} className="text-accent mr-2" />
                      <h4 className="font-medium">
                        {record.title || `Health Record ${record.id.slice(-4)}`}
                      </h4>
                    </div>
                    {record.verified && (
                      <span className="bg-success-soft text-success text-xs px-2 py-1 rounded-full flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-fg-muted mb-2 line-clamp-2">
                    {record.description ||
                      `${record.category || "Health"} data record`}
                  </p>

                  <div className="flex items-center text-xs text-fg-muted mb-3">
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

                  <div className="flex justify-between items-center text-xs text-fg-muted mb-3">
                    <span>
                      Updated:{" "}
                      {new Date(
                        record.uploadDate || Date.now()
                      ).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-accent/10 text-accent rounded-full">
                      {record.format || "JSON"}
                    </span>
                  </div>

                  <div className="flex border-t border-line pt-3 gap-2">
                    <button
                      onClick={() => handleViewRecord(record.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-accent hover:text-accent-hover"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownloadRecord(record.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-success"
                      disabled={
                        downloadLoading && downloadingRecordId === record.id
                      }
                    >
                      {downloadLoading && downloadingRecordId === record.id ? (
                        <LoadingSpinner size="small" color="success" />
                      ) : (
                        <Download size={14} />
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

          {/* View all records button */}
          {userRecords.length > 6 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => handleNavigateTo("/records")}
                className="px-4 py-2 border border-line rounded-lg text-fg hover:bg-surface-raised transition-colors inline-flex items-center gap-2"
              >
                View All Records
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
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

        {/* Data Controls Section - Patient */}
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Data Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-line rounded-lg p-5">
              <div className="flex items-center mb-4">
                <Lock className="text-accent w-6 h-6 mr-3" />
                <h3 className="text-lg font-medium">Privacy Settings</h3>
              </div>
              <p className="text-fg-muted mb-4">
                Control who can access your health data and how it's used for
                research.
              </p>
              <button
                onClick={() => handleNavigateTo("/profile")}
                className="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors inline-flex items-center gap-2"
              >
                Manage Privacy
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
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

            <div className="border border-line rounded-lg p-5">
              <div className="flex items-center mb-4">
                <Database className="text-purple-500 w-6 h-6 mr-3" />
                <h3 className="text-lg font-medium">Data Sharing</h3>
              </div>
              <p className="text-fg-muted mb-4">
                Manage research access to your anonymized health data and track
                usage.
              </p>
              <button
                onClick={() => handleNavigateTo("/sharing")}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors inline-flex items-center gap-2"
              >
                Sharing Controls
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
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
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
          {dashboardData.recentActivity &&
          dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center gap-4 p-4 hover:bg-surface-raised rounded-lg transition-colors border border-line"
                >
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-fg-muted">
                        {activity.timestamp}
                      </p>
                      <span className="text-fg-subtle">•</span>
                      <p className="text-sm text-fg-muted">
                        {activity.category}
                      </p>
                    </div>
                  </div>
                  {activity.status && (
                    <span className={getActivityStatusColor(activity.status)}>
                      {activity.status.charAt(0).toUpperCase() +
                        activity.status.slice(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-fg-muted">
              No recent activity to display
            </div>
          )}
        </div>

        {/* Educational Resources - Patient */}
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Health Resources</h2>
          <p className="text-fg-muted mb-6">
            Learn more about managing your health data and privacy.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
              <HelpCircle className="text-accent w-8 h-8 mb-3" />
              <h3 className="font-medium mb-2">HIPAA Rights Guide</h3>
              <p className="text-sm text-fg-muted mb-3">
                Understand your rights under HIPAA and how your data is
                protected.
              </p>
              {/* Fix for anchor href warning */}
              <button
                onClick={() => handleNavigateTo("/resources/hipaa-guide")}
                className="text-accent text-sm hover:underline"
              >
                Learn more →
              </button>
            </div>

            <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
              <Layers className="text-success w-8 h-8 mb-3" />
              <h3 className="font-medium mb-2">Data Sharing Benefits</h3>
              <p className="text-sm text-fg-muted mb-3">
                How sharing your health data can contribute to medical advances.
              </p>
              {/* Fix for anchor href warning */}
              <button
                onClick={() => handleNavigateTo("/resources/sharing-benefits")}
                className="text-success text-sm hover:underline"
              >
                Learn more →
              </button>
            </div>

            <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
              <Shield className="text-purple-500 w-8 h-8 mb-3" />
              <h3 className="font-medium mb-2">Privacy Best Practices</h3>
              <p className="text-sm text-fg-muted mb-3">
                Tips for maintaining privacy while sharing health information.
              </p>
              {/* Fix for anchor href warning */}
              <button
                onClick={() => handleNavigateTo("/resources/privacy-practices")}
                className="text-purple-600 text-sm hover:underline"
              >
                Learn more →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RESEARCHER DASHBOARD
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User welcome - Researcher */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">
          Welcome, {userProfile?.name || "Researcher"}
        </h1>
        <p className="text-fg-muted">
          Discover and analyze health datasets for your research
        </p>
      </div>

      {/* Stats Grid - Researcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Database className="text-purple-500 w-8 h-8" />
            <div>
              <p className="text-fg-muted text-sm">Available Datasets</p>
              <p className="text-2xl font-semibold">
                {healthData?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Microscope className="text-purple-500 w-8 h-8" />
            <div>
              <p className="text-fg-muted text-sm">Active Studies</p>
              <p className="text-2xl font-semibold">{activeStudies}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Clipboard className="text-accent w-8 h-8" />
            <div>
              <p className="text-fg-muted text-sm">Data Requests</p>
              <p className="text-2xl font-semibold">{pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Award className="text-success w-8 h-8" />
            <div>
              <p className="text-fg-muted text-sm">Published Findings</p>
              <p className="text-2xl font-semibold">
                {userProfile?.publications?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Researcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => handleNavigateTo("/browse")}
          className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Search className="w-5 h-5" />
          Explore Datasets
        </button>

        <button
          onClick={() => handleNavigateTo("/studies")}
          className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Microscope className="w-5 h-5" />
          Manage Studies
        </button>

        <button
          onClick={() => handleNavigateTo("/analysis")}
          className="p-4 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Data Analysis Tools
        </button>
      </div>

      {/* Research Ethics Banner - Researcher */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-8 flex items-start gap-3">
        <Briefcase className="text-accent flex-shrink-0 mt-1" size={24} />
        <div>
          <h3 className="font-medium text-accent">Research Ethics Reminder</h3>
          <p className="text-sm text-fg-muted">
            All data access is HIPAA-compliant and ethically sourced. Remember
            to include proper attribution when publishing findings based on
            Healthmint datasets.
          </p>
        </div>
      </div>

      {/* Dataset preview modal */}
      {previewOpen && selectedDataset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface border border-line rounded-token-lg shadow-soft-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-line">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Dataset Preview</h3>
                <button
                  onClick={handleClosePreview}
                  className="text-fg-muted hover:text-fg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              ) : datasetDetails ? (
                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <Briefcase
                        size={20}
                        className="text-purple-500 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <h5 className="font-medium text-purple-700">
                          Research Use Guidelines
                        </h5>
                        <p className="text-sm text-purple-600">
                          This dataset is provided for research purposes only.
                          All data is de-identified according to HIPAA Safe
                          Harbor provisions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-fg mb-2">Description</h5>
                    <p className="text-fg">
                      {datasetDetails.description ||
                        "No description available."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface-raised p-4 rounded-lg">
                      <h5 className="font-medium text-fg mb-1">Records</h5>
                      <p className="text-lg font-semibold">
                        {datasetDetails.recordCount || "Unknown"}
                      </p>
                    </div>
                    <div className="bg-surface-raised p-4 rounded-lg">
                      <h5 className="font-medium text-fg mb-1">Format</h5>
                      <p className="text-lg font-semibold">
                        {datasetDetails.format || "Various"}
                      </p>
                    </div>
                    <div className="bg-surface-raised p-4 rounded-lg">
                      <h5 className="font-medium text-fg mb-1">Data Type</h5>
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
                    className="mx-auto text-fg-subtle mb-4"
                  />
                  <p className="text-fg-muted">Dataset details not available</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-line bg-surface-raised">
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 border border-line text-fg font-medium rounded-lg hover:bg-surface-raised"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    handlePurchaseDataset(selectedDataset);
                    handleClosePreview();
                  }}
                  className="px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600"
                >
                  Purchase Dataset
                </button>

                <button className="px-4 py-2 bg-success text-white font-medium rounded-lg hover:bg-success flex items-center">
                  <Download size={16} className="mr-2" />
                  Download Sample
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Datasets Section - Researcher */}
      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md mb-8">
        <div className="p-6 border-b border-line">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-fg">Recent Datasets</h2>
            <button
              onClick={() => handleNavigateTo("/browse")}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              View All
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!healthData || healthData.length === 0 ? (
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
                className="border rounded-lg p-6 hover:bg-surface-raised transition-colors"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">
                        {dataset.title || dataset.category || "Health Dataset"}
                      </h3>
                      {dataset.verified && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <p className="text-fg-muted text-sm mt-1">
                      {dataset.recordCount || "Unknown"} records •{" "}
                      {dataset.anonymized ? "Anonymized" : "Identifiable"}
                    </p>
                    <p className="text-fg mt-2 line-clamp-2">
                      {dataset.description || "No description available."}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {dataset.category || "Health Data"}
                      </span>
                      {dataset.verified && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-success-soft text-success">
                          Verified
                        </span>
                      )}
                      {dataset.studyType && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {dataset.studyType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <div className="text-xl font-bold text-purple-600 mb-2 text-center lg:text-right">
                      {dataset.price} ETH
                    </div>
                    <button
                      onClick={() => handleViewDataset(dataset.id)}
                      className="w-full lg:w-auto bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handlePurchaseDataset(dataset.id)}
                      className="w-full lg:w-auto border border-purple-500 text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {healthData && healthData.length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleNavigateTo("/browse")}
                className="px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors inline-flex items-center gap-2"
              >
                View All Datasets
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
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

      {/* Research Tools Section - Researcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6">
          <div className="flex items-center mb-4">
            <PieChart className="text-indigo-500 w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold">Analytics Tools</h2>
          </div>
          <p className="text-fg-muted mb-4">
            Access powerful tools to analyze health datasets and generate
            insights.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigateToVisualization(userId, userRole)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <BarChart size={16} />
              Data Visualization
            </button>
            <button
              onClick={() => navigateToStatistics(userId, userRole)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Activity size={16} />
              Statistical Analysis
            </button>
            <button
              onClick={() => navigateToPopulationStudies(userId, userRole)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Users size={16} />
              Population Studies
            </button>
            <button
              onClick={() =>
                startDataFiltering(selectedDataset || null, userId, userRole)
              }
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Filter size={16} />
              Data Filtering
            </button>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6">
          <div className="flex items-center mb-4">
            <Zap className="text-purple-500 w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold">Research Pipeline</h2>
          </div>
          <p className="text-fg-muted mb-4">
            Track your research progress from data acquisition to publication.
          </p>
          <div className="relative">
            <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-purple-200"></div>
            <div className="relative pl-10 pb-3">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-purple-500"></div>
              <h3 className="font-medium text-fg">Data Acquisition</h3>
              <p className="text-sm text-fg-muted">
                {healthData?.length || 0} datasets available
              </p>
            </div>
            <div className="relative pl-10 pb-3">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-purple-300"></div>
              <h3 className="font-medium text-fg">Analysis In Progress</h3>
              <p className="text-sm text-fg-muted">
                {activeStudies} active studies
              </p>
            </div>
            <div className="relative pl-10">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-fg-subtle"></div>
              <h3 className="font-medium text-fg">Publication Ready</h3>
              <p className="text-sm text-fg-muted">
                {userProfile?.publications?.length || 0} publications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Researcher */}
      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
        {dashboardData.recentActivity &&
        dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <div
                key={activity.id || index}
                className="flex items-center gap-4 p-4 hover:bg-surface-raised rounded-lg transition-colors border border-line"
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-fg-muted">
                      {activity.timestamp}
                    </p>
                    <span className="text-fg-subtle">•</span>
                    <p className="text-sm text-fg-muted">{activity.category}</p>
                  </div>
                </div>
                {activity.status && (
                  <span className={getActivityStatusColor(activity.status)}>
                    {activity.status.charAt(0).toUpperCase() +
                      activity.status.slice(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-fg-muted">
            No recent activity to display
          </div>
        )}
      </div>

      {/* Research Resources - Researcher */}
      <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Research Resources</h2>
        <p className="text-fg-muted mb-6">
          Tools and resources to enhance your research with Healthmint data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
            <Award className="text-purple-500 w-8 h-8 mb-3" />
            <h3 className="font-medium mb-2">Citation Guidelines</h3>
            <p className="text-sm text-fg-muted mb-3">
              How to properly cite Healthmint datasets in your publications.
            </p>
            {/* Fix for anchor href warning */}
            <button
              onClick={() => handleNavigateTo("/resources/citation-guidelines")}
              className="text-purple-600 text-sm hover:underline"
            >
              Learn more →
            </button>
          </div>

          <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
            <Briefcase className="text-indigo-500 w-8 h-8 mb-3" />
            <h3 className="font-medium mb-2">Research Ethics</h3>
            <p className="text-sm text-fg-muted mb-3">
              Guidelines for ethical research using anonymized health data.
            </p>
            {/* Fix for anchor href warning */}
            <button
              onClick={() => handleNavigateTo("/resources/research-ethics")}
              className="text-indigo-600 text-sm hover:underline"
            >
              Learn more →
            </button>
          </div>

          <div className="border border-line rounded-lg p-4 hover:shadow-md transition-all">
            <Users className="text-accent w-8 h-8 mb-3" />
            <h3 className="font-medium mb-2">Collaboration Network</h3>
            <p className="text-sm text-fg-muted mb-3">
              Connect with other researchers working on similar health topics.
            </p>
            {/* Fix for anchor href warning */}
            <button
              onClick={() => handleNavigateTo("/network/join")}
              className="text-accent text-sm hover:underline"
            >
              Join network →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  onNavigate: PropTypes.func,
};

export default Dashboard;
