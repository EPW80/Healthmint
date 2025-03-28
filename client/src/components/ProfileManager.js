// src/components/ProfileManager.js
import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import ProfileImageUploader from "./ProfileImageUploader.js";
import ProfileTabs from "./ProfileTabs.js";
import userService from "../services/userService.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * ProfileManager Component
 *
 * A unified profile management interface for both patients and researchers
 * that maintains HIPAA compliance throughout
 */
const ProfileManager = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userRole = useSelector(selectRole);
  const userProfile = useSelector((state) => state.user.profile || {});
  const walletAddress = useSelector((state) => state.wallet.address);

  // State
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

  // Load user profile data on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);

        // Create HIPAA-compliant audit log for profile access
        await hipaaComplianceService.createAuditLog("PROFILE_ACCESS", {
          action: "VIEW",
          userId: walletAddress,
          timestamp: new Date().toISOString(),
        });

        const profile = await userService.getCurrentUser();

        if (profile) {
          // Update form state with profile data
          const updatedFormState = {
            ...formState,
            ...profile,
            // Ensure nested objects are properly merged
            sharingPreferences: {
              ...formState.sharingPreferences,
              ...(profile.sharingPreferences || {}),
            },
            emailNotifications: {
              ...formState.emailNotifications,
              ...(profile.emailNotifications || {}),
            },
            inAppNotifications: {
              ...formState.inAppNotifications,
              ...(profile.inAppNotifications || {}),
            },
            notificationPreferences: {
              ...formState.notificationPreferences,
              ...(profile.notificationPreferences || {}),
            },
            privacyPreferences: {
              ...formState.privacyPreferences,
              ...(profile.privacyPreferences || {}),
            },
          };

          setFormState(updatedFormState);
          setInitialFormState(updatedFormState);

          // Set profile image
          if (profile.profileImage) {
            setPreviewUrl(profile.profileImage);
          }

          if (profile.profileImageHash) {
            setStorageReference(profile.profileImageHash);
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setError("Failed to load your profile. Please try again.");

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
  }, [
    dispatch,
    walletAddress,
    userProfile.profileImage,
    userProfile.profileImageHash,
  ]);

  // Event handlers
  const handleTabChange = (newValue) => {
    // Log tab change for HIPAA compliance
    hipaaComplianceService.createAuditLog("PROFILE_TAB_CHANGE", {
      previousTab: tabValue,
      newTab: newValue,
      timestamp: new Date().toISOString(),
    });

    setTabValue(newValue);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormState((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handlePublicationChange = (newPublications) => {
    setFormState((prev) => ({
      ...prev,
      publications: newPublications,
    }));
  };

  const handleImageUpload = useCallback((reference) => {
    // Log image upload for HIPAA compliance
    hipaaComplianceService.createAuditLog("PROFILE_IMAGE_UPLOAD", {
      action: "UPLOAD",
      timestamp: new Date().toISOString(),
    });

    setStorageReference(reference);
  }, []);

  const handleImageRemove = useCallback(() => {
    // Log image removal for HIPAA compliance
    hipaaComplianceService.createAuditLog("PROFILE_IMAGE_REMOVE", {
      action: "REMOVE",
      timestamp: new Date().toISOString(),
    });

    setPreviewUrl(null);
    setStorageReference(null);
  }, []);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (!formState.name) {
        throw new Error("Name is required");
      }

      if (formState.email && !/\S+@\S+\.\S+/.test(formState.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Create HIPAA-compliant audit log for profile update
      await hipaaComplianceService.createAuditLog("PROFILE_UPDATE", {
        action: "UPDATE",
        userId: walletAddress,
        timestamp: new Date().toISOString(),
        // Track which fields were changed for audit purposes
        changedFields: Object.keys(formState).filter(
          (key) =>
            JSON.stringify(formState[key]) !==
            JSON.stringify(initialFormState[key])
        ),
      });

      // Sanitize data for HIPAA compliance
      const sanitizedData = hipaaComplianceService.sanitizeData(formState, {
        excludeFields: ["password", "walletType"],
      });

      // If changing privacy settings, record HIPAA consent
      if (
        JSON.stringify(formState.privacyPreferences) !==
          JSON.stringify(initialFormState.privacyPreferences) ||
        JSON.stringify(formState.sharingPreferences) !==
          JSON.stringify(initialFormState.sharingPreferences)
      ) {
        await hipaaComplianceService.recordConsent(
          hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
          true,
          {
            userId: walletAddress,
            timestamp: new Date().toISOString(),
            details: "Updated privacy preferences via profile settings",
          }
        );
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

      // Update profile in Redux store
      dispatch(updateUserProfile(updatedProfile));

      // Save initial state for future change detection
      setInitialFormState({ ...formState });

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

      {/* HIPAA Compliance Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Shield className="text-blue-500 flex-shrink-0 mt-1" size={20} />
        <div>
          <h3 className="font-medium text-blue-700">HIPAA Compliance Notice</h3>
          <p className="text-sm text-blue-600">
            Your profile information is protected in accordance with HIPAA
            regulations. All changes to your profile settings are logged and
            protected with industry-standard security measures.
          </p>
        </div>
      </div>

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
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  aria-required="true"
                />
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
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  aria-label="Email address"
                />
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
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    aria-label="Age"
                  />
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
          TabPanel={(props) => (
            <div
              role="tabpanel"
              hidden={props.value !== props.index}
              id={`profile-tabpanel-${props.index}`}
              aria-labelledby={`profile-tab-${props.index}`}
              {...props}
            >
              {props.value === props.index && (
                <div className="py-6">{props.children}</div>
              )}
            </div>
          )}
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-6 mb-8">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg ${
            loading
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
    </div>
  );
};

export default ProfileManager;
