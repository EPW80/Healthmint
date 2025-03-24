// src/App.js
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import NavigationProvider from "./components/providers/NavigationProvider.js";
import HipaaComplianceProvider from "./components/providers/HipaaComplianceProvider.js";
import AppContent from "./components/AppContent.js";
import NotificationsContainer from "./components/ui/NotificationsContainer.js";

/**
 * Main App component with all required providers
 */
function App() {
  // Options for HIPAA compliance
  const hipaaOptions = {
    autoVerifyConsent: true,
    autoRequestConsent: true,
    consentPurpose: "Access to health information in the Healthmint platform",
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router>
          {/* Use basename if deployed to a subdirectory */}
          <NavigationProvider>
            <HipaaComplianceProvider options={hipaaOptions}>
              <div className="min-h-screen flex flex-col bg-gray-50">
                <AppContent />
                <NotificationsContainer />
              </div>
            </HipaaComplianceProvider>
          </NavigationProvider>
        </Router>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
