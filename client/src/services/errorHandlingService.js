// src/services/errorHandlingService.js
import { store } from "../redux/store.js";
import { setError } from "../redux/slices/uiSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { ENV } from "../config/environmentConfig.js";

class ErrorHandlingService {
  handleError(error, options = {}) {
    const {
      context = "Application",
      showNotification = true,
      notificationType = "error",
      customMessage,
      duration = 5000,
      logToConsole = true,
      setGlobalError = false,
    } = options;

    // Create a standardized error object
    const standardError = this.standardizeError(error, context);

    // Log error appropriately based on environment
    if (logToConsole) {
      this.logError(standardError, context);
    }

    // Add a notification if requested
    if (showNotification) {
      const message = customMessage || standardError.userMessage;
      store.dispatch(
        addNotification({
          type: notificationType,
          message,
          duration,
        })
      );
    }

    // Set global error state if requested
    if (setGlobalError) {
      store.dispatch(setError(standardError.userMessage));
    }

    // Return the standardized error for potential further handling
    return standardError;
  }

  standardizeError(error, context = "Application") {
    // Initialize a standardized error object
    const standardError = {
      originalError: error,
      message:
        typeof error === "string"
          ? error
          : error?.message || "An unknown error occurred",
      code: error?.code || "UNKNOWN_ERROR",
      context,
      timestamp: new Date().toISOString(),
      // Create a user-friendly message based on environment
      userMessage: ENV.IS_PRODUCTION
        ? this.getProductionErrorMessage(error, context)
        : this.getDevelopmentErrorMessage(error, context),
    };

    // Add stack trace in development
    if (!ENV.IS_PRODUCTION) {
      standardError.stack = error?.stack;
    }

    return standardError;
  }

  getProductionErrorMessage(error, context) {
    // In production, give generic messages to avoid exposing sensitive info
    const genericMessages = {
      Authentication: "Authentication failed. Please try again.",
      "Data Upload": "Failed to upload data. Please try again.",
      "User Profile": "Failed to update profile. Please try again.",
      Network:
        "Network connection issue. Please check your connection and try again.",
      Server: "Server error occurred. Please try again later.",
      Wallet:
        "Wallet connection issue. Please ensure your wallet is configured correctly.",
      Blockchain: "Blockchain interaction failed. Please try again.",
      Database: "Data operation failed. Please try again.",
    };

    // Return a generic message based on context, or a default message
    return genericMessages[context] || "An error occurred. Please try again.";
  }

  getDevelopmentErrorMessage(error, context) {
    // In development, provide more detailed error information
    const errorCode = error?.code ? `[${error.code}]` : "";
    const errorMessage =
      typeof error === "string" ? error : error?.message || "Unknown error";

    return `${context} Error ${errorCode}: ${errorMessage}`;
  }

  logError(standardError, context) {
    if (ENV.IS_PRODUCTION) {
      // In production, we might want to send errors to a monitoring service
      if (ENV.ERROR_MONITORING_ENABLED) {
        this.sendToErrorMonitoring(standardError);
      }

      // Still log to console, but with less detail
      console.error(`[${context}] Error: ${standardError.message}`);
    } else {
      // In development, log full error details to console
      console.error(`[${context}] Error Details:`, {
        message: standardError.message,
        code: standardError.code,
        context,
        timestamp: standardError.timestamp,
        stack: standardError.stack,
        originalError: standardError.originalError,
      });
    }
  }

  sendToErrorMonitoring(standardError) {
    // This would be implemented based on your error monitoring solution
    // For example, Sentry, LogRocket, etc.
    if (window.errorMonitoringService) {
      window.errorMonitoringService.captureException(
        standardError.originalError,
        {
          extra: {
            context: standardError.context,
            timestamp: standardError.timestamp,
            code: standardError.code,
          },
        }
      );
    }
  }

  createAsyncErrorHandler(fn, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, options);
        // Re-throw or return based on options
        if (options.rethrow !== false) {
          throw error;
        }
        return options.defaultValue;
      }
    };
  }
}

const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;
