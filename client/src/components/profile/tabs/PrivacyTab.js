import React from "react";
import PropTypes from "prop-types";

/**
 * PrivacyTab Component
 *
 * Manages user privacy and data sharing settings
 */
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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

      <div className="border-t border-gray-200 pt-6 mt-6"></div>

      <h3 className="text-lg font-medium mb-3">Account Security</h3>
      <div className="space-y-2">
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="notificationPreferences.accessAlerts"
              checked={formState.notificationPreferences?.accessAlerts || false}
              onChange={handleFormChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">
              {userRole === "patient"
                ? "Data access alerts"
                : "New dataset alerts"}
            </span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="notificationPreferences.transactionAlerts"
              checked={
                formState.notificationPreferences?.transactionAlerts || false
              }
              onChange={handleFormChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">Transaction alerts</span>
          </label>
        </div>

        {userRole === "patient" ? (
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="notificationPreferences.researchUpdates"
                checked={
                  formState.notificationPreferences?.researchUpdates || false
                }
                onChange={handleFormChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">Research updates using my data</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="notificationPreferences.newDatasets"
                checked={
                  formState.notificationPreferences?.newDatasets || false
                }
                onChange={handleFormChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">
                Notify me about new relevant datasets
              </span>
            </label>
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
