// src/components/dashboard/PatientDashboard.js
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

/**
 * PatientDashboard Component with improved null safety
 */
const PatientDashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();
  const { loading, error } = useSelector((state) => state.ui);
  const userProfile = useSelector((state) => state.user.profile || {});

  // Local state with safe default values
  const [dashboardData, setDashboardData] = useState({
    totalRecords: 0,
    sharedRecords: 0,
    pendingRequests: 0,
    securityScore: 85,
    recentActivity: [],
    healthRecords: [],
  });

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      console.log("Fetching dashboard data...");

      // Mock data for development - replace with actual API calls later
      setTimeout(() => {
        setDashboardData({
          totalRecords: userProfile.totalUploads || 0,
          sharedRecords: userProfile.totalShared || 0,
          pendingRequests: userProfile.pendingRequests || 0,
          securityScore: userProfile.securityScore || 85,
          recentActivity: [],
          healthRecords: [],
        });

        dispatch(setLoading(false));
      }, 500);
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
        totalRecords: 0,
        sharedRecords: 0,
        pendingRequests: 0,
        securityScore: 85,
        recentActivity: [],
        healthRecords: [],
      });

      dispatch(setLoading(false));
    }
  }, [dispatch, userProfile]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

        // Mock download functionality
        setTimeout(() => {
          dispatch(
            addNotification({
              type: "success",
              message: "Record downloaded successfully",
            })
          );
          dispatch(setLoading(false));
        }, 1000);
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to download record. Please try again.",
          })
        );
        dispatch(setLoading(false));
      }
    },
    [dispatch]
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
  if (loading) {
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
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

      {/* Health Records */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>
        {dashboardData.healthRecords &&
        dashboardData.healthRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.healthRecords.map((record) => (
              <div
                key={record.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{record.category}</h3>
                  {record.verified && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Check className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {record.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {record.dateUploaded}
                  </span>
                  <button
                    onClick={() => handleDownloadRecord(record.id)}
                    className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-blue-50 rounded-lg">
            <Database className="w-12 h-12 text-blue-300 mx-auto mb-3" />
            <p className="text-blue-700 mb-2">No health records found</p>
            <button
              onClick={handleUploadRecord}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-2 text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Your First Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
