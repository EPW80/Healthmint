import React, { useEffect, useState } from "react";
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
import mockDataUtils from "./utils/mockDataUtils.js";
import apiService from "./services/apiService.js";

const App = () => {
  const [mockDataEnabled, setMockDataEnabled] = useState(
    typeof apiService.isMockDataEnabled === "function"
      ? apiService.isMockDataEnabled()
      : false
  );
  const [isDevToolsExpanded, setIsDevToolsExpanded] = useState(false);

  const userIdentifier =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  useEffect(() => {
    try {
      mockDataUtils.initializeMockData();
      if (typeof apiService.enableMockData === "function") {
        apiService.enableMockData();
        setMockDataEnabled(true);
      }
    } catch (error) {
      console.error("Failed to initialize mock data:", error);
    }
  }, []);

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
          usingMockData: mockDataEnabled,
        });
      } catch (error) {
        console.error("Failed to log application startup:", error);
      }
    };

    logAppStartup();

    return () => {
      hipaaComplianceService
        .createAuditLog("APPLICATION_SHUTDOWN", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          sessionDuration: "Unknown",
          usingMockData: mockDataEnabled,
        })
        .catch((error) => {
          console.error("Failed to log application shutdown:", error);
        });
    };
  }, [userIdentifier, mockDataEnabled]);

  const toggleMockData = () => {
    const newState = !mockDataEnabled;
    if (newState && typeof apiService.enableMockData === "function") {
      apiService.enableMockData();
    } else if (!newState && typeof apiService.disableMockData === "function") {
      apiService.disableMockData();
    } else {
      console.warn("Mock data toggle method not available.");
      return;
    }
    setMockDataEnabled(newState);
    setTimeout(() => window.location.reload(), 1000); // Delay for notification visibility
  };

  const resetMockData = () => {
    if (
      window.confirm(
        "Are you sure you want to reset mock data? This action cannot be undone."
      )
    ) {
      try {
        mockDataUtils.resetMockData();
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error("Failed to reset mock data:", error);
      }
    }
  };

  const renderDevTools = () => {
    if (process.env.NODE_ENV === "production") return null;

    return (
      <div
        className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${
          isDevToolsExpanded ? "bg-white p-4 rounded-lg shadow-lg" : ""
        }`}
        role="region"
        aria-label="Developer Tools"
      >
        {isDevToolsExpanded ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Dev Tools</span>
              <button
                onClick={() => setIsDevToolsExpanded(false)}
                className="text-gray-500 hover:text-gray-700 text-lg"
                aria-label="Close Dev Tools"
              >
                ×
              </button>
            </div>
            <button
              onClick={toggleMockData}
              className={`w-full py-2 px-4 rounded text-white ${
                mockDataEnabled
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
              aria-pressed={mockDataEnabled}
            >
              {mockDataEnabled ? "Disable Mock Data" : "Enable Mock Data"}
            </button>
            {mockDataEnabled && (
              <button
                onClick={resetMockData}
                className="w-full py-2 px-4 rounded bg-green-500 hover:bg-green-600 text-white"
              >
                Reset Mock Data
              </button>
            )}

            {/* Test/Upload Page Link */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <a
                href="/test/upload"
                className="block w-full py-2 px-4 text-center rounded bg-blue-500 hover:bg-blue-600 text-white"
              >
                Test/Upload Page
              </a>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsDevToolsExpanded(true)}
            className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full opacity-70 hover:opacity-100"
            aria-label="Open Dev Tools"
            title="Dev Tools"
          >
            ⚙️
          </button>
        )}
      </div>
    );
  };

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
                  {renderDevTools()}
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
