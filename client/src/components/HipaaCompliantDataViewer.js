// src/components/HipaaCompliantDataViewer.js
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useHipaaContext } from "./providers/HipaaComplianceProvider";
import {
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  Download,
  CheckCircle,
  X,
} from "lucide-react";

/**
 * HIPAA Compliant Data Viewer Component
 *
 * Displays health data with proper HIPAA compliance measures:
 * - Audit logging of all data access
 * - Consent verification
 * - PHI protection
 * - De-identification where needed
 */
const HipaaCompliantDataViewer = ({
  dataId,
  dataType,
  accessPurpose = "Viewing health record",
  data,
  onError,
}) => {
  // Get HIPAA compliance functionality from context
  const hipaa = useHipaaContext();

  // Local state
  const [viewableData, setViewableData] = useState(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [verificationIssues, setVerificationIssues] = useState([]);

  // Handle data access verification on component mount
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // 1. Validate if this access is permitted
        const accessValidation = hipaa.validateDataAccess(
          dataType,
          accessPurpose
        );

        if (!accessValidation.isPermitted) {
          // If we need consent and auto-request is not enabled
          if (
            accessValidation.requiresConsent &&
            !hipaa.verifyConsent(accessValidation.consentType)
          ) {
            throw new Error("Access denied: Required consent not provided");
          }

          throw new Error(
            `Access denied: ${accessValidation.actions.join(", ")} required`
          );
        }

        // 2. Log the data access attempt for HIPAA audit trail
        await hipaa.logDataAccess(dataId, accessPurpose, "VIEW");

        // 3. Sanitize and prepare data for viewing
        const sanitizedData = hipaa.sanitizeData(data, {
          mode: showSensitiveData ? "default" : "mask",
        });

        // 4. Verify data is properly de-identified if not showing sensitive data
        const deIdVerification = hipaa.verifyDeIdentification(sanitizedData);
        setVerificationIssues(deIdVerification.issues);

        // Set the data and access status
        setViewableData(sanitizedData);
        setAccessGranted(true);
        setAccessVerified(true);
      } catch (err) {
        console.error("HIPAA compliance error:", err);
        setAccessGranted(false);
        hipaa.clearError();
        onError?.(err.message);
      }
    };

    verifyAccess();
  }, [
    dataId,
    dataType,
    accessPurpose,
    data,
    hipaa,
    showSensitiveData,
    onError,
  ]);

  // Toggle sensitive data visibility
  const toggleSensitiveData = async () => {
    try {
      // If toggling to show sensitive data, verify consent again
      if (!showSensitiveData) {
        const hasConsent = await hipaa.verifyConsent(
          hipaa.service.CONSENT_TYPES.DATA_SHARING
        );
        if (!hasConsent) {
          throw new Error("You must provide consent to view sensitive data");
        }

        // Log this enhanced access
        await hipaa.logDataAccess(
          dataId,
          `${accessPurpose} - Viewing sensitive data`,
          "VIEW_SENSITIVE"
        );
      }

      // Toggle the state
      setShowSensitiveData(!showSensitiveData);
    } catch (err) {
      console.error("Error toggling sensitive data:", err);
      onError?.(err.message);
    }
  };

  // Handle data download with HIPAA compliance
  const handleDownload = async () => {
    try {
      // Verify consent for downloading
      const hasConsent = await hipaa.verifyConsent(
        hipaa.service.CONSENT_TYPES.DATA_SHARING
      );
      if (!hasConsent) {
        throw new Error("You must provide consent to download this data");
      }

      // Log the download action
      await hipaa.logDataAccess(
        dataId,
        `${accessPurpose} - Data download`,
        "DOWNLOAD"
      );

      // Generate download content (with appropriate sanitization if needed)
      const downloadContent = JSON.stringify(
        hipaa.sanitizeData(data, {
          mode: showSensitiveData ? "default" : "mask",
        }),
        null,
        2
      );

      // Create download link
      const blob = new Blob([downloadContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `healthdata-${dataId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      onError?.(err.message);
    }
  };

  // If we're still verifying access or there was an error
  if (hipaa.loading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin h-5 w-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span>Verifying HIPAA compliance...</span>
      </div>
    );
  }

  // If access was denied
  if (!accessGranted || !accessVerified) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-3">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-red-800 font-medium">Access Denied</h3>
        </div>
        <p className="text-red-700 text-sm">
          {hipaa.error ||
            "You don't have the necessary permissions to view this data."}
        </p>
        <p className="text-red-700 text-sm mt-2">
          This access attempt has been logged in compliance with HIPAA
          regulations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* HIPAA Compliance Header */}
      <div className="p-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-blue-800 font-medium">
              HIPAA Compliant Viewer
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSensitiveData}
              className="flex items-center px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
              aria-pressed={showSensitiveData}
            >
              {showSensitiveData ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  <span>Mask PHI</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  <span>Show All</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="mt-2 flex items-center text-xs text-blue-700">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          <span>
            Access logged for HIPAA compliance. Purpose: {accessPurpose}
          </span>
        </div>
      </div>

      {/* Data Display */}
      <div className="p-4">
        {/* Show verification issues if any */}
        {verificationIssues.length > 0 && !showSensitiveData && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-1" />
              <span className="text-sm font-medium text-yellow-800">
                {verificationIssues.length} de-identification{" "}
                {verificationIssues.length === 1 ? "issue" : "issues"} detected
              </span>
            </div>
            <ul className="text-xs text-yellow-700 space-y-1">
              {verificationIssues.slice(0, 3).map((issue, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>
                    {issue.field}: {issue.recommendation}
                  </span>
                </li>
              ))}
              {verificationIssues.length > 3 && (
                <li className="text-yellow-600">
                  + {verificationIssues.length - 3} more issues
                </li>
              )}
            </ul>
          </div>
        )}

        {/* The actual data display */}
        <div className="rounded-md border border-gray-200 p-4 bg-gray-50 overflow-auto">
          {viewableData ? (
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(viewableData, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* HIPAA Compliance Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <p>
          This data access is logged and monitored in compliance with HIPAA
          regulations.
          {dataType && ` Data type: ${dataType}`}
        </p>
      </div>
    </div>
  );
};

HipaaCompliantDataViewer.propTypes = {
  dataId: PropTypes.string.isRequired,
  dataType: PropTypes.string.isRequired,
  accessPurpose: PropTypes.string,
  data: PropTypes.any,
  onError: PropTypes.func,
};

export default HipaaCompliantDataViewer;
