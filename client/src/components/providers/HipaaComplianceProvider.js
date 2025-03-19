// src/components/providers/HipaaComplianceProvider.js
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";
import useHipaaCompliance from "../../hooks/useHipaaCompliance.js";

// Create context for HIPAA compliance
const HipaaComplianceContext = createContext(null);

/**
 * HIPAA Compliance Provider Component
 *
 * Provides HIPAA compliance functionality to all child components
 * through React Context
 */
export const HipaaComplianceProvider = ({ children, options = {} }) => {
  // Use the hook to get all HIPAA functionality
  const hipaaCompliance = useHipaaCompliance(options);

  return (
    <HipaaComplianceContext.Provider value={hipaaCompliance}>
      {children}
    </HipaaComplianceContext.Provider>
  );
};

// Define prop types
HipaaComplianceProvider.propTypes = {
  children: PropTypes.node.isRequired,
  options: PropTypes.shape({
    autoVerifyConsent: PropTypes.bool,
    autoRequestConsent: PropTypes.bool,
    requiredConsent: PropTypes.string,
    consentPurpose: PropTypes.string,
  }),
};

/**
 * Custom hook to use the HIPAA compliance context
 *
 * Use this in components that need HIPAA compliance functionality
 */
export const useHipaaContext = () => {
  const context = useContext(HipaaComplianceContext);
  if (!context) {
    throw new Error(
      "useHipaaContext must be used within a HipaaComplianceProvider"
    );
  }
  return context;
};

export default HipaaComplianceProvider;
