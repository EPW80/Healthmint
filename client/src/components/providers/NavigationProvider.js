// src/components/providers/NavigationProvider.js
import React, { createContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

export const NavigationContext = createContext(null);

// Create a custom hook to use the NavigationContext
const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateTo = useCallback(
    (to, options = {}) => {
      navigate(to, options);
    },
    [navigate]
  );

  // Function to go back to the previous route
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Function to replace the current route with a new one
  const replaceTo = useCallback(
    (to, options = {}) => {
      navigate(to, { ...options, replace: true });
    },
    [navigate]
  );

  // Create context value
  const value = {
    currentPath: location.pathname,
    location,
    navigateTo,
    goBack,
    replaceTo,
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

export default NavigationProvider;
