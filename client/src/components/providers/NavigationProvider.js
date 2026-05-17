// src/components/providers/NavigationProvider.js
import React, { createContext, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";

export const NavigationContext = createContext(null);

// Create a custom hook to use the NavigationContext
const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useSelector((state) => state.role.role);

  // Function to navigate to a new route
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

  // Function to check if a path is active
  const isActive = useCallback(
    (path) => {
      if (path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  // Check if a route is available for the current user role
  const isRouteAvailable = useCallback(
    (route) => {
      // If no role restrictions, route is available
      if (!route.roles) return true;
      return route.roles.includes(userRole);
    },
    [userRole]
  );

  // Get available routes based on user role
  const availableRoutes = useMemo(() => {
    const routes = [
      { path: "/dashboard", label: "Dashboard", icon: "Home" },
      { path: "/profile", label: "Profile", icon: "User" },
      {
        path: "/upload",
        label: "Upload Data",
        icon: "Upload",
        roles: ["patient"],
      },
      {
        path: "/records",
        label: "My Records",
        icon: "FileText",
        roles: ["patient"],
      },
      {
        path: "/access-history",
        label: "Access History",
        icon: "Clock",
        roles: ["patient"],
      },
      {
        path: "/contribute",
        label: "Contribute Data",
        icon: "Share2",
        roles: ["patient"],
      },
      {
        path: "/browse",
        label: "Browse Data",
        icon: "Search",
        roles: ["researcher"],
      },
      {
        path: "/marketplace",
        label: "Data Market",
        icon: "ShoppingCart",
        roles: ["researcher"],
      },
      { path: "/transactions", label: "Transactions", icon: "DollarSign" },
    ];

    return routes.filter(isRouteAvailable);
  }, [isRouteAvailable]);

  // Example useMemo hook

  // Create context value
  const value = {
    currentPath: location.pathname,
    location,
    navigateTo,
    goBack,
    replaceTo,
    isActive,
    availableRoutes,
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
