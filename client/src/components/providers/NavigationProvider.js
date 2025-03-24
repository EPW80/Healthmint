// src/components/providers/NavigationProvider.js - Fixed to prevent circular dependencies
import React, { createContext, useContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

// Create context
export const NavigationContext = createContext(null);

/**
 * Navigation Provider Component
 * 
 * Provides navigation methods and location information to child components
 */
export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Navigate to a specific route
   * @param {string} to - Route to navigate to
   * @param {Object} options - Navigation options
   */
  const navigateTo = useCallback((to, options = {}) => {
    navigate(to, options);
  }, [navigate]);

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
  const replaceTo = useCallback((to, options = {}) => {
    navigate(to, { ...options, replace: true });
  }, [navigate]);

  // Create context value
  const value = {
    currentPath: location.pathname,
    location,
    navigateTo,
    goBack,
    replaceTo
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
 * Hook to use navigation context
 * @returns {Object} Navigation methods and state
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  
  return context;
};

// Export both the provider component and hook
export default NavigationProvider;