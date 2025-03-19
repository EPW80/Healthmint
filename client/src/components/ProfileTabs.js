import React from "react";
import PropTypes from "prop-types";
import ProfileDetailsTab from "./profile/tabs/ProfileDetailsTab.js";
import DataManagementTab from "./profile/tabs/DataManagementTab.js";
import PrivacyTab from "./profile/tabs/PrivacyTab.js";
import NotificationsTab from "./profile/tabs/NotificationsTab.js";
import CredentialsTab from "./profile/tabs/CredentialsTab.js";

const ProfileTabs = ({
  tabValue,
  userRole,
  formState,
  handleFormChange,
  handlePublicationChange,
  walletAddress,
  userProfile,
  TabPanel,
}) => {
  return (
    <>
      <TabPanel value={tabValue} index={0}>
        <ProfileDetailsTab
          formState={formState}
          handleFormChange={handleFormChange}
          walletAddress={walletAddress}
          userRole={userRole}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <DataManagementTab
          userRole={userRole}
          userProfile={userProfile}
          formState={formState}
          handleFormChange={handleFormChange}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <PrivacyTab
          userRole={userRole}
          formState={formState}
          handleFormChange={handleFormChange}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <NotificationsTab
          formState={formState}
          handleFormChange={handleFormChange}
        />
      </TabPanel>
      {userRole === "researcher" && (
        <TabPanel value={tabValue} index={4}>
          <CredentialsTab
            formState={formState}
            handleFormChange={handleFormChange}
            handlePublicationChange={handlePublicationChange}
          />
        </TabPanel>
      )}
    </>
  );
};

ProfileTabs.propTypes = {
  tabValue: PropTypes.number.isRequired,
  userRole: PropTypes.string.isRequired,
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
  handlePublicationChange: PropTypes.func.isRequired,
  walletAddress: PropTypes.string,
  userProfile: PropTypes.object,
  TabPanel: PropTypes.func.isRequired,
};

export default ProfileTabs;
