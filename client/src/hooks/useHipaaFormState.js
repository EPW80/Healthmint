// client/src/hooks/useHipaaFormState.js
import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing HIPAA compliant form state with audit logging
 * 
 * @param {Object} initialState - Initial form state
 * @param {Object} options - Additional options
 * @param {Function} options.sanitizeField - Function to sanitize field values for HIPAA compliance
 * @param {Function} options.logFieldChange - Function to log field changes for HIPAA compliance
 * @param {Function} options.validate - Function to validate form state
 * @param {Object} options.hipaaService - HIPAA compliance service for logging
 * @returns {Object} Form state management utilities
 */
const useHipaaFormState = (initialState = {}, options = {}) => {
  const { 
    sanitizeField, 
    logFieldChange, 
    validate, 
    hipaaService,
    userIdentifier,
    formType = 'profile'
  } = options;
  
  // Store form state
  const [formState, setFormState] = useState(initialState);
  
  // Track initial state for comparison
  const [initialFormState, setInitialFormState] = useState(initialState);
  
  // Track validation errors
  const [errors, setErrors] = useState({});
  
  // Track form dirty state
  const [isDirty, setIsDirty] = useState(false);
  
  // Track fields accessed/modified for HIPAA audit trail
  const [accessedFields, setAccessedFields] = useState(new Set());

  // Update the initial state when it changes externally
  useEffect(() => {
    setInitialFormState(initialState);
    setFormState(initialState);
  }, [initialState]);

  // Check if form is dirty (values changed from initial)
  useEffect(() => {
    // Simple deep comparison to check if values changed
    const isChanged = JSON.stringify(formState) !== JSON.stringify(initialFormState);
    setIsDirty(isChanged);
  }, [formState, initialFormState]);

  // Log field access for HIPAA compliance
  const trackFieldAccess = useCallback((fieldPath) => {
    setAccessedFields((prev) => {
      const updated = new Set(prev);
      updated.add(fieldPath);
      return updated;
    });

    // Log field access if HIPAA service is provided
    if (hipaaService && typeof hipaaService.logFieldAccess === 'function') {
      hipaaService.logFieldAccess(userIdentifier, fieldPath, `${formType}_access`);
    }
  }, [hipaaService, userIdentifier, formType]);

  // Handle field change with HIPAA compliance
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    
    // Track field access
    trackFieldAccess(name);
    
    // Apply sanitization if provided
    const sanitizedValue = 
      sanitizeField && type !== 'checkbox'
        ? sanitizeField(value, name)
        : value;
    
    // For nested properties (using dot notation: person.name)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      setFormState(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : sanitizedValue
        }
      }));
      
      // Log field change for HIPAA compliance
      if (logFieldChange) {
        logFieldChange(`${parent}.${child}`, type === 'checkbox' ? checked : sanitizedValue, {
          fieldType: 'nested',
          formType,
          timestamp: new Date().toISOString(),
          userIdentifier
        });
      }
      
      // Log sensitive field changes for HIPAA compliance
      const sensitiveFields = ['sharingPreferences', 'privacyPreferences'];
      if (sensitiveFields.includes(parent) && hipaaService) {
        hipaaService.createAuditLog("SENSITIVE_FIELD_CHANGE", {
          fieldName: `${parent}.${child}`,
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          formType,
          valueChanged: true, // Don't log the actual value for privacy
        });
      }
    } else {
      // For regular fields
      setFormState(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : sanitizedValue
      }));
      
      // Log field change for HIPAA compliance
      if (logFieldChange) {
        logFieldChange(name, type === 'checkbox' ? checked : sanitizedValue, {
          fieldType: 'standard',
          formType,
          timestamp: new Date().toISOString(),
          userIdentifier
        });
      }
      
      // Log demographic info changes
      const demographicFields = ['name', 'email', 'age', 'bio'];
      if (demographicFields.includes(name) && hipaaService) {
        hipaaService.createAuditLog("DEMOGRAPHIC_FIELD_CHANGE", {
          fieldName: name,
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          formType,
          valueChanged: true, // Don't log the actual value for privacy
        });
      }
    }
    
    // Clear validation error for this field when it changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [sanitizeField, logFieldChange, errors, hipaaService, userIdentifier, formType, trackFieldAccess]);

  // Update form state directly (useful for non-input changes or bulk updates)
  const setFieldValue = useCallback((fieldName, value) => {
    // Track field access
    trackFieldAccess(fieldName);
    
    if (fieldName.includes('.')) {
      const [parent, child] = fieldName.split('.');
      
      setFormState(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
      
      // Log field change for HIPAA compliance
      if (logFieldChange) {
        logFieldChange(`${parent}.${child}`, value, {
          fieldType: 'nested',
          formType,
          timestamp: new Date().toISOString(),
          userIdentifier,
          updateMethod: 'direct'
        });
      }
    } else {
      setFormState(prev => ({
        ...prev,
        [fieldName]: value
      }));
      
      // Log field change for HIPAA compliance
      if (logFieldChange) {
        logFieldChange(fieldName, value, {
          fieldType: 'standard',
          formType,
          timestamp: new Date().toISOString(),
          userIdentifier,
          updateMethod: 'direct'
        });
      }
    }
    
    // Clear validation error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [logFieldChange, errors, formType, userIdentifier, trackFieldAccess]);

  // Specialized handler for array fields (like publications)
  const handleArrayFieldChange = useCallback((fieldName, newArray) => {
    // Track field access
    trackFieldAccess(fieldName);
    
    // Update the array field
    setFormState(prev => ({
      ...prev,
      [fieldName]: newArray
    }));
    
    // Log field change for HIPAA compliance
    if (logFieldChange) {
      logFieldChange(fieldName, newArray, {
        fieldType: 'array',
        arrayLength: newArray.length,
        formType,
        timestamp: new Date().toISOString(),
        userIdentifier,
        updateMethod: 'array_update'
      });
    }
    
    // Clear validation error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [logFieldChange, errors, formType, userIdentifier, trackFieldAccess]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setErrors({});
    
    // Log form reset for HIPAA compliance
    if (hipaaService) {
      hipaaService.createAuditLog("FORM_RESET", {
        formType,
        timestamp: new Date().toISOString(),
        userId: userIdentifier,
        action: "RESET"
      });
    }
  }, [initialFormState, hipaaService, formType, userIdentifier]);

  // Validate the form and return whether it's valid
  const validateForm = useCallback(() => {
    if (typeof validate !== 'function') {
      return true;
    }
    
    const validationErrors = validate(formState);
    
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Log validation failure for HIPAA compliance
      if (hipaaService) {
        hipaaService.createAuditLog("FORM_VALIDATION", {
          formType,
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          action: "VALIDATION_FAILED",
          errorCount: Object.keys(validationErrors).length
        });
      }
      
      return false;
    }
    
    setErrors({});
    
    // Log validation success for HIPAA compliance
    if (hipaaService) {
      hipaaService.createAuditLog("FORM_VALIDATION", {
        formType,
        timestamp: new Date().toISOString(),
        userId: userIdentifier,
        action: "VALIDATION_SUCCESS"
      });
    }
    
    return true;
  }, [formState, validate, hipaaService, formType, userIdentifier]);

  // Get changed fields (useful for partially updating records)
  const getChangedFields = useCallback(() => {
    const changedFields = {};
    
    // Compare each field to find changes
    const compareObjects = (current, initial, path = '') => {
      if (typeof current !== 'object' || current === null || 
          typeof initial !== 'object' || initial === null) {
        if (current !== initial) {
          changedFields[path] = current;
        }
        return;
      }
      
      // Handle nested objects
      Object.keys(current).forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        
        if (typeof current[key] === 'object' && current[key] !== null) {
          compareObjects(current[key], initial[key] || {}, newPath);
        } else if (current[key] !== initial[key]) {
          changedFields[newPath] = current[key];
        }
      });
    };
    
    compareObjects(formState, initialFormState);
    return changedFields;
  }, [formState, initialFormState]);

  return {
    formState,
    handleChange,
    setFieldValue,
    handleArrayFieldChange,
    resetForm,
    errors,
    isDirty,
    validateForm,
    getChangedFields,
    accessedFields,
    setFormState,
    initialFormState,
    setInitialFormState,
    trackFieldAccess
  };
};

export default useHipaaFormState;