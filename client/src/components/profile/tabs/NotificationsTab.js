import React from "react";
import PropTypes from "prop-types";

const NotificationsTab = ({ userRole, formState, handleFormChange }) => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>

      <h3 className="text-lg font-medium mt-6 mb-2">Email Notifications</h3>
      <div className="space-y-2">
        {["dataAccess", "transactions", "updates"].map((key) => (
          <div key={key} className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name={`emailNotifications.${key}`}
                checked={formState.emailNotifications?.[key] || false}
                onChange={handleFormChange}
                className="rounded border-line text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">
                {key === "dataAccess"
                  ? "Data access notifications"
                  : key === "transactions"
                    ? "Transaction confirmations"
                    : "Platform updates"}
              </span>
            </label>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-medium mt-6 mb-2">In-App Notifications</h3>
      <div className="space-y-2">
        {["messages", "dataUpdates", "announcements"].map((key) => (
          <div key={key} className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name={`inAppNotifications.${key}`}
                checked={formState.inAppNotifications?.[key] || false}
                onChange={handleFormChange}
                className="rounded border-line text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2">
                {key === "messages"
                  ? "Messages"
                  : key === "dataUpdates"
                    ? "Data updates"
                    : "System announcements"}
              </span>
            </label>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-medium mt-6 mb-2">Alerts</h3>
      <div className="space-y-2">
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="notificationPreferences.accessAlerts"
              checked={formState.notificationPreferences?.accessAlerts || false}
              onChange={handleFormChange}
              className="rounded border-line text-blue-600 focus:ring-blue-500"
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
              className="rounded border-line text-blue-600 focus:ring-blue-500"
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
                className="rounded border-line text-blue-600 focus:ring-blue-500"
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
                className="rounded border-line text-blue-600 focus:ring-blue-500"
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

NotificationsTab.propTypes = {
  userRole: PropTypes.string.isRequired,
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default NotificationsTab;
