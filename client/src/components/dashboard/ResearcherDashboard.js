// src/components/dashboard/ResearcherDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Search,
  Database,
  Filter,
  BarChart,
  Download,
  AlertCircle,
  CheckCircle,
  Microscope,
  BookOpen,
  Clock,
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import userService from "../../services/userService.js";
import apiService from "../../services/apiService.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import useNavigation from "../../hooks/useNavigation.js";

/**
 * ResearcherDashboard Component
 *
 * Main dashboard for researcher role users to discover and analyze health data
 */
const ResearcherDashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();

  // Get global state from Redux
  const { loading, error } = useSelector((state) => state.ui);
  const userProfile = useSelector((state) => state.user.profile);

  // Local state for dashboard data
  const [dashboardData, setDashboardData] = useState({
    datasets: 0,
    activeStudies: 0,
    dataRequests: 0,
    appliedFilters: 0,
    recentActivity: [],
    availableDatasets: [],
  });

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      // Create audit log for dashboard access
      await hipaaComplianceService.createAuditLog("DASHBOARD_ACCESS", {
        userRole: "researcher",
        timestamp: new Date().toISOString(),
      });

      const userStats = await userService.getUserStats();
      // Use apiService without absolute path
      const availableDatasets = await apiService.get("datasets/browse", {
        limit: 5,
        sort: "recent",
      });
      // Use userService instead of direct API call
      const recentActivity = await userService.getAuditLog({
        limit: 10,
        type: "researcher_activity",
      });

      // Update dashboard data state with all the fetched information
      setDashboardData({
        datasets: userStats.availableDatasets || 1234, // Default value if not provided
        activeStudies: userStats.activeStudies || 8,
        dataRequests: userStats.pendingRequests || 23,
        appliedFilters: userStats.savedFilters || 5,
        recentActivity: recentActivity.data || [],
        availableDatasets: availableDatasets.data || [],
      });
    } catch (err) {
      dispatch(setError(err.message || "Failed to load dashboard data"));
      dispatch(
        addNotification({
          type: "error",
          message: "Failed to load dashboard data. Please try again.",
        })
      );

      // Set default values if API calls fail
      setDashboardData({
        datasets: 1234,
        activeStudies: 8,
        dataRequests: 23,
        appliedFilters: 5,
        recentActivity: [],
        availableDatasets: [],
      });
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Added fetchDashboardData as a dependency

  // Request access to a dataset
  const handleRequestAccess = useCallback(
    async (datasetId) => {
      try {
        dispatch(setLoading(true));

        // Log the access request for HIPAA compliance
        await hipaaComplianceService.createAuditLog("DATASET_ACCESS_REQUEST", {
          datasetId,
          timestamp: new Date().toISOString(),
          purpose: "Research analysis",
        });

        // Request access through API
        await apiService.post("datasets/request-access", {
          datasetId,
          purpose: "Research analysis",
          requestTime: new Date().toISOString(),
        });

        dispatch(
          addNotification({
            type: "success",
            message: `Access request submitted for dataset ${datasetId}`,
          })
        );

        // Navigate to requests page
        if (onNavigate) {
          onNavigate("/requests");
        } else {
          navigateTo("/requests");
        }
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to request access. Please try again.",
          })
        );
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, navigateTo, onNavigate]
  );

  // Download dataset sample
  const handleDownloadSample = useCallback(
    async (datasetId) => {
      try {
        dispatch(setLoading(true));

        // Log the sample download for HIPAA compliance
        await hipaaComplianceService.createAuditLog("DATASET_SAMPLE_DOWNLOAD", {
          datasetId,
          timestamp: new Date().toISOString(),
        });

        // Download sample through API
        const response = await apiService.get(`datasets/sample/${datasetId}`, {
          responseType: "blob",
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `dataset-sample-${datasetId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        dispatch(
          addNotification({
            type: "success",
            message: "Sample data downloaded successfully",
          })
        );
      } catch (err) {
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to download sample data. Please try again.",
          })
        );
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  // Navigate to browse page
  const handleBrowseDatasets = useCallback(() => {
    if (onNavigate) {
      onNavigate("/browse");
    } else {
      navigateTo("/browse");
    }
  }, [navigateTo, onNavigate]);

  // Navigate to studies page
  const handleViewStudies = useCallback(() => {
    if (onNavigate) {
      onNavigate("/studies");
    } else {
      navigateTo("/studies");
    }
  }, [navigateTo, onNavigate]);

  // Navigate to requests page
  const handleViewRequests = useCallback(() => {
    if (onNavigate) {
      onNavigate("/requests");
    } else {
      navigateTo("/requests");
    }
  }, [navigateTo, onNavigate]);

  // Get activity icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
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

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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
          Welcome, {userProfile?.name || "Researcher"}
        </h1>
        <p className="text-gray-600">
          Your researcher dashboard for discovering and analyzing health data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Database className="text-purple-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Available Datasets</p>
              <p className="text-2xl font-semibold">{dashboardData.datasets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <BarChart className="text-green-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Active Studies</p>
              <p className="text-2xl font-semibold">
                {dashboardData.activeStudies}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Search className="text-blue-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Data Requests</p>
              <p className="text-2xl font-semibold">
                {dashboardData.dataRequests}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <Filter className="text-indigo-500 w-8 h-8" />
            <div>
              <p className="text-gray-600 text-sm">Applied Filters</p>
              <p className="text-2xl font-semibold">
                {dashboardData.appliedFilters}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleBrowseDatasets}
          className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Database className="w-5 h-5" />
          Browse Datasets
        </button>

        <button
          onClick={handleViewStudies}
          className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <BarChart className="w-5 h-5" />
          View Studies
        </button>

        <button
          onClick={handleViewRequests}
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
          {dashboardData.availableDatasets.length > 0 ? (
            dashboardData.availableDatasets.map((dataset) => (
              <div
                key={dataset.id}
                className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">{dataset.title}</h3>
                      {dataset.verified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      {dataset.recordCount} records •{" "}
                      {dataset.anonymized ? "Anonymized" : "Identifiable"}
                    </p>
                    <p className="text-gray-700 mt-2">{dataset.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dataset.category}
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
                      onClick={() => handleRequestAccess(dataset.id)}
                      className="w-full lg:w-auto bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? "Requesting..." : "Request Access"}
                    </button>
                    <button
                      onClick={() => handleDownloadSample(dataset.id)}
                      className="w-full lg:w-auto border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Sample Data
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-purple-50 rounded-lg">
              <Database className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-purple-700 mb-2">No datasets available</p>
              <button
                onClick={handleBrowseDatasets}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors inline-flex items-center gap-2 text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                Browse All Datasets
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
        {dashboardData.recentActivity.length > 0 ? (
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
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === "success"
                        ? "bg-green-100 text-green-800"
                        : activity.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
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

export default ResearcherDashboard;