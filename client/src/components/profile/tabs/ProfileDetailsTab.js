import React from "react";
import PropTypes from "prop-types";

const ProfileDetailsTab = ({
  formState,
  handleFormChange,
  walletAddress,
  userRole,
}) => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
      <div className="grid gap-6">
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formState.bio}
            onChange={handleFormChange}
            rows="4"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={
              userRole === "patient"
                ? "Share a bit about yourself (this will not be shared with your health data)"
                : "Describe your research background and interests"
            }
            aria-label="Biography"
          ></textarea>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-700 mb-1">
            {userRole === "patient" ? "Patient ID" : "Researcher ID"}
          </h3>
          <p className="text-sm text-gray-700 break-all">{walletAddress}</p>
        </div>
      </div>
    </>
  );
};

ProfileDetailsTab.propTypes = {
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
  walletAddress: PropTypes.string,
  userRole: PropTypes.string.isRequired,
};

export default ProfileDetailsTab;
