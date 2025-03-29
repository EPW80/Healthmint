// client/src/components/dashboard/PatientDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
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
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import useNavigation from "../../hooks/useNavigation.js";
import HealthDataSection from "../patientDashboard/HealthDataSection.js";
import useHealthData from "../../hooks/useHealthData.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

/**
 * PatientDashboard Component with improved null safety and real health data integration
 */
const PatientDashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();
  const { loading, error } = useSelector((state) => state.ui);
  const userProfile = useSelector((state) => state.user.profile || {});
  const walletAddress = useSelector((state) => state.wallet.address);

  // Use health data hook
  const { userRecords, fetchHealthData, downloadRecord } = useHealthData({
    userRole: "patient",
    loadOnMount: true,
  });

  // Local state with safe default values
  const [dashboardData, setDashboardData] = useState({
    totalRecords: 0,
    sharedRecords: 0,
    pendingRequests: 0,
    securityScore: 85,
    recentActivity: [],
  });

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      console.log("Fetching dashboard data...");

      // Create HIPAA-compliant audit log
      await hipaaComplianceService.createAuditLog("DASHBOARD_ACCESS", {
        action: "VIEW",
        timestamp: new Date().toISOString(),
      });

      // Calculate dashboard statistics from actual health records
      setDashboardData({
        totalRecords: userRecords.length,
        sharedRecords:
          userRecords.filter((record) => record.shared).length || 0,
        pendingRequests: userProfile.pendingRequests || 0,
        securityScore: userProfile.securityScore || 85,
        recentActivity: [],
      });

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

      // Set safe default values on error
      setDashboardData({
        totalRecords: userRecords.length || 0,
        sharedRecords: 0,
        pendingRequests: 0,
        securityScore: 85,
        recentActivity: [],
      });

      dispatch(setLoading(false));
    }
  }, [dispatch, userProfile, userRecords]);

  // Fetch dashboard data when user records change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, userRecords]);

  // Navigation handlers
  const handleUploadRecord = useCallback(() => {
    if (onNavigate) {
      onNavigate("/upload");
    } else {
      navigateTo("/upload");
    }
  }, [navigateTo, onNavigate]);

  const handleManagePermissions = useCallback(() => {
    if (onNavigate) {
      onNavigate("/permissions");
    } else {
      navigateTo("/permissions");
    }
  }, [navigateTo, onNavigate]);

  const handleViewHistory = useCallback(() => {
    if (onNavigate) {
      onNavigate("/history");
    } else {
      navigateTo("/history");
    }
  }, [navigateTo, onNavigate]);

  // Download a health record
  const handleDownloadRecord = useCallback(
    async (recordId) => {
      try {
        dispatch(setLoading(true));

        await downloadRecord(recordId);

        dispatch(
          addNotification({
            type: "success",
            message: "Record downloaded successfully",
          })
        );
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to download record. Please try again.",
          })
        );
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, downloadRecord]
  );

  // Activity status & icon helpers
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
  if (loading && userRecords.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {userProfile?.name || "Patient"}
        </h1>
        <p className="text-gray-600">
          Your patient dashboard for managing health data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <FileText className="text-blue-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Total Records</p>
              <p className="text-2xl font-semibold">
                {dashboardData.totalRecords}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <Database className="text-green-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Shared Records</p>
              <p className="text-2xl font-semibold">
                {dashboardData.sharedRecords}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:transform hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <Bell className="text-purple-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Pending Requests</p>
              <p className="text-2xl font-semibold">
                {dashboardData.pendingRequests}
              </p>
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
          onClick={handleUploadRecord}
          className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Upload className="w-5 h-5" />
          Upload New Record
        </button>

        <button
          onClick={handleManagePermissions}
          className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Shield className="w-5 h-5" />
          Manage Permissions
        </button>

        <button
          onClick={handleViewHistory}
          className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Clock className="w-5 h-5" />
          View Access History
        </button>
      </div>

      {/* Health Records Section */}
      <HealthDataSection walletAddress={walletAddress} userRole="patient" />

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
        {dashboardData.recentActivity &&
        dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity) => (
              <div
                key={activity.id}
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
            No recent activity to display
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
