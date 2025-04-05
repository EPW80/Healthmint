// src/hooks/useHipaaCompliance.js
import { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * Custom hook for HIPAA compliance functionality
 *
 * Provides a consistent way to handle HIPAA requirements across components
 * and connects to the HIPAA compliance service
 */
const useHipaaCompliance = (options = {}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user from state to track access
  const userAddress = useSelector((state) => state.wallet.address);
  const userRole = useSelector((state) => state.role.role);

  /**
   * Request consent from user for a specific purpose
   * @param {string} consentType - Type of consent required
   * @param {string} purpose - Purpose of the consent request
   * @returns {Promise<boolean>} Whether consent was granted
   */

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

        // Prompt the user for consent
        // This is a placeholder for the actual consent request logic
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

  /**
   * Verify if user has given necessary consent
   * @param {string} consentType - Type of consent to verify
   * @returns {Promise<boolean>} Whether consent is granted
   */
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

  /**
   * Sanitize data according to HIPAA requirements
   * @param {Object} data - Data to sanitize
   * @param {Object} sanitizeOptions - Sanitization options
   * @returns {Object} Sanitized data
   */
  const sanitizeData = useCallback((data, sanitizeOptions = {}) => {
    try {
      return hipaaComplianceService.sanitizeData(data, sanitizeOptions);
    } catch (err) {
      console.error("Data sanitization error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Log access to data for HIPAA compliance
   * @param {string} dataId - ID of the data being accessed
   * @param {string} purpose - Purpose of access
   * @param {string} action - Type of action (view, modify, share, etc)
   * @returns {Promise<boolean>} Success status
   */
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

  /**
   * Verify if data access is permitted under HIPAA rules
   * @param {string} dataType - Type of data being accessed
   * @param {string} purpose - Purpose of access
   * @returns {Object} Access validation result
   */
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

  /**
   * Handles secure data encryption
   * @param {string|Object} data - Data to encrypt
   * @returns {string} Encrypted data or null if error
   */
  const encryptData = useCallback((data) => {
    try {
      return hipaaComplianceService.encryptData(data);
    } catch (err) {
      console.error("Data encryption error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Handles secure data decryption
   * @param {string} encryptedData - Data to decrypt
   * @returns {string|Object} Decrypted data or null if error
   */
  const decryptData = useCallback((encryptedData) => {
    try {
      return hipaaComplianceService.decryptData(encryptedData);
    } catch (err) {
      console.error("Data decryption error:", err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Checks if a string contains potential PHI
   * @param {string} text - Text to check
   * @returns {Object} Results with PHI types found
   */
  const checkForPHI = useCallback((text) => {
    return hipaaComplianceService.containsPHI(text);
  }, []);

  /**
   * Verifies that data is properly de-identified according to HIPAA
   * @param {Object} data - Data to verify
   * @returns {Object} Verification result with issues
   */
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
