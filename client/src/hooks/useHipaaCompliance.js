// src/hooks/useHipaaCompliance.js
import { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

const useHipaaCompliance = (options = {}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user from state to track access
  const userAddress = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);

  // Function to request consent from the user
  const requestConsent = useCallback(
    async (consentType, purpose) => {
      try {
        setLoading(true);
        setError(null);

        // Create an audit log before requesting consent
        await hipaaComplianceService.createAuditLog("CONSENT_REQUESTED", {
          consentType,
          purpose,
          userAddress,
          userRole,
        });

        const granted = window.confirm(
          `HIPAA Consent Required: ${purpose}\n\n` +
            `Do you consent to this operation? This consent will be recorded and audited.`
        );

        // Record the consent decision
        if (granted) {
          await hipaaComplianceService.recordConsent(consentType, true, {
            purpose,
          });
          dispatch(
            addNotification({
              type: "success",
              message: "Thank you for providing consent",
            })
          );
        } else {
          await hipaaComplianceService.recordConsent(consentType, false, {
            purpose,
          });
          dispatch(
            addNotification({
              type: "info",
              message: "Operation canceled - consent not provided",
            })
          );
        }

        return granted;
      } catch (err) {
        setError(err.message);
        dispatch(
          addNotification({
            type: "error",
            message: `Failed to record consent: ${err.message}`,
          })
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, userAddress, userRole]
  );

  const verifyConsent = useCallback(
    async (consentType) => {
      try {
        setLoading(true);
        setError(null);

        const hasConsent = hipaaComplianceService.hasConsent(consentType);

        if (!hasConsent && options.autoRequestConsent) {
          return await requestConsent(
            consentType,
            options.consentPurpose || "Required for this operation"
          );
        }

        return hasConsent;
      } catch (err) {
        setError(err.message);
        dispatch(
          addNotification({
            type: "error",
            message: `HIPAA compliance error: ${err.message}`,
          })
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      dispatch,
      options.autoRequestConsent,
      options.consentPurpose,
      requestConsent,
    ]
  );

  // Optional consent verification on mount
  useEffect(() => {
    if (options.requiredConsent && options.autoVerifyConsent) {
      verifyConsent(options.requiredConsent);
    }
  }, [options.requiredConsent, options.autoVerifyConsent, verifyConsent]);

  const sanitizeData = useCallback((data, sanitizeOptions = {}) => {
    try {
      return hipaaComplianceService.sanitizeData(data, sanitizeOptions);
    } catch (err) {
      console.error("Data sanitization error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  const logDataAccess = useCallback(
    async (dataId, purpose, action = "VIEW") => {
      try {
        setLoading(true);

        // Create audit log for the access
        await hipaaComplianceService.createAuditLog("DATA_ACCESS", {
          dataId,
          purpose,
          action,
          userAddress,
          userRole,
          timestamp: new Date().toISOString(),
        });

        return true;
      } catch (err) {
        console.error("HIPAA audit logging error:", err);
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userAddress, userRole]
  );

  const validateDataAccess = useCallback(
    (dataType, purpose) => {
      try {
        const validationResult = hipaaComplianceService.validateDataAccess(
          dataType,
          purpose
        );

        // If validation failed but we should auto-request consent
        if (!validationResult.isPermitted && options.autoRequestConsent) {
          // Queue up consent requests for the next tick
          setTimeout(() => {
            if (validationResult.requiresConsent) {
              requestConsent(validationResult.consentType, purpose);
            }
          }, 0);
        }

        return validationResult;
      } catch (err) {
        console.error("Data access validation error:", err);
        setError(err.message);
        return { isPermitted: false, error: err.message };
      }
    },
    [options.autoRequestConsent, requestConsent]
  );

  const encryptData = useCallback((data) => {
    try {
      return hipaaComplianceService.encryptData(data);
    } catch (err) {
      console.error("Data encryption error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  const decryptData = useCallback((encryptedData) => {
    try {
      return hipaaComplianceService.decryptData(encryptedData);
    } catch (err) {
      console.error("Data decryption error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  const checkForPHI = useCallback((text) => {
    return hipaaComplianceService.containsPHI(text);
  }, []);

  const verifyDeIdentification = useCallback((data) => {
    return hipaaComplianceService.verifyDeIdentification(data);
  }, []);

  // Export the hook API
  return {
    // State
    loading,
    error,

    // Methods
    verifyConsent,
    requestConsent,
    sanitizeData,
    logDataAccess,
    validateDataAccess,
    encryptData,
    decryptData,
    checkForPHI,
    verifyDeIdentification,

    // Clear error helper
    clearError: () => setError(null),

    // Direct service access for advanced usage
    service: hipaaComplianceService,
  };
};

export default useHipaaCompliance;
