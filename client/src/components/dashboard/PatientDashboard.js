// src/components/dashboard/PatientDashboard.js

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  FileText,
  Upload,
  Clock,
  Shield,
  AlertCircle,
  Check,
  Bell,
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const PatientDashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.ui);
  const [dashboardData, setDashboardData] = useState({
    totalRecords: 0,
    sharedRecords: 0,
    pendingRequests: 0,
    securityScore: 0,
    recentActivity: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        dispatch(setLoading(true));
        // Mock API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setDashboardData({
          totalRecords: 12,
          sharedRecords: 5,
          pendingRequests: 2,
          securityScore: 98,
          recentActivity: [
            {
              id: 1,
              type: "upload",
              message: "Medical Record Uploaded",
              timestamp: "2 hours ago",
              status: "success",
              category: "Cardiology",
            },
            {
              id: 2,
              type: "access",
              message: "Access Granted to Dr. Smith",
              timestamp: "Yesterday",
              status: "success",
              category: "General",
            },
            {
              id: 3,
              type: "request",
              message: "Data Access Request from Research Lab",
              timestamp: "2 days ago",
              status: "pending",
              category: "Research",
            },
          ],
        });
      } catch (err) {
        dispatch(setError(err.message));
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load dashboard data",
          })
        );
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  const handleUploadRecord = () => {
    if (onNavigate) {
      onNavigate("/upload");
    } else {
      dispatch(
        addNotification({
          type: "error",
          message: "Navigation handler not provided",
        })
      );
    }
  };

  const handleManagePermissions = () => {
    onNavigate?.("/permissions");
  };

  const handleViewHistory = () => {
    onNavigate?.("/history");
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "upload":
        return <Upload className="w-5 h-5 text-blue-500" />;
      case "access":
        return <Check className="w-5 h-5 text-green-500" />;
      case "request":
        return <Bell className="w-5 h-5 text-yellow-500" />;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
            <Upload className="text-green-500 w-8 h-8" />
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
            <Clock className="text-purple-500 w-8 h-8" />
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
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
                  <p className="text-sm text-gray-600">{activity.timestamp}</p>
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
      </div>
    </div>
  );
};

PatientDashboard.propTypes = {
  onNavigate: PropTypes.func,
};
export default PatientDashboard;
