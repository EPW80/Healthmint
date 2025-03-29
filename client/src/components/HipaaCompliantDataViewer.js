// src/components/HipaaCompliantDataViewer.js
import React, { useState, useEffect, useCallback } from "react";
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
  List,
} from "lucide-react";

/**
 * HIPAA Compliant Data Viewer Component
 *
 * Displays health data with proper HIPAA compliance measures:
 * - Audit logging of all data access with field-level tracking
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
  const [accessedFields, setAccessedFields] = useState(new Set());
  const [expandedFields, setExpandedFields] = useState(new Set());

  // Track field access for audit purposes
  const trackFieldAccess = useCallback(
    (fieldPath) => {
      setAccessedFields((prev) => {
        const updated = new Set(prev);
        updated.add(fieldPath);
        return updated;
      });

      // Log field access in HIPAA audit trail
      hipaa.logFieldAccess(dataId, fieldPath, accessPurpose);
    },
    [dataId, accessPurpose, hipaa]
  );

  // Toggle field expansion to track which fields are viewed
  const toggleFieldExpansion = useCallback(
    (fieldPath) => {
      // Track this field access
      trackFieldAccess(fieldPath);

      setExpandedFields((prev) => {
        const updated = new Set(prev);
        if (updated.has(fieldPath)) {
          updated.delete(fieldPath);
        } else {
          updated.add(fieldPath);
        }
        return updated;
      });
    },
    [trackFieldAccess]
  );

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

        // 2. Log the data access attempt for HIPAA audit trail with enhanced metadata
        await hipaa.logDataAccess(dataId, accessPurpose, "VIEW", {
          dataType: dataType,
          timestamp: new Date().toISOString(),
          requesterInfo: hipaa.getUserInfo(),
          accessMethod: "UI_COMPONENT",
          sourceIP: "client", // Server will capture the actual IP
          sensitiveDataRequested: showSensitiveData,
          accessOutcome: "GRANTED",
        });

        // 3. Sanitize and prepare data for viewing
        const sanitizedData = hipaa.sanitizeData(data, {
          mode: showSensitiveData ? "default" : "mask",
          accessPurpose: accessPurpose,
        });

        // 4. Verify data is properly de-identified if not showing sensitive data
        const deIdVerification = hipaa.verifyDeIdentification(sanitizedData);
        setVerificationIssues(deIdVerification.issues);

        // Set the data and access status
        setViewableData(sanitizedData);
        setAccessGranted(true);
        setAccessVerified(true);

        // 5. Immediately track root level data access
        trackFieldAccess("root");
      } catch (err) {
        console.error("HIPAA compliance error:", err);
        setAccessGranted(false);

        // Log denied access attempt for compliance
        hipaa.logDataAccess(dataId, accessPurpose, "VIEW", {
          dataType: dataType,
          timestamp: new Date().toISOString(),
          requesterInfo: hipaa.getUserInfo(),
          accessMethod: "UI_COMPONENT",
          accessOutcome: "DENIED",
          denialReason: err.message,
        });

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
    trackFieldAccess,
  ]);

  // Toggle sensitive data visibility
  const toggleSensitiveData = async () => {
    try {
      // If toggling to show sensitive data, verify consent again
      if (!showSensitiveData) {
        const hasConsent = await hipaa.verifyConsent(
          hipaa.service.CONSENT_TYPES.DATA_SHARING,
          {
            requestReason: "Displaying sensitive health information",
            requestDateTime: new Date().toISOString(),
            dataId: dataId,
            dataType: dataType,
          }
        );

        if (!hasConsent) {
          throw new Error("You must provide consent to view sensitive data");
        }

        // Log this enhanced access
        await hipaa.logDataAccess(
          dataId,
          `${accessPurpose} - Viewing sensitive data`,
          "VIEW_SENSITIVE",
          {
            sensitiveDataRequested: true,
            consentVerified: true,
            fields: Array.from(accessedFields),
          }
        );
      } else {
        // Log toggling off sensitive data
        await hipaa.logDataAccess(
          dataId,
          `${accessPurpose} - Masking sensitive data`,
          "MASK_SENSITIVE",
          {
            sensitiveDataRequested: false,
          }
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
      // Verify consent for downloading with enhanced metadata
      const hasConsent = await hipaa.verifyConsent(
        hipaa.service.CONSENT_TYPES.DATA_SHARING,
        {
          requestReason: "Downloading health information",
          requestDateTime: new Date().toISOString(),
          dataId: dataId,
          dataType: dataType,
          accessLevel: showSensitiveData ? "SENSITIVE" : "MASKED",
        }
      );

      if (!hasConsent) {
        throw new Error(
          "You must provide explicit consent to download this data"
        );
      }

      // Log the download action with comprehensive details
      await hipaa.logDataAccess(
        dataId,
        `${accessPurpose} - Data download`,
        "DOWNLOAD",
        {
          timestamp: new Date().toISOString(),
          fieldsAccessed: Array.from(accessedFields),
          sensitiveDataIncluded: showSensitiveData,
          downloadFormat: "JSON",
          userAuthenticated: true,
          consentVerified: true,
          ipAddress: "client", // Server will capture actual IP
        }
      );

      // Generate download content (with appropriate sanitization if needed)
      const downloadContent = JSON.stringify(
        hipaa.sanitizeData(data, {
          mode: showSensitiveData ? "default" : "mask",
          accessPurpose: `${accessPurpose} - Download`,
          includeAuditMetadata: true, // Include audit metadata in the file itself
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

      // Log failed download attempt
      hipaa.logDataAccess(
        dataId,
        `${accessPurpose} - Failed download attempt`,
        "DOWNLOAD_FAILED",
        {
          timestamp: new Date().toISOString(),
          errorMessage: err.message,
          sensitiveDataRequested: showSensitiveData,
        }
      );

      onError?.(err.message);
    }
  };

  // Renders a data field with tracking capability
  const renderDataField = (key, value, path = "") => {
    const currentPath = path ? `${path}.${key}` : key;
    const isExpanded = expandedFields.has(currentPath);

    if (typeof value === "object" && value !== null) {
      return (
        <div key={currentPath} className="mb-2">
          <div
            className="flex items-center cursor-pointer text-blue-700 hover:text-blue-900"
            onClick={() => toggleFieldExpansion(currentPath)}
          >
            <span className={`mr-1 ${isExpanded ? "transform rotate-90" : ""}`}>
              ▶
            </span>
            <span className="font-medium">{key}: </span>
          </div>

          {isExpanded && (
            <div className="pl-4 border-l border-gray-200 mt-1">
              {Array.isArray(value)
                ? value.map((item, index) =>
                    renderDataField(index, item, currentPath)
                  )
                : Object.keys(value).map((k) =>
                    renderDataField(k, value[k], currentPath)
                  )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={currentPath}
        className="mb-1"
        onClick={() => trackFieldAccess(currentPath)}
      >
        <span className="font-medium">{key}: </span>
        <span>{String(value)}</span>
      </div>
    );
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

        {/* Field access counter - helps with HIPAA auditing */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-center">
          <List className="h-4 w-4 text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">
            {accessedFields.size} data fields accessed during this session
          </span>
        </div>

        {/* The actual data display with field-level tracking */}
        <div className="rounded-md border border-gray-200 p-4 bg-gray-50 overflow-auto">
          {viewableData ? (
            <div className="text-sm">
              {Object.keys(viewableData).map((key) =>
                renderDataField(key, viewableData[key])
              )}
            </div>
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
        <p className="mt-1">
          All field-level access is tracked for security and compliance
          purposes. Last accessed: {new Date().toLocaleString()}
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
