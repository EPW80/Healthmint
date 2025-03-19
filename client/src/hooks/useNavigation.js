// src/hooks/useNavigation.js
import { useContext } from "react";
import { NavigationContext } from "../components/providers/NavigationProvider.js";

/**
 * Custom hook to access the navigation context
 * @returns {Object} Navigation context
 */
const useNavigation = () => {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
};

export default useNavigation;
