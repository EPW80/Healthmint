// src/components/dashboard/ResearcherDashboard.js

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  Search,
  Database,
  Filter,
  BarChart,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { setLoading, setError } from "../../redux/slices/uiSlice";
import { addNotification } from "../../redux/slices/notificationSlice";

const ResearcherDashboard = ({ onNavigate }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.ui);
  const [stats, setStats] = useState({
    datasets: 0,
    activeStudies: 0,
    dataRequests: 0,
    appliedFilters: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        dispatch(setLoading(true));
        // Mock API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStats({
          datasets: 1234,
          activeStudies: 8,
          dataRequests: 23,
          appliedFilters: 5,
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

  const handleRequestAccess = async (datasetId) => {
    try {
      dispatch(setLoading(true));
      await new Promise((resolve) => setTimeout(resolve, 1000));

      dispatch(
        addNotification({
          type: "success",
          message: `Access request submitted for dataset ${datasetId}`,
        })
      );

      onNavigate?.("/requests");
    } catch (err) {
      dispatch(setError(err.message));
      dispatch(
        addNotification({
          type: "error",
          message: "Failed to request access",
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDownloadSample = async (datasetId) => {
    try {
      dispatch(setLoading(true));
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
          message: "Failed to download sample data",
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 max-w-md">
          <AlertCircle className="text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <Database className="text-blue-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Available Datasets</p>
                <p className="text-2xl font-semibold">{stats.datasets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <BarChart className="text-green-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Active Studies</p>
                <p className="text-2xl font-semibold">{stats.activeStudies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <Search className="text-purple-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Data Requests</p>
                <p className="text-2xl font-semibold">{stats.dataRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <Filter className="text-indigo-500 w-8 h-8" />
              <div>
                <p className="text-gray-600 text-sm">Applied Filters</p>
                <p className="text-2xl font-semibold">{stats.appliedFilters}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Datasets */}
        <div className="bg-white rounded-xl shadow-md">
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
            <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">
                      Cardiovascular Health Study
                    </h3>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    500 records • Anonymized
                  </p>
                  <p className="text-gray-700 mt-2">
                    Comprehensive dataset containing anonymized cardiovascular
                    health records with vital signs, diagnoses, and treatment
                    outcomes.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Cardiology
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Clinical Trial
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => handleRequestAccess("cardio-001")}
                    className="w-full lg:w-auto bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? "Requesting..." : "Request Access"}
                  </button>
                  <button
                    onClick={() => handleDownloadSample("cardio-001")}
                    className="w-full lg:w-auto border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Sample Data
                  </button>
                </div>
              </div>
            </div>

            {/* Second Dataset */}
            <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">
                      Diabetes Research Database
                    </h3>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    750 records • Anonymized
                  </p>
                  <p className="text-gray-700 mt-2">
                    Longitudinal study data tracking diabetes progression,
                    treatment efficacy, and patient outcomes over a 5-year
                    period.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Endocrinology
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Longitudinal
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => handleRequestAccess("diabetes-001")}
                    className="w-full lg:w-auto bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? "Requesting..." : "Request Access"}
                  </button>
                  <button
                    onClick={() => handleDownloadSample("diabetes-001")}
                    className="w-full lg:w-auto border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Sample Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ResearcherDashboard.propTypes = {
  onNavigate: PropTypes.func,
};

export default ResearcherDashboard;
