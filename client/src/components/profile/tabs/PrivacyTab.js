import React from "react";
import PropTypes from "prop-types";

const PrivacyTab = ({ userRole, formState, handleFormChange }) => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Data Sharing Preferences</h3>
        {userRole === "patient" ? (
          <div className="space-y-2">
            {["anonymousSharing", "notifyOnAccess", "allowDirectContact"].map(
              (key) => (
                <div key={key} className="flex items-center">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name={`sharingPreferences.${key}`}
                      checked={formState.sharingPreferences?.[key] || false}
                      onChange={handleFormChange}
                      className="rounded border-line text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">
                      {key === "anonymousSharing"
                        ? "Allow anonymous data sharing for research"
                        : key === "notifyOnAccess"
                          ? "Notify me when my data is accessed"
                          : "Allow researchers to contact me directly"}
                    </span>
                  </label>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {["publicProfile", "showInstitution"].map((key) => (
              <div key={key} className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name={`privacyPreferences.${key}`}
                    checked={formState.privacyPreferences?.[key] || false}
                    onChange={handleFormChange}
                    className="rounded border-line text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">
                    {key === "publicProfile"
                      ? "Make my researcher profile public"
                      : "Display my institution publicly"}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

PrivacyTab.propTypes = {
  userRole: PropTypes.string.isRequired,
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default PrivacyTab;
