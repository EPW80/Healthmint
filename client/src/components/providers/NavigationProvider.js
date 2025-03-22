// src/components/providers/SimpleNavigationProvider.js
import React, { createContext, useContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

// Create context
export const NavigationContext = createContext(null);

/**
 * Simplified Navigation Provider - no extra logic
 */
export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Basic navigation method
  const navigateTo = useCallback(
    (to, options = {}) => {
      navigate(to, options);
    },
    [navigate]
  );

  // Create minimal value
  const value = {
    currentPath: location.pathname,
    location,
    navigateTo,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

NavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Simple hook to use the navigation context
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export default NavigationProvider;