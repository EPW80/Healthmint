// src/components/ProfileManager.js
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  X,
  CheckCircle,
  Shield,
  Info,
} from "lucide-react";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import ProfileImageUploader from "./ProfileImageUploader.js";
import ProfileTabs from "./ProfileTabs.js";
import userService from "../services/userService.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import useHipaaFormState from "../hooks/useHipaaFormState.js";
import useAsyncOperation from "../hooks/useAsyncOperation.js";
import ErrorDisplay from "./ui/ErrorDisplay.js";
import LoadingSpinner from "./ui/LoadingSpinner.js";
/**
 * Helper function to deep merge objects with defaults
 * This ensures nested objects are properly merged rather than overwritten
 */
function deepMerge(defaults, userData) {
  if (!userData) return { ...defaults };

  const result = { ...defaults };

  Object.keys(userData).forEach((key) => {
    // If both are objects and not arrays, recursively merge
    if (
      typeof defaults[key] === "object" &&
      defaults[key] !== null &&
      typeof userData[key] === "object" &&
      userData[key] !== null &&
      !Array.isArray(defaults[key]) &&
      !Array.isArray(userData[key])
    ) {
      result[key] = deepMerge(defaults[key], userData[key]);
    }
    // Otherwise use the user data, falling back to default if undefined
    else {
      result[key] = userData[key] !== undefined ? userData[key] : defaults[key];
    }
  });

  return result;
}

/**
 * ProfileManager Component
 *
 * A unified profile management interface for both patients and researchers
 * that maintains HIPAA compliance throughout
 */
const ProfileManager = () => {
  const dispatch = useDispatch();
  const userRole = useSelector(selectRole);
  const userProfile = useSelector((state) => state.user.profile || {});
  const walletAddress = useSelector((state) => state.wallet.address);

  // Refs for accessibility
  const saveButtonRef = useRef(null);
  const profileFetchedRef = useRef(false);

  // Image Upload and UI State
  const [previewUrl, setPreviewUrl] = useState(
    userProfile?.profileImage || null
  );
  const [storageReference, setStorageReference] = useState(
    userProfile?.profileImageHash || null
  );
  const [tabValue, setTabValue] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Define comprehensive default values for all required structures
  const defaultProfile = {
    // Basic information
    name: "",
    email: "",
    age: "",
    bio: "",

    // Privacy and sharing preferences with defaults
    sharingPreferences: {
      anonymousSharing: true,
      notifyOnAccess: true,
      allowDirectContact: false,
    },

    // Notification preferences with defaults
    emailNotifications: {
      dataAccess: true,
      transactions: true,
      updates: false,
    },

    inAppNotifications: {
      messages: true,
      dataUpdates: true,
      announcements: false,
    },

    notificationPreferences: {
      accessAlerts: true,
      transactionAlerts: true,
      researchUpdates: false,
      newDatasets: true,
    },

    // Privacy preferences with defaults
    privacyPreferences: {
      publicProfile: false,
      showInstitution: true,
    },

    // Researcher-specific fields with defaults
    ethicsStatement: "",
    ethicsAgreement: false,
    institution: "",
    credentials: "",
    researchFocus: "",
    publications: [],
  };

  // Set up the formState with our custom hook
  const {
    formState,
    handleChange,
    handleArrayFieldChange,
    resetForm,
    errors,
    isDirty,
    validateForm,
    getChangedFields,
    initialFormState,
    setInitialFormState,
  } = useHipaaFormState(defaultProfile, {
    sanitizeField: (value, fieldName) =>
      hipaaComplianceService.sanitizeInputValue(value, fieldName),
    logFieldChange: (fieldName, value, metadata) => {
      // This is a placeholder for actual field change logging
      // We don't log the actual values for HIPAA compliance
      console.log(`Field ${fieldName} changed`, metadata);
    },
    hipaaService: hipaaComplianceService,
    userIdentifier: walletAddress,
    formType: "profile",
    validate: (values) => {
      const errors = {};
      if (!values.name) {
        errors.name = "Name is required";
      }
      if (values.email && !/\S+@\S+\.\S+/.test(values.email)) {
        errors.email = "Please enter a valid email address";
      }
      return errors;
    },
  });

  // Use our async operation hook for profile operations
  const { loading, execute: executeAsync } = useAsyncOperation({
    componentId: "ProfileManager",
    userId: walletAddress,
    onSuccess: () => {
      setSuccess(true);

      // Announce success for screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.className = "sr-only";
      announcement.textContent = "Profile updated successfully";
      document.body.appendChild(announcement);

      // Focus the save button after successful save
      if (saveButtonRef.current) {
        saveButtonRef.current.focus();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        document.body.removeChild(announcement);
      }, 3000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update profile. Please try again.");

      // Announce error for screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.className = "sr-only";
      announcement.textContent = `Error: ${err.message || "Failed to update profile"}`;
      document.body.appendChild(announcement);

      // Remove announcement after 5 seconds
      setTimeout(() => document.body.removeChild(announcement), 5000);
    },
  });

  // Load user profile data on mount with proper sanitization
  useEffect(() => {
    // Only run this effect once
    if (profileFetchedRef.current) return;

    const fetchUserProfile = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        profileFetchedRef.current = true;

        // Create HIPAA-compliant audit log for profile access with enhanced metadata
        await hipaaComplianceService.createAuditLog("PROFILE_ACCESS", {
          action: "VIEW",
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          accessMethod: "PROFILE_COMPONENT",
          userRole: userRole,
          ipAddress: "client", // Server will log actual IP
        });

        // Get profile data with proper access tracking
        const profile = await userService.getCurrentUser();

        if (profile) {
          // Merge profile data with defaults using deep merge to handle nested objects
          const mergedProfile = deepMerge(defaultProfile, profile);

          // Log the profile structure for debugging (DEVELOPMENT ONLY)
          if (process.env.NODE_ENV !== "production") {
            console.log("Profile structure check:", {
              hasRequiredFields: Boolean(
                mergedProfile.sharingPreferences &&
                  mergedProfile.notificationPreferences
              ),
              profileFields: Object.keys(mergedProfile),
            });
          }

          // Sanitize the profile data before setting in state
          const sanitizedProfile = hipaaComplianceService.sanitizeData(
            mergedProfile,
            {
              accessPurpose: "Initial Profile Load",
              dataSource: "API",
            }
          );

          // Update initial form state with sanitized data
          setInitialFormState(sanitizedProfile);

          // Also update form state to ensure consistent data
          resetForm(sanitizedProfile);
        } else {
          // Handle case where profile is null or undefined
          console.warn("Profile data is null or undefined, using defaults");

          // Log this issue for HIPAA compliance
          await hipaaComplianceService.createAuditLog("PROFILE_DATA_MISSING", {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            action: "FALLBACK_TO_DEFAULTS",
          });

          // Use default profile
          setInitialFormState(defaultProfile);
          resetForm(defaultProfile);

          // Show a non-blocking warning to the user
          dispatch(
            addNotification({
              type: "warning",
              message:
                "Unable to load your complete profile. Some information may be missing.",
              duration: 5000,
            })
          );
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);

        // Set a user-friendly error message
        setError("Failed to load your profile. Please try again.");

        // Log the error for HIPAA compliance
        await hipaaComplianceService.createAuditLog("PROFILE_ACCESS_ERROR", {
          action: "VIEW_ERROR",
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          errorMessage: err.message || "Unknown error during profile load",
          errorCode: err.code || "UNKNOWN",
          stackTrace:
            process.env.NODE_ENV !== "production" ? err.stack : undefined,
        });

        // Display notification to user
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to load your profile. Please try again.",
            duration: 7000,
          })
        );

        // Use default profile despite the error
        setInitialFormState(defaultProfile);
        resetForm(defaultProfile);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUserProfile();
    // We intentionally use an empty dependency array to ensure this only runs once
    // The profileFetchedRef ensures we don't run this multiple times
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle publication changes
  const handlePublicationChange = useCallback(
    (newPublications) => {
      // Use our new handler from the form hook
      handleArrayFieldChange("publications", newPublications);

      // Log publication changes for researchers
      if (userRole === "researcher") {
        hipaaComplianceService.createAuditLog(
          "RESEARCHER_PUBLICATIONS_UPDATED",
          {
            publicationCount: newPublications.length,
            timestamp: new Date().toISOString(),
            userId: walletAddress,
            action: "UPDATE",
          }
        );
      }
    },
    [handleArrayFieldChange, userRole, walletAddress]
  );

  // Event handlers
  const handleTabChange = (newValue) => {
    // Log tab change for HIPAA compliance with enhanced data
    hipaaComplianceService.createAuditLog("PROFILE_TAB_CHANGE", {
      previousTab: tabValue,
      newTab: newValue,
      timestamp: new Date().toISOString(),
      userId: walletAddress,
      userRole: userRole,
      tabLabels: {
        0: "Profile",
        1: "Data",
        2: "Privacy",
        3: "Notifications",
        4: "Credentials",
      },
    });

    setTabValue(newValue);
  };

  const handleImageUpload = useCallback(
    (reference) => {
      // Log image upload for HIPAA compliance with enhanced metadata
      hipaaComplianceService.createAuditLog("PROFILE_IMAGE_UPLOAD", {
        action: "UPLOAD",
        timestamp: new Date().toISOString(),
        userId: walletAddress,
        userRole: userRole,
        referenceHash: reference.substring(0, 10), // Only log part of the hash for security
        ipAddress: "client", // Server will log actual IP
      });

      setStorageReference(reference);
    },
    [walletAddress, userRole]
  );

  const handleImageRemove = useCallback(() => {
    // Log image removal for HIPAA compliance
    hipaaComplianceService.createAuditLog("PROFILE_IMAGE_REMOVE", {
      action: "REMOVE",
      timestamp: new Date().toISOString(),
      userId: walletAddress,
      referenceHash: storageReference
        ? storageReference.substring(0, 10)
        : null,
    });

    setPreviewUrl(null);
    setStorageReference(null);
  }, [walletAddress, storageReference]);

  // Verify user consent and log it
  const verifyAndLogConsent = useCallback(async () => {
    try {
      // Check if we need to verify consent for privacy changes
      const privacyChanged =
        JSON.stringify(formState.privacyPreferences) !==
        JSON.stringify(initialFormState.privacyPreferences);

      const sharingChanged =
        JSON.stringify(formState.sharingPreferences) !==
        JSON.stringify(initialFormState.sharingPreferences);

      if (privacyChanged || sharingChanged) {
        // Verify or request consent with enhanced metadata
        const consentResult = await hipaaComplianceService.verifyConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            consentPurpose: "Updating privacy and sharing preferences",
            requestMethod: "PROFILE_UPDATE",
            changedPreferences: {
              privacyChanged,
              sharingChanged,
            },
          }
        );

        if (!consentResult) {
          throw new Error("Consent required for updating privacy settings");
        }

        // Record explicit consent
        await hipaaComplianceService.recordConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          true,
          {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            details: "Explicit consent provided during profile update",
            ipAddress: "client", // Server will log actual IP
            consentMethod: "PROFILE_FORM_SUBMISSION",
            consentVersion: "1.2", // Include consent policy version for tracking
          }
        );
      }

      return true;
    } catch (error) {
      console.error("Consent verification error:", error);
      return false;
    }
  }, [formState, initialFormState, walletAddress]);

  const handleSaveProfile = async () => {
    // Use our validateForm method from the form hook
    const isValid = validateForm();
    if (!isValid) {
      // Announce validation errors for screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.className = "sr-only";
      announcement.textContent =
        "Form validation failed. Please check the form for errors.";
      document.body.appendChild(announcement);

      // Find the first error field and focus it
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      if (firstErrorField) {
        firstErrorField.focus();
      }

      // Clean up announcement
      setTimeout(() => document.body.removeChild(announcement), 3000);
      return;
    }

    // Execute the profile save operation with our async operation hook
    await executeAsync(async () => {
      // Verify consent for privacy-related changes
      const consentVerified = await verifyAndLogConsent();
      if (!consentVerified) {
        throw new Error("Consent is required to update privacy settings");
      }

      // Create HIPAA-compliant audit log for profile update with detailed tracking
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        action: "UPDATE",
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        // Track which fields were changed for audit purposes
        changedFields: getChangedFields(),
        userRole: userRole,
        ipAddress: "client", // Server will log actual IP
        updateReason: "User initiated profile update",
        clientInfo: navigator.userAgent, // Log client info for security
      });

      // Apply consistent sanitization before any data transmission
      const sanitizedData = hipaaComplianceService.sanitizeData(formState, {
        excludeFields: ["password", "walletType", "securityQuestions"],
        accessPurpose: "Profile Update Submission",
        includeAuditMetadata: true,
      });

      const updatedProfile = {
        ...userProfile,
        ...sanitizedData,
        profileImage: previewUrl,
        profileImageHash: storageReference,
        lastUpdated: new Date().toISOString(),
      };

      // Update profile with user service
      await userService.updateProfile(updatedProfile);

      // Update profile in Redux store using sanitized data
      dispatch(updateUserProfile(sanitizedData));

      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: "Profile updated successfully",
        })
      );

      return updatedProfile;
    });
  };

  // Show initial loading state
  if (initialLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/30 shadow-lg flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner
            size="large"
            label="Loading your profile..."
            showLabel={true}
          />
          <p className="text-gray-500 mt-4">
            Please wait while we retrieve your information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
        Profile Settings
      </h1>

      {/* HIPAA Compliance Banner */}
      <div
        className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3"
        role="region"
        aria-label="HIPAA compliance information"
      >
        <Shield
          className="text-blue-500 flex-shrink-0 mt-1"
          size={20}
          aria-hidden="true"
        />
        <div>
          <h3 className="font-medium text-blue-700">HIPAA Compliance Notice</h3>
          <p className="text-sm text-blue-600">
            Your profile information is protected in accordance with HIPAA
            regulations. All changes to your profile settings are logged and
            protected with industry-standard security measures.
          </p>
        </div>
      </div>

      {/* Data Processing Notice */}
      <div
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex items-start gap-3"
        role="region"
        aria-label="Data processing information"
      >
        <Info
          className="text-gray-500 flex-shrink-0 mt-1"
          size={20}
          aria-hidden="true"
        />
        <div>
          <h3 className="font-medium text-gray-700">
            Data Processing Information
          </h3>
          <p className="text-sm text-gray-600">
            All profile data is sanitized before transmission in accordance with
            HIPAA guidelines.
            {userRole === "patient" &&
              " Patient identifiable information is specially protected."}
            Your profile changes are securely logged for compliance purposes.
          </p>
        </div>
      </div>

      {/* Error Display - Using our standardized component */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Success Alert */}
      {success && (
        <div
          className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle
            size={20}
            className="text-green-500 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="flex-1">Profile updated successfully!</span>
          <button
            className="text-green-500 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-full"
            onClick={() => setSuccess(false)}
            aria-label="Dismiss success message"
          >
            <X size={18} aria-hidden="true" />
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
              setLoading={() => {}} // We're managing loading state with our hooks now
              defaultImage="/default-avatar.png"
              userIdentifier={formState.name || walletAddress}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
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
                  onChange={handleChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.name ? "border-red-300" : ""
                  }`}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="mt-1 text-sm text-red-600">
                    {errors.name}
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
                  onChange={handleChange}
                  className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.email ? "border-red-300" : ""
                  }`}
                  aria-label="Email address"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
                {userRole === "patient" && (
                  <p id="email-hint" className="mt-1 text-xs text-gray-500">
                    Your email will be masked unless you enable direct contact
                    in Privacy settings
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
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    aria-label="Age"
                    aria-describedby={
                      userRole === "patient" ? "age-hint" : undefined
                    }
                  />
                  {userRole === "patient" && (
                    <p id="age-hint" className="mt-1 text-xs text-gray-500">
                      Only shared if anonymous sharing is enabled
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
                    role="status"
                  >
                    {userRole === "patient" ? (
                      <UserCheck
                        className="mr-1"
                        size={16}
                        aria-hidden="true"
                      />
                    ) : (
                      <Briefcase
                        className="mr-1"
                        size={16}
                        aria-hidden="true"
                      />
                    )}
                    {userRole === "patient" ? "Patient" : "Researcher"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed section with enhanced accessibility */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/30">
        <div className="border-b border-gray-200">
          <nav
            className="flex overflow-x-auto"
            aria-label="Profile settings tabs"
            role="tablist"
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
              <FileText size={18} className="mr-2" aria-hidden="true" />
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
              <Database size={18} className="mr-2" aria-hidden="true" />
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
              <Lock size={18} className="mr-2" aria-hidden="true" />
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
              <Bell size={18} className="mr-2" aria-hidden="true" />
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
                <Award size={18} className="mr-2" aria-hidden="true" />
                Credentials
              </button>
            )}
          </nav>
        </div>

        <ProfileTabs
          tabValue={tabValue}
          userRole={userRole}
          formState={formState}
          handleFormChange={handleChange}
          handlePublicationChange={handlePublicationChange}
          walletAddress={walletAddress}
          userProfile={userProfile}
          TabPanel={(props) => (
            <div
              role="tabpanel"
              hidden={props.value !== props.index}
              id={`profile-tabpanel-${props.index}`}
              aria-labelledby={`profile-tab-${props.index}`}
              {...props}
            >
              {props.value === props.index && (
                <div className="p-6">{props.children}</div>
              )}
            </div>
          )}
        />
      </div>

      {/* HIPAA processing notification */}
      {userRole === "patient" && (
        <div
          className="mt-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-700"
          role="region"
          aria-label="HIPAA data processing notice"
        >
          <div className="flex items-center mb-1">
            <Info
              size={16}
              className="mr-2 text-yellow-600"
              aria-hidden="true"
            />
            <span className="font-medium">HIPAA Data Processing Notice</span>
          </div>
          <p>
            As a patient, your profile information is subject to additional
            HIPAA protections. Any changes to your privacy settings will require
            explicit consent. All profile access and changes are logged for
            HIPAA compliance.
          </p>
        </div>
      )}

      {/* Save button with improved accessibility */}
      <div className="flex justify-end mt-6 mb-8">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={loading || !isDirty}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : !isDirty
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
          } text-white font-medium shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
          aria-label="Save profile changes"
          aria-busy={loading}
          aria-disabled={!isDirty}
          ref={saveButtonRef}
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" color="white" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} aria-hidden="true" />
              <span>Save Profile</span>
            </>
          )}
        </button>
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
