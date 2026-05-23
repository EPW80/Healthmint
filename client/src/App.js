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
  const userIdentifier =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Clear leftover auth bypass flags from any prior emergency loop fire.
  // These flags would let unauthenticated users into protected routes, and
  // they outlive the event that set them (sessionStorage lasts the whole tab).
  sessionStorage.removeItem("auth_verification_override");
  sessionStorage.removeItem("bypass_route_protection");

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
      } catch (_err) {
        // audit failure must not crash the app
      }
    };

    logAppStartup();

    return () => {
      hipaaComplianceService
        .createAuditLog("APPLICATION_SHUTDOWN", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          sessionDuration: "Unknown",
        })
        .catch(() => {});
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
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
