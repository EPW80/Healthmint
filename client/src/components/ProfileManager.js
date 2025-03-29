// src/components/ProfileManager.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import {
  Save,
  Lock,
  Bell,
  UserCheck,
  FileText,
  Database,
  Award,
  Briefcase,
  AlertCircle,
  X,
  CheckCircle,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import ProfileImageUploader from "./ProfileImageUploader.js";
import ProfileTabs from "./ProfileTabs.js";
import userService from "../services/userService.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * Enhanced sanitization function for HIPAA compliance
 * Consistently handles PHI and sensitive data
 */
const sanitizeUserData = (data, options = {}) => {
  // Default options
  const config = {
    excludeFields: ["password", "walletType"],
    sensitiveFields: [
      "email",
      "age",
      "dob",
      "address",
      "phone",
      "medicalHistory",
    ],
    maskSensitiveData: false,
    retainAuditFields: true,
    ...options,
  };

  // Clone data to avoid modifying the original
  const sanitizedData = { ...data };

  // Track all fields processed for audit purposes
  const processedFields = [];

  // Remove excluded fields
  if (config.excludeFields && config.excludeFields.length > 0) {
    config.excludeFields.forEach((field) => {
      if (sanitizedData.hasOwnProperty(field)) {
        delete sanitizedData[field];
        processedFields.push({ field, action: "excluded" });
      }
    });
  }

  // Handle sensitive fields
  if (config.sensitiveFields && config.sensitiveFields.length > 0) {
    config.sensitiveFields.forEach((field) => {
      if (sanitizedData.hasOwnProperty(field)) {
        if (config.maskSensitiveData) {
          // Mask the data
          const value = sanitizedData[field];
          if (typeof value === "string") {
            sanitizedData[field] = value.replace(/./g, "*");
          } else if (typeof value === "number") {
            sanitizedData[field] = 0;
          }
          processedFields.push({ field, action: "masked" });
        } else {
          processedFields.push({ field, action: "included" });
        }
      }
    });
  }

  // Add sanitization metadata for audit purposes
  if (config.retainAuditFields) {
    sanitizedData._sanitizationMetadata = {
      timestamp: new Date().toISOString(),
      processedFields,
      maskingApplied: config.maskSensitiveData,
      fieldCount: Object.keys(sanitizedData).length,
    };
  }

  return sanitizedData;
};

/**
 * ProfileManager Component
 *
 * A unified profile management interface for both patients and researchers
 * that maintains HIPAA compliance throughout with enhanced data sanitization
 */
const ProfileManager = () => {
  const dispatch = useDispatch();
  const userRole = useSelector(selectRole);
  const userProfile = useSelector((state) => state.user.profile || {});
  const walletAddress = useSelector((state) => state.wallet.address);

  // User session identifier for audit logging
  const sessionId = useMemo(
    () =>
      `profile-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  // Enhanced state tracking
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(
    userProfile?.profileImage || null
  );
  const [storageReference, setStorageReference] = useState(
    userProfile?.profileImageHash || null
  );
  const [tabValue, setTabValue] = useState(0);
  const [initialFormState, setInitialFormState] = useState({});
  const [formState, setFormState] = useState({
    name: userProfile?.name || "",
    email: userProfile?.email || "",
    age: userProfile?.age || "",
    bio: userProfile?.bio || "",
    sharingPreferences: userProfile?.sharingPreferences || {
      anonymousSharing: true,
      notifyOnAccess: true,
      allowDirectContact: false,
    },
    emailNotifications: userProfile?.emailNotifications || {
      dataAccess: true,
      transactions: true,
      updates: false,
    },
    inAppNotifications: userProfile?.inAppNotifications || {
      messages: true,
      dataUpdates: true,
      announcements: false,
    },
    notificationPreferences: userProfile?.notificationPreferences || {
      accessAlerts: true,
      transactionAlerts: true,
      researchUpdates: false,
      newDatasets: true,
    },
    privacyPreferences: userProfile?.privacyPreferences || {
      publicProfile: false,
      showInstitution: true,
    },
    ethicsStatement: userProfile?.ethicsStatement || "",
    ethicsAgreement: userProfile?.ethicsAgreement || false,
    institution: userProfile?.institution || "",
    credentials: userProfile?.credentials || "",
    researchFocus: userProfile?.researchFocus || "",
    publications: userProfile?.publications || [],
  });

  // Track data access for audit purposes
  const [fieldsAccessed, setFieldsAccessed] = useState(new Set());
  const [dataRequests, setDataRequests] = useState([]);
  const [hasSensitiveChanges, setHasSensitiveChanges] = useState(false);

  // Track form validation state
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

  // Load user profile data on mount with enhanced HIPAA compliance
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);

        // Create HIPAA-compliant audit log for profile access with detailed context
        await hipaaComplianceService.createAuditLog("PROFILE_ACCESS", {
          action: "VIEW",
          userId: walletAddress,
          userRole,
          timestamp: new Date().toISOString(),
          sessionId,
          component: "ProfileManager",
          browser: navigator.userAgent,
          ipAddress: "client-captured", // Actual IP will be captured server-side
          accessType: "full_profile",
          accessReason: "User initiated profile view",
        });

        // Track this request
        setDataRequests((prev) => [
          ...prev,
          {
            type: "profile_fetch",
            timestamp: new Date().toISOString(),
            status: "pending",
          },
        ]);

        const profile = await userService.getCurrentUser();

        // Update data request status
        setDataRequests((prev) =>
          prev.map((req) =>
            req.type === "profile_fetch" && req.status === "pending"
              ? { ...req, status: "success" }
              : req
          )
        );

        if (profile) {
          // Sanitize and log received data
          const sanitizedProfile = hipaaComplianceService.sanitizeData(
            profile,
            {
              logAccess: true,
              userId: walletAddress,
              reason: "Initial profile load",
              sessionId,
            }
          );

          // Add all field names to accessed set for audit
          Object.keys(sanitizedProfile).forEach((field) => {
            setFieldsAccessed((prev) => new Set([...prev, field]));
          });

          // Update form state with profile data
          const updatedFormState = {
            ...formState,
            ...sanitizedProfile,
            // Ensure nested objects are properly merged
            sharingPreferences: {
              ...formState.sharingPreferences,
              ...(sanitizedProfile.sharingPreferences || {}),
            },
            emailNotifications: {
              ...formState.emailNotifications,
              ...(sanitizedProfile.emailNotifications || {}),
            },
            inAppNotifications: {
              ...formState.inAppNotifications,
              ...(sanitizedProfile.inAppNotifications || {}),
            },
            notificationPreferences: {
              ...formState.notificationPreferences,
              ...(sanitizedProfile.notificationPreferences || {}),
            },
            privacyPreferences: {
              ...formState.privacyPreferences,
              ...(sanitizedProfile.privacyPreferences || {}),
            },
          };

          setFormState(updatedFormState);
          setInitialFormState(updatedFormState);

          // Set profile image
          if (sanitizedProfile.profileImage) {
            setPreviewUrl(sanitizedProfile.profileImage);
          }

          if (sanitizedProfile.profileImageHash) {
            setStorageReference(sanitizedProfile.profileImageHash);
          }

          // Log successful profile load
          await hipaaComplianceService.createAuditLog("PROFILE_DATA_LOADED", {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            sessionId,
            fieldsLoaded: Object.keys(sanitizedProfile).join(","),
            hasSensitiveData: Object.keys(sanitizedProfile).some((field) =>
              ["email", "age", "address", "phone"].includes(field)
            ),
          });
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setError("Failed to load your profile. Please try again.");

        // Update data request status
        setDataRequests((prev) =>
          prev.map((req) =>
            req.type === "profile_fetch" && req.status === "pending"
              ? { ...req, status: "error", error: err.message }
              : req
          )
        );

        // Log error for HIPAA compliance
        await hipaaComplianceService.createAuditLog("PROFILE_LOAD_ERROR", {
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          sessionId,
          error: err.message,
        });

        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load your profile. Please try again.",
          })
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    // Cleanup function to log session end
    return async () => {
      try {
        await hipaaComplianceService.createAuditLog("PROFILE_SESSION_END", {
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          sessionId,
          fieldsAccessed: Array.from(fieldsAccessed).join(","),
          sessionDuration: Date.now() - Number(sessionId.split("-")[2]),
          dataRequests: dataRequests.length,
        });
      } catch (error) {
        console.error("Failed to log profile session end:", error);
      }
    };
  }, [
    dispatch,
    walletAddress,
    userProfile.profileImage,
    userProfile.profileImageHash,
    sessionId,
    userRole,
    fieldsAccessed,
    dataRequests,
  ]);

  // Validate form field
  const validateField = useCallback((name, value) => {
    let error = null;

    switch (name) {
      case "email":
        if (value && !/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "age":
        if (
          value &&
          (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 120)
        ) {
          error = "Age must be between 0 and 120";
        }
        break;
      case "name":
        if (!value.trim()) {
          error = "Name is required";
        }
        break;
      default:
        // No validation for other fields
        break;
    }

    return error;
  }, []);

  // Event handlers
  const handleTabChange = useCallback(
    (newValue) => {
      // Log tab change for HIPAA compliance
      hipaaComplianceService.createAuditLog("PROFILE_TAB_CHANGE", {
        previousTab: tabValue,
        newTab: newValue,
        timestamp: new Date().toISOString(),
        sessionId,
        userId: walletAddress,
      });

      setTabValue(newValue);
    },
    [tabValue, sessionId, walletAddress]
  );

  const handleFormChange = useCallback(
    (event) => {
      const { name, value, checked, type } = event.target;

      // Track form field access for HIPAA compliance
      setFieldsAccessed((prev) => new Set([...prev, name]));

      // Mark field as touched for validation
      setFormTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      // Check if this is a sensitive field change
      const sensitiveFields = ["email", "age", "phone", "address"];
      const isSensitiveField = name.includes(".")
        ? sensitiveFields.some((field) => name.includes(field))
        : sensitiveFields.includes(name);

      if (isSensitiveField) {
        setHasSensitiveChanges(true);

        // Log sensitive field edit for HIPAA compliance
        hipaaComplianceService
          .createAuditLog("SENSITIVE_FIELD_EDIT", {
            field: name,
            timestamp: new Date().toISOString(),
            sessionId,
            userId: walletAddress,
            hasChanged: true,
          })
          .catch((err) =>
            console.error("Failed to log sensitive field edit:", err)
          );
      }

      // Update form state based on field type
      if (name.includes(".")) {
        const [parent, child] = name.split(".");
        setFormState((prev) => {
          const updatedState = {
            ...prev,
            [parent]: {
              ...prev[parent],
              [child]: type === "checkbox" ? checked : value,
            },
          };

          // Validate the field
          const fieldError = validateField(
            name,
            type === "checkbox" ? checked : value
          );

          if (fieldError) {
            setFormErrors((prevErrors) => ({
              ...prevErrors,
              [name]: fieldError,
            }));
          } else {
            setFormErrors((prevErrors) => {
              const newErrors = { ...prevErrors };
              delete newErrors[name];
              return newErrors;
            });
          }

          return updatedState;
        });
      } else {
        setFormState((prev) => {
          const updatedState = {
            ...prev,
            [name]: type === "checkbox" ? checked : value,
          };

          // Validate the field
          const fieldError = validateField(
            name,
            type === "checkbox" ? checked : value
          );

          if (fieldError) {
            setFormErrors((prevErrors) => ({
              ...prevErrors,
              [name]: fieldError,
            }));
          } else {
            setFormErrors((prevErrors) => {
              const newErrors = { ...prevErrors };
              delete newErrors[name];
              return newErrors;
            });
          }

          return updatedState;
        });
      }
    },
    [validateField, walletAddress, sessionId]
  );

  const handlePublicationChange = useCallback(
    (newPublications) => {
      setFormState((prev) => ({
        ...prev,
        publications: newPublications,
      }));

      // Log publication change for HIPAA compliance
      hipaaComplianceService
        .createAuditLog("PUBLICATIONS_UPDATED", {
          timestamp: new Date().toISOString(),
          sessionId,
          userId: walletAddress,
          publicationCount: newPublications.length,
        })
        .catch((err) =>
          console.error("Failed to log publication update:", err)
        );

      setFieldsAccessed((prev) => new Set([...prev, "publications"]));
    },
    [sessionId, walletAddress]
  );

  const handleImageUpload = useCallback(
    (reference) => {
      // Log image upload for HIPAA compliance
      hipaaComplianceService.createAuditLog("PROFILE_IMAGE_UPLOAD", {
        action: "UPLOAD",
        timestamp: new Date().toISOString(),
        sessionId,
        userId: walletAddress,
        referenceId: reference,
      });

      setStorageReference(reference);
      setFieldsAccessed(
        (prev) => new Set([...prev, "profileImage", "profileImageHash"])
      );
    },
    [sessionId, walletAddress]
  );

  const handleImageRemove = useCallback(() => {
    // Log image removal for HIPAA compliance
    hipaaComplianceService.createAuditLog("PROFILE_IMAGE_REMOVE", {
      action: "REMOVE",
      timestamp: new Date().toISOString(),
      sessionId,
      userId: walletAddress,
      previousReference: storageReference,
    });

    setPreviewUrl(null);
    setStorageReference(null);
    setFieldsAccessed(
      (prev) => new Set([...prev, "profileImage", "profileImageHash"])
    );
  }, [sessionId, walletAddress, storageReference]);

  // Check for Privacy/Sharing preferences changes
  const havePrivacyPreferencesChanged = useMemo(() => {
    return (
      JSON.stringify(formState.privacyPreferences) !==
        JSON.stringify(initialFormState.privacyPreferences) ||
      JSON.stringify(formState.sharingPreferences) !==
        JSON.stringify(initialFormState.sharingPreferences)
    );
  }, [formState, initialFormState]);

  // Enhanced profile save with consistent sanitization
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate complete form
      const errors = {};

      if (!formState.name) {
        errors.name = "Name is required";
      }

      if (formState.email && !/\S+@\S+\.\S+/.test(formState.email)) {
        errors.email = "Please enter a valid email address";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        throw new Error("Please correct the errors in the form");
      }

      // Create HIPAA-compliant audit log for profile update with detailed tracking
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        action: "UPDATE",
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        sessionId,
        // Track which fields were changed for audit purposes
        changedFields: Object.keys(formState).filter(
          (key) =>
            JSON.stringify(formState[key]) !==
            JSON.stringify(initialFormState[key])
        ),
        hasSensitiveChanges,
        fieldCount: Object.keys(formState).length,
        accessedFields: Array.from(fieldsAccessed).join(","),
      });

      // Track this request
      setDataRequests((prev) => [
        ...prev,
        {
          type: "profile_update",
          timestamp: new Date().toISOString(),
          status: "pending",
        },
      ]);

      // Sanitize data for HIPAA compliance - ensures consistent sanitization
      const sanitizedData = sanitizeUserData(formState, {
        excludeFields: ["password", "walletType"],
        sensitiveFields: ["email", "age", "phone", "address"],
        maskSensitiveData: false,
        retainAuditFields: true,
      });

      // Log the sanitization process
      await hipaaComplianceService.createAuditLog("DATA_SANITIZATION", {
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        sessionId,
        sanitizedFields: sanitizedData._sanitizationMetadata.processedFields
          .map((pf) => `${pf.field}:${pf.action}`)
          .join(","),
      });

      // If changing privacy settings, record HIPAA consent
      if (havePrivacyPreferencesChanged) {
        // Create explicit consent record with detailed metadata
        await hipaaComplianceService.recordConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          true,
          {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            details: "Updated privacy preferences via profile settings",
            consentMethod: "explicit_ui_interaction",
            ipAddress: "client-captured", // Actual IP captured server-side
            browserInfo: navigator.userAgent,
            previousSettings: JSON.stringify({
              privacy: initialFormState.privacyPreferences,
              sharing: initialFormState.sharingPreferences,
            }),
            newSettings: JSON.stringify({
              privacy: formState.privacyPreferences,
              sharing: formState.sharingPreferences,
            }),
            sessionId,
          }
        );

        // Log consent action separately
        await hipaaComplianceService.createAuditLog("PRIVACY_CONSENT_UPDATED", {
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          sessionId,
          consentType: hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          consentAction: "grant",
          consentReason: "profile_privacy_update",
        });
      }

      const updatedProfile = {
        ...userProfile,
        ...sanitizedData,
        profileImage: previewUrl,
        profileImageHash: storageReference,
        lastUpdated: new Date().toISOString(),
      };

      // Update profile with user service
      await userService.updateProfile(updatedProfile);

      // Update data request status
      setDataRequests((prev) =>
        prev.map((req) =>
          req.type === "profile_update" && req.status === "pending"
            ? { ...req, status: "success" }
            : req
        )
      );

      // Update profile in Redux store
      dispatch(updateUserProfile(updatedProfile));

      // Save initial state for future change detection
      setInitialFormState({ ...formState });

      // Reset sensitive changes flag
      setHasSensitiveChanges(false);

      // Log successful update
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE_SUCCESS", {
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        sessionId,
        fieldsUpdated: Object.keys(formState)
          .filter(
            (key) =>
              JSON.stringify(formState[key]) !==
              JSON.stringify(initialFormState[key])
          )
          .join(","),
      });

      setSuccess(true);
      dispatch(
        addNotification({
          type: "success",
          message: "Profile updated successfully",
        })
      );

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err.message || "Failed to update profile. Please try again.");

      // Update data request status
      setDataRequests((prev) =>
        prev.map((req) =>
          req.type === "profile_update" && req.status === "pending"
            ? { ...req, status: "error", error: err.message }
            : req
        )
      );

      // Log error for HIPAA compliance
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE_ERROR", {
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        sessionId,
        error: err.message,
        attemptedFields: Object.keys(formState)
          .filter(
            (key) =>
              JSON.stringify(formState[key]) !==
              JSON.stringify(initialFormState[key])
          )
          .join(","),
      });

      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to update profile. Please try again.",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
        Profile Settings
      </h1>

      {/* Enhanced HIPAA Compliance Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Shield className="text-blue-500 flex-shrink-0 mt-1" size={20} />
        <div>
          <h3 className="font-medium text-blue-700">HIPAA Compliance Notice</h3>
          <p className="text-sm text-blue-600">
            Your profile information is protected in accordance with HIPAA
            regulations. All changes to your profile settings are logged and
            protected with industry-standard security measures.
          </p>
          <div className="mt-2 text-xs text-blue-500 flex items-center">
            <Lock className="h-3.5 w-3.5 mr-1" />
            <span>Session ID: {sessionId.slice(0, 12)}...</span>
          </div>
        </div>
      </div>

      {/* Sensitive Field Warning - Only show if sensitive fields are modified */}
      {hasSensitiveChanges && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle
            className="text-yellow-500 flex-shrink-0 mt-1"
            size={20}
          />
          <div>
            <h3 className="font-medium text-yellow-700">
              Sensitive Information Notice
            </h3>
            <p className="text-sm text-yellow-600">
              You have modified sensitive personal information. These changes
              will be encrypted and protected in accordance with HIPAA
              regulations, but please ensure the information you provide is
              accurate and that you're comfortable sharing it.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div
          className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <span className="flex-1">Profile updated successfully!</span>
          <button
            className="text-green-500 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-full"
            onClick={() => setSuccess(false)}
            aria-label="Dismiss success message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Profile header with image uploader */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/30 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4">
            <ProfileImageUploader
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
              storageReference={storageReference}
              setStorageReference={setStorageReference}
              error={error}
              setError={setError}
              loading={loading}
              setLoading={setLoading}
              defaultImage="/default-avatar.png"
              userIdentifier={formState.name || walletAddress}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              sessionId={sessionId}
            />
          </div>

          <div className="md:col-span-8">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleFormChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    formErrors.name ? "border-red-300" : ""
                  }`}
                  required
                  aria-required="true"
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? "name-error" : undefined}
                />
                {formErrors.name && (
                  <p id="name-error" className="mt-1 text-xs text-red-600">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleFormChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    formErrors.email ? "border-red-300" : ""
                  }`}
                  aria-label="Email address"
                  aria-invalid={!!formErrors.email}
                  aria-describedby={
                    formErrors.email ? "email-error" : "email-description"
                  }
                />
                {formErrors.email ? (
                  <p id="email-error" className="mt-1 text-xs text-red-600">
                    {formErrors.email}
                  </p>
                ) : (
                  <p
                    id="email-description"
                    className="mt-1 text-xs text-gray-500"
                  >
                    Your email is secure and will only be used for account
                    notifications
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="age"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Age
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    value={formState.age}
                    onChange={handleFormChange}
                    className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      formErrors.age ? "border-red-300" : ""
                    }`}
                    min="0"
                    aria-label="Age"
                    aria-invalid={!!formErrors.age}
                    aria-describedby={formErrors.age ? "age-error" : undefined}
                  />
                  {formErrors.age && (
                    <p id="age-error" className="mt-1 text-xs text-red-600">
                      {formErrors.age}
                    </p>
                  )}
                </div>
                <div className="flex items-center h-full pt-6">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      userRole === "patient"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {userRole === "patient" ? (
                      <UserCheck className="mr-1" size={16} />
                    ) : (
                      <Briefcase className="mr-1" size={16} />
                    )}
                    {userRole === "patient" ? "Patient" : "Researcher"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed section */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/30">
        <div className="border-b border-gray-200">
          <nav
            className="flex overflow-x-auto"
            aria-label="Profile settings tabs"
          >
            <button
              onClick={() => handleTabChange(0)}
              className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
                tabValue === 0
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              id="profile-tab-0"
              aria-controls="profile-tabpanel-0"
              aria-selected={tabValue === 0}
              role="tab"
              type="button"
            >
              <FileText size={18} className="mr-2" />
              Profile
            </button>
            <button
              onClick={() => handleTabChange(1)}
              className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
                tabValue === 1
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              id="profile-tab-1"
              aria-controls="profile-tabpanel-1"
              aria-selected={tabValue === 1}
              role="tab"
              type="button"
            >
              <Database size={18} className="mr-2" />
              Data
            </button>
            <button
              onClick={() => handleTabChange(2)}
              className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
                tabValue === 2
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              id="profile-tab-2"
              aria-controls="profile-tabpanel-2"
              aria-selected={tabValue === 2}
              role="tab"
              type="button"
            >
              <Lock size={18} className="mr-2" />
              Privacy
            </button>
            <button
              onClick={() => handleTabChange(3)}
              className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
                tabValue === 3
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              id="profile-tab-3"
              aria-controls="profile-tabpanel-3"
              aria-selected={tabValue === 3}
              role="tab"
              type="button"
            >
              <Bell size={18} className="mr-2" />
              Notifications
            </button>
            {userRole === "researcher" && (
              <button
                onClick={() => handleTabChange(4)}
                className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
                  tabValue === 4
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                id="profile-tab-4"
                aria-controls="profile-tabpanel-4"
                aria-selected={tabValue === 4}
                role="tab"
                type="button"
              >
                <Award size={18} className="mr-2" />
                Credentials
              </button>
            )}
          </nav>
        </div>

        <ProfileTabs
          tabValue={tabValue}
          userRole={userRole}
          formState={formState}
          handleFormChange={handleFormChange}
          handlePublicationChange={handlePublicationChange}
          walletAddress={walletAddress}
          userProfile={userProfile}
          formErrors={formErrors}
          sessionId={sessionId}
          TabPanel={(props) => (
            <div
              role="tabpanel"
              hidden={props.value !== props.index}
              id={`profile-tabpanel-${props.index}`}
              aria-labelledby={`profile-tab-${props.index}`}
              {...props}
            >
              {props.value === props.index && (
                <div className="py-6 px-6">{props.children}</div>
              )}
            </div>
          )}
        />
      </div>

      {/* Save button with HIPAA notice */}
      <div className="mt-6 mb-8">
        {/* HIPAA privacy notice for data changes */}
        {havePrivacyPreferencesChanged && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
            <div className="flex items-start">
              <Info className="text-blue-500 flex-shrink-0 mt-1" size={20} />
              <div className="ml-3">
                <h4 className="font-medium text-blue-700">
                  Privacy Settings Notice
                </h4>
                <p className="text-sm text-blue-600 mt-1">
                  You've made changes to your privacy settings. By saving, you
                  consent to these new data sharing preferences. This consent
                  will be recorded and maintained in accordance with HIPAA
                  regulations.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={loading || Object.keys(formErrors).length > 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg ${
              loading || Object.keys(formErrors).length > 0
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white font-medium shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            aria-label="Save profile changes"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Form validation summary */}
        {Object.keys(formErrors).length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-sm text-red-600 font-medium">
              Please correct the following errors:
            </p>
            <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
              {Object.entries(formErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* HIPAA Compliance Footer */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-4 mt-6">
        <p>
          All interactions with this form are logged for HIPAA compliance.
          Session ID: {sessionId.slice(0, 12)}...
        </p>
        <p className="mt-1">
          Fields accessed: {fieldsAccessed.size} | Data requests:{" "}
          {dataRequests.length} | Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

ProfileManager.propTypes = {
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
  defaultImage: PropTypes.string,
  userName: PropTypes.string,
  onSave: PropTypes.func,
};

export default ProfileManager;
