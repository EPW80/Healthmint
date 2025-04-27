// client/src/components/profile/ProfileTabs.js
import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import ProfileDetailsTab from "./profile/tabs/ProfileDetailsTab.js";
import DataManagementTab from "./profile/tabs/DataManagementTab.js";
import PrivacyTab from "./profile/tabs/PrivacyTab.js";
import NotificationsTab from "./profile/tabs/NotificationsTab.js";
import CredentialsTab from "./profile/tabs/CredentialsTab.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

// This component renders different tabs based on the user's role and selected tab value.
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
  // Tab configuration using useMemo to prevent unnecessary recreations
  const tabs = useMemo(
    () => [
      {
        index: 0,
        label: "Profile Details",
        component: (
          <ProfileDetailsTab
            formState={formState}
            handleFormChange={handleFormChange}
            walletAddress={walletAddress}
            userRole={userRole}
          />
        ),
      },
      {
        index: 1,
        label: "Data Management",
        component: (
          <DataManagementTab
            userRole={userRole}
            userProfile={userProfile}
            formState={formState}
            handleFormChange={handleFormChange}
          />
        ),
      },
      {
        index: 2,
        label: "Privacy Settings",
        component: (
          <PrivacyTab
            userRole={userRole}
            formState={formState}
            handleFormChange={handleFormChange}
          />
        ),
      },
      {
        index: 3,
        label: "Notifications",
        component: (
          <NotificationsTab
            formState={formState}
            handleFormChange={handleFormChange}
          />
        ),
      },
      // Researcher-specific tab, only included for researcher role
      ...(userRole === "researcher"
        ? [
            {
              index: 4,
              label: "Credentials",
              component: (
                <CredentialsTab
                  formState={formState}
                  handleFormChange={handleFormChange}
                  handlePublicationChange={handlePublicationChange}
                />
              ),
            },
          ]
        : []),
    ],
    [
      formState,
      handleFormChange,
      handlePublicationChange,
      walletAddress,
      userRole,
      userProfile,
    ]
  );

  // Log tab access for HIPAA compliance
  useEffect(() => {
    const tabName =
      tabs.find((tab) => tab.index === tabValue)?.label || "Unknown";

    hipaaComplianceService
      .createAuditLog("PROFILE_TAB_ACCESS", {
        tabName,
        timestamp: new Date().toISOString(),
        userId: walletAddress || userProfile?.id || "unknown",
        userRole,
        action: "VIEW",
      })
      .catch((err) => console.error("Failed to log profile tab access:", err));
  }, [tabValue, tabs, walletAddress, userProfile, userRole]);

  return (
    <>
      {tabs.map((tab) => (
        <TabPanel key={tab.index} value={tabValue} index={tab.index}>
          {tab.component}
        </TabPanel>
      ))}
    </>
  );
};

ProfileTabs.propTypes = {
  tabValue: PropTypes.number.isRequired,
  userRole: PropTypes.oneOf(["patient", "researcher", "admin"]).isRequired,
  formState: PropTypes.object.isRequired,
  handleFormChange: PropTypes.func.isRequired,
  handlePublicationChange: PropTypes.func.isRequired,
  walletAddress: PropTypes.string,
  userProfile: PropTypes.object,
  TabPanel: PropTypes.elementType.isRequired,
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(ProfileTabs);
