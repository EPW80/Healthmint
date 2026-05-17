// client/src/hooks/useAsyncOperation.js
import { useState, useCallback } from "react";
import { useError } from "../contexts/ErrorContext";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

const useAsyncOperation = (options = {}) => {
  const {
    componentId = "unknown",
    onSuccess,
    onError: onErrorCallback,
    userId = "",
  } = options;

  // Get error handling from context
  const { addError, removeError } = useError();

  // Track loading state
  const [loading, setLoading] = useState(false);

  // Create a sanitized metadata object that is HIPAA compliant
  const createSafeMetadata = (operation, args) => {
    const argInfo = args.map((arg) =>
      typeof arg === "object"
        ? Array.isArray(arg)
          ? `Array[${arg.length}]`
          : `Object`
        : typeof arg
    );

    return {
      operation: operation || "unknown_operation",
      argumentTypes: argInfo,
      timestamp: new Date().toISOString(),
    };
  };

  // Execute an async operation with consistent error handling
  const execute = useCallback(
    async (asyncFn, ...args) => {
      setLoading(true);
      removeError(componentId); // Clear any previous errors

      // Log the operation start for HIPAA compliance
      try {
        hipaaComplianceService.createAuditLog("ASYNC_OPERATION_START", {
          componentId,
          userId,
          timestamp: new Date().toISOString(),
          operation: asyncFn.name || "unknown_operation",
        });
      } catch (loggingError) {
        console.error("Failed to log operation start:", loggingError);
        // Continue with the operation even if logging fails
      }

      try {
        const result = await asyncFn(...args);

        // Log successful completion for HIPAA compliance
        try {
          hipaaComplianceService.createAuditLog("ASYNC_OPERATION_SUCCESS", {
            componentId,
            userId,
            timestamp: new Date().toISOString(),
            operation: asyncFn.name || "unknown_operation",
          });
        } catch (loggingError) {
          console.error("Failed to log operation success:", loggingError);
          // Continue even if logging fails
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        // Create sanitized metadata for error handling
        const safeMetadata = createSafeMetadata(asyncFn.name, args);

        // Add error to global error state
        addError(componentId, error, safeMetadata);

        try {
          hipaaComplianceService.createAuditLog("ASYNC_OPERATION_ERROR", {
            componentId,
            userId,
            timestamp: new Date().toISOString(),
            operation: asyncFn.name || "unknown_operation",
            errorType: error.name || "Error",
          });
        } catch (loggingError) {
          console.error("Failed to log operation error:", loggingError);
          // Continue with error handling even if logging fails
        }

        // Call additional error callback if provided
        if (onErrorCallback) {
          onErrorCallback(error);
        }

        throw error; // Re-throw to allow local handling
      } finally {
        setLoading(false);
      }
    },
    [componentId, addError, removeError, onSuccess, onErrorCallback, userId]
  );

  return {
    loading,
    execute,
    clearError: () => removeError(componentId),
  };
};

export default useAsyncOperation;
