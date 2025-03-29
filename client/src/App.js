// src/App.js
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import store from "./redux/store.js";
import AppContent from "./components/AppContent.js";
import NotificationsContainer from "./components/ui/NotificationsContainer.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import { ErrorProvider } from "./contexts/ErrorContext.js";
import { HipaaComplianceProvider } from "./components/providers/HipaaComplianceProvider.js";
import NavigationProvider from "./components/providers/NavigationProvider.js";
import hipaaComplianceService from "./services/hipaaComplianceService.js";

const App = () => {
  // Get the user ID for HIPAA logging from localStorage - fallback to anonymous
  const userIdentifier =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Log application startup for HIPAA compliance
  useEffect(() => {
    const logAppStartup = async () => {
      try {
        await hipaaComplianceService.createAuditLog("APPLICATION_STARTUP", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          environment: process.env.NODE_ENV,
        });
      } catch (error) {
        console.error("Failed to log application startup:", error);
      }
    };

    logAppStartup();

    // Log application shutdown on unmount (though this may not always fire)
    return () => {
      hipaaComplianceService
        .createAuditLog("APPLICATION_SHUTDOWN", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          sessionDuration: "Unknown", // Would need a session timer to track this
        })
        .catch((error) => {
          console.error("Failed to log application shutdown:", error);
        });
    };
  }, [userIdentifier]);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ErrorProvider userIdentifier={userIdentifier}>
          <HipaaComplianceProvider
            options={{
              autoVerifyConsent: false,
              requiredConsent: "data_sharing",
              consentPurpose: "Using Healthmint platform",
            }}
          >
            <Router>
              <NavigationProvider>
                <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                  <AppContent />
                  <NotificationsContainer />
                </div>
              </NavigationProvider>
            </Router>
          </HipaaComplianceProvider>
        </ErrorProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
