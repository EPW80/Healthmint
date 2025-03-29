// src/components/HipaaCompliantDataViewer.js
import React, { useState, useEffect, useRef } from "react";
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
  Info,
  FileText,
  Clock,
  User,
} from "lucide-react";

/**
 * HIPAA Compliant Data Viewer Component
 *
 * Enhanced version with improved audit logging for data field access
 * Displays health data with proper HIPAA compliance measures:
 * - Detailed audit logging of all data access including field-level tracking
 * - Explicit consent verification
 * - Comprehensive PHI protection
 * - De-identification where needed
 */
const HipaaCompliantDataViewer = ({
  dataId,
  dataType,
  accessPurpose = "Viewing health record",
  data,
  onError,
  userId,
  sessionId,
}) => {
  // Get HIPAA compliance functionality from context
  const hipaa = useHipaaContext();

  // Local state
  const [viewableData, setViewableData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [verificationIssues, setVerificationIssues] = useState([]);

  // Track which fields have been viewed for audit purposes
  const [viewedFields, setViewedFields] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Track consent state
  const [hasConsent, setHasConsent] = useState(false);
  const [consentPromptOpen, setConsentPromptOpen] = useState(false);

  // Audit logs
  const viewStartTime = useRef(new Date());
  const accessSession = useRef(
    sessionId ||
      `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );
  const deviceInfo = useRef({
    userAgent: navigator.userAgent,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Handle data access verification on component mount
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // 1. Create initial view audit log with detailed context
        await hipaa.createAuditLog("PHI_VIEW_INITIATED", {
          recordId: dataId,
          recordType: dataType,
          purpose: accessPurpose,
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
          userId: userId || "anonymous",
          deviceInfo: JSON.stringify(deviceInfo.current),
          applicationVersion: process.env.REACT_APP_VERSION || "unknown",
          accessMethod: "HipaaCompliantDataViewer",
        });

        // 2. Validate if this access is permitted with enhanced validation
        const accessValidation = hipaa.validateDataAccess(
          dataType,
          accessPurpose,
          {
            requireExplicitConsent: dataType.includes("sensitive"),
            validateMinimumNecessary: true,
            verifyRoleBasedAccess: true,
          }
        );

        if (!accessValidation.isPermitted) {
          // If we need consent and auto-request is not enabled
          if (
            accessValidation.requiresConsent &&
            !hipaa.verifyConsent(accessValidation.consentType)
          ) {
            setConsentPromptOpen(true);
            throw new Error("Access denied: Required consent not provided");
          }

          throw new Error(
            `Access denied: ${accessValidation.actions.join(", ")} required`
          );
        }

        // 3. Log the data access attempt for HIPAA audit trail with field-level tracking
        await hipaa.logDataAccess(dataId, accessPurpose, "VIEW", {
          recordType: dataType,
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
          initialAccess: true,
          dataFields: Object.keys(data || {}).join(","),
          sensitiveFieldsRequested: showSensitiveData,
        });

        // Store the raw data separately for sensitivity control
        setRawData(data);

        // 4. Sanitize and prepare data for viewing with enhanced options
        const sensitivityLevel = showSensitiveData ? "restricted" : "default";
        const sanitizedData = hipaa.sanitizeData(data, {
          mode: showSensitiveData ? "default" : "mask",
          sensitivityLevel: sensitivityLevel,
          retainStructure: true,
          fieldLevelControl: true,
        });

        // 5. Verify data is properly de-identified if not showing sensitive data
        const deIdVerification = hipaa.verifyDeIdentification(sanitizedData, {
          strictMode: !showSensitiveData,
          validateSafeHarbor: true,
          checkIdentifiers: true,
        });

        setVerificationIssues(deIdVerification.issues);

        // 6. Record which fields are initially visible
        const initialFields = getTopLevelFields(sanitizedData);
        setViewedFields(new Set(initialFields));

        // Set the data and access status
        setViewableData(sanitizedData);
        setAccessGranted(true);
        setAccessVerified(true);

        // Record consent status
        const consentStatus = await hipaa.verifyConsent(
          hipaa.service.CONSENT_TYPES.DATA_SHARING
        );
        setHasConsent(consentStatus);
      } catch (err) {
        console.error("HIPAA compliance error:", err);
        setAccessGranted(false);

        // Log the access denial
        await hipaa.createAuditLog("PHI_ACCESS_DENIED", {
          recordId: dataId,
          recordType: dataType,
          reason: err.message,
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
        });

        hipaa.clearError();
        onError?.(err.message);
      }
    };

    verifyAccess();

    // Create closure audit record when component unmounts
    return async () => {
      const viewDurationMs = new Date() - viewStartTime.current;

      try {
        await hipaa.createAuditLog("PHI_VIEW_COMPLETED", {
          recordId: dataId,
          recordType: dataType,
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
          viewDurationMs,
          fieldsViewed: Array.from(viewedFields).join(","),
          sensitiveDataAccessed: showSensitiveData,
        });
      } catch (error) {
        console.error("Failed to log view completion:", error);
      }
    };
  }, [
    dataId,
    dataType,
    accessPurpose,
    data,
    hipaa,
    showSensitiveData,
    onError,
    userId,
  ]);

  // Helper to get top level fields from an object
  const getTopLevelFields = (data) => {
    if (!data) return [];
    return Object.keys(data);
  };

  // Log field access when a section is expanded
  const logFieldAccess = async (field, value, path = "") => {
    // Build the full path to this field
    const fullPath = path ? `${path}.${field}` : field;

    // Check if this field has already been viewed to avoid duplicate logs
    if (!viewedFields.has(fullPath)) {
      // Add to viewed fields
      setViewedFields((prev) => new Set([...prev, fullPath]));

      try {
        // Log the field-level access
        await hipaa.createAuditLog("PHI_FIELD_ACCESS", {
          recordId: dataId,
          recordType: dataType,
          field: fullPath,
          fieldType: typeof value,
          isSensitive: hipaa.isSensitiveField(field),
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
        });
      } catch (error) {
        console.error(`Failed to log access to field ${fullPath}:`, error);
      }
    }

    // Toggle the expanded state for this section if it's an object or array
    if (typeof value === "object" && value !== null) {
      setExpandedSections((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(fullPath)) {
          newSet.delete(fullPath);
        } else {
          newSet.add(fullPath);
        }
        return newSet;
      });
    }
  };

  // Toggle sensitive data visibility with explicit consent check
  const toggleSensitiveData = async () => {
    try {
      // If toggling to show sensitive data, verify consent again
      if (!showSensitiveData) {
        const hasConsent = await hipaa.verifyConsent(
          hipaa.service.CONSENT_TYPES.DATA_SHARING,
          {
            requireExplicit: true,
            enforceLatestVersion: true,
            validateExpiration: true,
          }
        );

        if (!hasConsent) {
          setConsentPromptOpen(true);
          throw new Error("You must provide consent to view sensitive data");
        }

        // Log this enhanced access with detailed purpose
        await hipaa.logDataAccess(
          dataId,
          `${accessPurpose} - Viewing sensitive data`,
          "VIEW_SENSITIVE",
          {
            recordType: dataType,
            sensitiveAccess: true,
            timestamp: new Date().toISOString(),
            accessReason: "User explicitly requested sensitive data view",
            accessSession: accessSession.current,
          }
        );
      } else {
        // Log stepping down from sensitive view
        await hipaa.createAuditLog("PHI_SENSITIVITY_DECREASED", {
          recordId: dataId,
          recordType: dataType,
          timestamp: new Date().toISOString(),
          accessSession: accessSession.current,
        });
      }

      // Toggle the state
      setShowSensitiveData(!showSensitiveData);

      // Re-sanitize data based on the new sensitivity setting
      if (rawData) {
        const sensitivityLevel = !showSensitiveData ? "restricted" : "default";
        const sanitizedData = hipaa.sanitizeData(rawData, {
          mode: !showSensitiveData ? "default" : "mask",
          sensitivityLevel: sensitivityLevel,
          retainStructure: true,
          fieldLevelControl: true,
        });

        setViewableData(sanitizedData);
      }
    } catch (err) {
      console.error("Error toggling sensitive data:", err);
      onError?.(err.message);
    }
  };

  // Handle data download with enhanced HIPAA compliance
  const handleDownload = async () => {
    try {
      // Enhanced consent verification with explicit purpose
      const consentVerification = await hipaa.verifyConsent(
        hipaa.service.CONSENT_TYPES.DATA_SHARING,
        {
          requireExplicit: true,
          enforceLatestVersion: true,
          validateExpiration: true,
          purpose: "data_download",
          recordType: dataType,
        }
      );

      if (!consentVerification) {
        setConsentPromptOpen(true);
        throw new Error(
          "You must provide explicit consent to download this data"
        );
      }

      // Log the download action with comprehensive metadata
      await hipaa.logDataAccess(
        dataId,
        `${accessPurpose} - Data download`,
        "DOWNLOAD",
        {
          recordType: dataType,
          timestamp: new Date().toISOString(),
          downloadFormat: "JSON",
          sensitiveDataIncluded: showSensitiveData,
          downloadReason: accessPurpose,
          userDevice: navigator.userAgent,
          accessSession: accessSession.current,
          fieldsIncluded: Object.keys(viewableData || {}).join(","),
        }
      );

      // Generate download content with appropriate sanitization if needed
      const downloadContent = JSON.stringify(
        hipaa.sanitizeData(rawData || data, {
          mode: showSensitiveData ? "default" : "mask",
          sensitivityLevel: showSensitiveData ? "restricted" : "default",
          metadataMode: "include", // Include audit metadata in download
          includeTimestamp: true,
          generateDownloadId: true,
        }),
        null,
        2
      );

      // Create download link
      const blob = new Blob([downloadContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `healthdata-${dataId}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log download completion
      await hipaa.createAuditLog("PHI_DOWNLOAD_COMPLETED", {
        recordId: dataId,
        recordType: dataType,
        timestamp: new Date().toISOString(),
        accessSession: accessSession.current,
        downloadSize: downloadContent.length,
        fieldsIncluded: Object.keys(viewableData || {}).join(","),
      });
    } catch (err) {
      console.error("Download error:", err);
      onError?.(err.message);

      // Log download failure
      await hipaa.createAuditLog("PHI_DOWNLOAD_FAILED", {
        recordId: dataId,
        recordType: dataType,
        timestamp: new Date().toISOString(),
        accessSession: accessSession.current,
        error: err.message,
      });
    }
  };

  // Request and record consent
  const requestConsent = async () => {
    try {
      const consentGranted = await hipaa.requestConsent(
        hipaa.service.CONSENT_TYPES.DATA_SHARING,
        {
          recordType: dataType,
          purpose: showSensitiveData ? "view_sensitive" : "view_record",
          explicitAction: true,
          recordMetadata: {
            recordId: dataId,
            accessSession: accessSession.current,
            timestamp: new Date().toISOString(),
          },
        }
      );

      if (consentGranted) {
        setHasConsent(true);
        setConsentPromptOpen(false);

        // Re-attempt verification after consent
        const accessValidation = hipaa.validateDataAccess(
          dataType,
          accessPurpose
        );

        if (accessValidation.isPermitted) {
          setAccessGranted(true);
          setAccessVerified(true);
        }
      }
    } catch (error) {
      console.error("Consent request error:", error);
      onError?.(error.message);
    }
  };

  // Recursive component to render nested data with field-level tracking
  const DataField = ({ field, value, path = "", depth = 0 }) => {
    const fullPath = path ? `${path}.${field}` : field;
    const isExpanded = expandedSections.has(fullPath);
    const isObject = typeof value === "object" && value !== null;

    // Check if this is a sensitive field
    const isSensitive = hipaa.isSensitiveField
      ? hipaa.isSensitiveField(field)
      : [
          "ssn",
          "dob",
          "phone",
          "address",
          "email",
          "name",
          "mrn",
          "patient",
        ].some((term) => field.toLowerCase().includes(term));

    return (
      <div
        className={`pl-${depth * 4} pb-1 ${isSensitive ? "bg-yellow-50" : ""}`}
      >
        <div
          className={`flex items-center cursor-pointer py-1 ${isSensitive ? "font-medium text-yellow-800" : ""}`}
          onClick={() => logFieldAccess(field, value, path)}
        >
          {isObject && <span className="mr-2">{isExpanded ? "▼" : "►"}</span>}
          <span className="font-semibold mr-2">{field}:</span>
          {isObject ? (
            <span className="text-gray-500 italic">
              {Array.isArray(value) ? `Array(${value.length})` : "Object"}
            </span>
          ) : (
            <span>{String(value)}</span>
          )}
          {isSensitive && <Shield className="ml-2 w-4 h-4 text-yellow-500" />}
        </div>

        {isObject && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 pl-2">
            {Array.isArray(value)
              ? value.map((item, index) => (
                  <div key={index} className="py-1">
                    {typeof item === "object" && item !== null ? (
                      <div>
                        <div className="font-medium">[{index}]</div>
                        <div className="ml-4">
                          {Object.entries(item).map(([k, v]) => (
                            <DataField
                              key={k}
                              field={k}
                              value={v}
                              path={`${fullPath}[${index}]`}
                              depth={depth + 1}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium mr-2">[{index}]:</span>
                        <span>{String(item)}</span>
                      </div>
                    )}
                  </div>
                ))
              : Object.entries(value).map(([k, v]) => (
                  <DataField
                    key={k}
                    field={k}
                    value={v}
                    path={fullPath}
                    depth={depth + 1}
                  />
                ))}
          </div>
        )}
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

        {consentPromptOpen && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">
              Consent Required
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              This data requires your explicit consent before access. By
              consenting, you acknowledge that:
            </p>
            <ul className="list-disc text-sm text-yellow-700 pl-5 mb-3">
              <li>Your consent will be recorded and audited</li>
              <li>This access is for the purpose: {accessPurpose}</li>
              <li>You can revoke consent at any time in privacy settings</li>
            </ul>
            <button
              onClick={requestConsent}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
            >
              Provide Consent
            </button>
          </div>
        )}
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
              disabled={!hasConsent}
              title={
                !hasConsent ? "Consent required for download" : "Download data"
              }
            >
              <Download className="h-4 w-4 mr-1" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Enhanced Compliance Status */}
        <div className="mt-2 text-xs text-blue-700">
          <div className="flex items-center">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            <span>
              Access logged for HIPAA compliance. Purpose: {accessPurpose}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <Clock className="h-3.5 w-3.5 mr-1" />
            <span>
              View started: {viewStartTime.current.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <User className="h-3.5 w-3.5 mr-1" />
            <span>Session ID: {accessSession.current.substring(0, 10)}...</span>
          </div>
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

        {/* Access Metadata Summary */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-600 mr-1 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-blue-700">
                Data Access Information
              </h5>
              <div className="text-xs text-blue-600 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Record ID:</span> {dataId}
                  </div>
                  <div>
                    <span className="font-medium">Record Type:</span> {dataType}
                  </div>
                  <div>
                    <span className="font-medium">Access Purpose:</span>{" "}
                    {accessPurpose}
                  </div>
                  <div>
                    <span className="font-medium">Sensitivity Level:</span>{" "}
                    {showSensitiveData ? "Full Access" : "Restricted"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fields accessed summary */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-gray-500 mr-1 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-gray-700">
                Fields Accessed
              </h5>
              <div className="text-xs text-gray-600 mt-1">
                <p className="mb-1">Total fields viewed: {viewedFields.size}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.from(viewedFields)
                    .slice(0, 5)
                    .map((field, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-gray-200 rounded-full text-gray-700"
                      >
                        {field}
                      </span>
                    ))}
                  {viewedFields.size > 5 && (
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-gray-700">
                      +{viewedFields.size - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The actual data display with interactive tracking */}
        <div className="rounded-md border border-gray-200 p-4 bg-gray-50 overflow-auto">
          {viewableData ? (
            <div>
              <p className="text-sm text-gray-700 mb-3">
                Click on fields to expand/collapse sections. All field access is
                logged for HIPAA compliance.
              </p>
              <div className="bg-white p-4 rounded-md border border-gray-100">
                {Object.entries(viewableData).map(([field, value]) => (
                  <DataField key={field} field={field} value={value} />
                ))}
              </div>
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
          Access session: {accessSession.current.substring(0, 10)}... | Fields
          viewed: {viewedFields.size} | Sensitivity level:{" "}
          {showSensitiveData ? "Full" : "Restricted"}
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
  userId: PropTypes.string,
  sessionId: PropTypes.string,
};

export default HipaaCompliantDataViewer;
