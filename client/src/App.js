// src/App.js
import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import { store } from "./redux/store.js";
import AppContent from "./components/AppContent.js";
import { HipaaComplianceProvider } from "./components/providers/HipaaComplianceProvider.js";
import { NavigationProvider } from "./components/providers/NavigationProvider.js";

/**
 * Main App component that wraps the application with necessary providers.
 * Now includes the HIPAA Compliance Provider to ensure consistent application
 * of HIPAA compliance throughout the application.
 */
function App() {
  // HIPAA compliance provider options
  const hipaaOptions = {
    autoVerifyConsent: true, // Automatically verify consent when needed
    autoRequestConsent: true, // Automatically request consent if missing
    requiredConsent: null, // Default consent type (set to null for no default)
    consentPurpose: "Access to health information in the Healthmint platform",
  };

  return (
    <Provider store={store}>
      <Router>
        <NavigationProvider>
          <HipaaComplianceProvider options={hipaaOptions}>
            <AppContent />
          </HipaaComplianceProvider>
        </NavigationProvider>
      </Router>
    </Provider>
  );
}

export default App;
