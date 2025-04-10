// src/components/providers/HipaaComplianceProvider.js
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";
import useHipaaCompliance from "../../hooks/useHipaaCompliance.js";

// Create context for HIPAA compliance
const HipaaComplianceContext = createContext(null);
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
