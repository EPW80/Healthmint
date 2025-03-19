import React, { useState } from "react";
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
} from "lucide-react";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { selectRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import ProfileImageUploader from "./ProfileImageUploader.js";
import ProfileTabs from "./ProfileTabs.js";

// Tab Panel Component
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`profile-tabpanel-${index}`}
    aria-labelledby={`profile-tab-${index}`}
    {...other}
  >
    {value === index && <div className="py-6">{children}</div>}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

/**
 * ProfileSettings Component
 *
 * A comprehensive profile management interface with tabbed navigation
 */
const ProfileSettings = ({
  onImageUpload,
  onImageRemove,
  defaultImage = "/default-avatar.png",
  userName,
  onSave,
}) => {
  const dispatch = useDispatch();
  const userProfile = useSelector((state) => state.user.profile);
  const userRole = useSelector(selectRole);
  const walletAddress = useSelector((state) => state.wallet.address);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    userProfile?.profileImage || null
  );
  const [storageReference, setStorageReference] = useState(
    userProfile?.profileImageHash || null
  );
  const [tabValue, setTabValue] = useState(0);
  const [formState, setFormState] = useState({
    name: userProfile?.name || userName || "",
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

  // Event handlers
  const handleTabChange = (newValue) => setTabValue(newValue);

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

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      if (!formState.name) throw new Error("Name is required");
      if (formState.email && !/\S+@\S+\.\S+/.test(formState.email)) {
        throw new Error("Please enter a valid email address");
      }

      const updatedProfile = {
        ...userProfile,
        ...formState,
        profileImage: previewUrl,
        profileImageHash: storageReference,
        lastUpdated: new Date().toISOString(),
      };

      dispatch(updateUserProfile(updatedProfile));
      dispatch(
        addNotification({
          type: "success",
          message: "Profile updated successfully",
        })
      );

      if (onSave) onSave(updatedProfile);
    } catch (error) {
      setError(error.message);
      dispatch(
        addNotification({
          type: "error",
          message: error.message,
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
              defaultImage={defaultImage}
              userIdentifier={formState.name || walletAddress || userName}
              onImageUpload={onImageUpload}
              onImageRemove={onImageRemove}
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
          TabPanel={TabPanel}
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

ProfileSettings.propTypes = {
  onImageUpload: PropTypes.func,
  onImageRemove: PropTypes.func,
  defaultImage: PropTypes.string,
  userName: PropTypes.string,
  onSave: PropTypes.func,
};

export default ProfileSettings;
