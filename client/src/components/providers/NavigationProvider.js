// src/components/providers/NavigationProvider.js
import React, { createContext, useContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { ROUTES, isApiRoute, getApiUrl } from "../../utils/navigation.js";

// Create context and export it
export const NavigationContext = createContext(null);

/**
 * Navigation Provider Component
 *
 * Centralizes navigation logic and provides a consistent API
 * that works across different React Router versions
 */
export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Navigate to a new route with support for both string routes and route objects
   * @param {string|object} to - Destination route or route object
   * @param {object} options - Navigation options
   */
  const navigateTo = useCallback(
    (to, options = {}) => {
      // If to is an object with pathname, convert to React Router v6 format
      if (typeof to === "object" && to.pathname) {
        const { pathname, search, hash, state } = to;
        const path = `${pathname}${search || ""}${hash || ""}`;
        navigate(path, {
          replace: options.replace || false,
          state: state || options.state,
        });
        return;
      }

      // Handle string routes
      if (typeof to === "string") {
        // Check if this is an API route
        if (isApiRoute(to)) {
          window.location.href = getApiUrl(to);
          return;
        }

        // Regular client-side route
        navigate(to, {
          replace: options.replace || false,
          state: options.state,
        });
        return;
      }

      console.error("Invalid navigation target:", to);
    },
    [navigate]
  );

  /**
   * Go back in history
   */
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Replace current route with a new one
   * @param {string|object} to - Destination route
   * @param {object} options - Navigation options
   */
  const replaceRoute = useCallback(
    (to, options = {}) => {
      navigateTo(to, { ...options, replace: true });
    },
    [navigateTo]
  );

  // Create value object with all navigation utilities
  const value = {
    // Current route info
    currentPath: location.pathname,
    location,

    // Navigation methods
    navigateTo,
    goBack,
    replaceRoute,

    // Route constants
    ROUTES,

    // Legacy support for history.push style
    history: {
      push: navigateTo,
      replace: replaceRoute,
      goBack,
      location,
    },
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
 * Custom hook to use the navigation context
 * @returns {object} Navigation context
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export default NavigationProvider;
