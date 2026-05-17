// client/src/contexts/ErrorContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

// Create the error context
const ErrorContext = createContext({
  errors: {},
  addError: () => {},
  removeError: () => {},
  clearErrors: () => {},
  hasErrors: false,
});

export const ErrorProvider = ({ children, userIdentifier }) => {
  // Track errors by component
  const [errors, setErrors] = useState({});

  // Check if there are any errors
  const hasErrors = Object.keys(errors).length > 0;

  // Function to add an error for a specific component
  const addError = useCallback(
    (componentId, error, metadata = {}) => {
      const errorMessage =
        typeof error === "string"
          ? error
          : error.message || "An error occurred";

      setErrors((prev) => ({
        ...prev,
        [componentId]: {
          message: errorMessage,
          timestamp: new Date().toISOString(),
          stack: error.stack,
          ...metadata,
          originalError: error,
        },
      }));

      // Log error for HIPAA compliance (omitting sensitive details)
      try {
        hipaaComplianceService.createAuditLog("ERROR_OCCURRED", {
          componentId,
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          errorType: error.name || "Error",
          // Don't include the full error message as it might contain PHI
          errorCode: metadata.errorCode || "UNKNOWN",
          severity: metadata.severity || "ERROR",
        });
      } catch (loggingError) {
        // Don't let logging failures compound the original error
        console.error("Error logging failed:", loggingError);
      }

      // Log to console in development (with full details)
      if (process.env.NODE_ENV !== "production") {
        console.error(`[${componentId}] Error:`, error, metadata);
      }
    },
    [userIdentifier]
  );

  // Remove an error for a specific component
  const removeError = useCallback((componentId) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[componentId];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const value = {
    errors,
    addError,
    removeError,
    clearErrors,
    hasErrors,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
};

// Prop types for the error provider
ErrorProvider.propTypes = {
  children: PropTypes.node.isRequired,
  userIdentifier: PropTypes.string, // Optional user ID for HIPAA logging
};

// Custom hook for using the error context
export const useError = () => {
  const context = useContext(ErrorContext);

  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }

  return context;
};

// Higher order component for automatic error boundary integration
export const withErrorHandling = (Component, componentId) => {
  const WithErrorHandling = (props) => {
    const { addError, removeError } = useError();

    // Create error handler function to pass to component
    const handleError = useCallback(
      (error, metadata) => {
        addError(componentId, error, metadata);
      },
      [addError]
    );

    // Clear error when component unmounts
    React.useEffect(() => {
      return () => {
        removeError(componentId);
      };
    }, [removeError]);

    return <Component {...props} onError={handleError} />;
  };

  WithErrorHandling.displayName = `WithErrorHandling(${Component.displayName || Component.name || "Component"})`;

  return WithErrorHandling;
};

export default ErrorContext;
