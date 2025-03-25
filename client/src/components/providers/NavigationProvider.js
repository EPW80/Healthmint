// src/components/providers/NavigationProvider.js
import React, { createContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

// Create context and export it so useNavigation.js can import it
export const NavigationContext = createContext(null);

/**
 * Navigation Provider Component
 *
 * Provides navigation methods and location information to child components
 */
const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Navigate to a specific route
   * @param {string} to - Route to navigate to
   * @param {Object} options - Navigation options
   */
  const navigateTo = useCallback(
    (to, options = {}) => {
      navigate(to, options);
    },
    [navigate]
  );

  /**
   * Go back to previous route
   */
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Replace current route
   * @param {string} to - Route to navigate to
   * @param {Object} options - Navigation options
   */
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

// Only export the provider component - the hook will be in useNavigation.js
export default NavigationProvider;
