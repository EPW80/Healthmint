// src/hooks/useNavigation.js
import { useContext } from "react";
import { NavigationContext } from "../components/providers/NavigationProvider.js";

// Hook to access navigation state and methods from the NavigationProvider
const useNavigation = () => {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
};

export default useNavigation;
