// client/src/components/patientDashboard/HealthDataSection.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  AlertCircle,
  FileText,
  Download,
  Share2,
  Eye,
  Lock,
  BarChart,
} from "lucide-react";
import useHealthData from "../../hooks/useHealthData.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import HipaaCompliantDataViewer from "../HipaaCompliantDataViewer.js";

const HealthDataSection = ({ walletAddress, userRole }) => {
  const [viewingRecord, setViewingRecord] = useState(null);

  // Use enhanced health data hook
  const {
    userRecords,
    loading,
    error,
    fetchHealthData,
    getRecordDetails,
    downloadRecord,
    clearError,
  } = useHealthData({
    loadOnMount: true,
    userRole: "patient",
    enablePolling: false, // Disable polling for this example
  });

  // Fetch data on mount
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Handle record viewing
  const handleViewRecord = async (recordId) => {
    try {
      // Get record details
      await getRecordDetails(recordId);

      // Log access for HIPAA compliance
      await hipaaComplianceService.createAuditLog("RECORD_VIEW", {
        action: "VIEW",
        recordId,
        timestamp: new Date().toISOString(),
      });

      // Set the viewing record
      setViewingRecord(recordId);
    } catch (err) {
      console.error("Error viewing record:", err);
    }
  };

  // Handle record download
  const handleDownloadRecord = async (recordId) => {
    await downloadRecord(recordId);
  };

  // Handle share record
  const handleShareRecord = async (recordId) => {
    // Log the share attempt for HIPAA compliance
    await hipaaComplianceService.createAuditLog("RECORD_SHARE_ATTEMPT", {
      action: "SHARE",
      recordId,
      timestamp: new Date().toISOString(),
    });

    // Verify consent before sharing
    const hasConsent = await hipaaComplianceService.verifyConsent(
      hipaaComplianceService.CONSENT_TYPES.DATA_SHARING
    );

    if (!hasConsent) {
      return;
    }
  };

  // Close the record viewer
  const closeViewer = () => {
    setViewingRecord(null);
  };

  // Group records by category
  const groupedRecords = userRecords.reduce((groups, record) => {
    const category = record.category || "Uncategorized";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(record);
    return groups;
  }, {});

  // Loading state
  if (loading && userRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-auto text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <AlertCircle size={16} />
          </button>
        </div>
        <button
          onClick={fetchHealthData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (userRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>
        <div className="text-center py-8 bg-blue-50 rounded-lg">
          <FileText className="w-12 h-12 text-blue-300 mx-auto mb-3" />
          <p className="text-blue-700 mb-2">
            You don't have any health records yet
          </p>
          <button
            onClick={() => (window.location.href = "/upload")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Upload Your First Record
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-6">Your Health Records</h2>

      {/* Record viewer modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Health Record Details</h3>
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
              <HipaaCompliantDataViewer
                dataId={viewingRecord}
                dataType="patientRecord"
                accessPurpose="Viewing personal health record"
                onError={(errorMsg) =>
                  console.error("HIPAA viewer error:", errorMsg)
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Records by category */}
      <div className="space-y-6">
        {Object.entries(groupedRecords).map(([category, records]) => (
          <div key={category}>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((record) => (
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
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {record.description || `${category} health data record`}
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
                      {new Date(record.uploadDate).toLocaleDateString()}
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
                      onClick={() => handleDownloadRecord(record.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-800"
                    >
                      <Download size={14} />
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
          </div>
        ))}
      </div>

      {/* Load more button */}
      {userRecords.length > 6 && (
        <div className="mt-6 text-center">
          <button
            onClick={fetchHealthData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Load More Records
          </button>
        </div>
      )}
    </div>
  );
};

HealthDataSection.propTypes = {
  walletAddress: PropTypes.string,
  userRole: PropTypes.string,
};

export default HealthDataSection;
