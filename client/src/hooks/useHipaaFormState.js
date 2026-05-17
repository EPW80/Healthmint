// client/src/hooks/useHipaaFormState.js
import { useState, useCallback, useEffect, useRef } from "react";

// Custom hook for managing form state with HIPAA compliance
const useHipaaFormState = (initialState = {}, options = {}) => {
  const {
    sanitizeField,
    logFieldChange,
    validate,
    hipaaService,
    userIdentifier,
    formType = "profile",
  } = options;

  const [formState, setFormState] = useState(initialState);
  const [initialFormState, setInitialFormState] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [accessedFields, setAccessedFields] = useState(new Set());
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      setInitialFormState(initialState);
      setFormState(initialState);
      didMountRef.current = true;
    }
  }, [initialState]);

  useEffect(() => {
    const isChanged =
      JSON.stringify(formState) !== JSON.stringify(initialFormState);
    setIsDirty(isChanged);
  }, [formState, initialFormState]);

  const trackFieldAccess = useCallback(
    (fieldPath) => {
      setAccessedFields((prev) => {
        const updated = new Set(prev);
        updated.add(fieldPath);
        return updated;
      });

      // Log field access if HIPAA service is provided
      if (hipaaService && typeof hipaaService.logFieldAccess === "function") {
        hipaaService.logFieldAccess(
          userIdentifier,
          fieldPath,
          `${formType}_access`
        );
      }
    },
    [hipaaService, userIdentifier, formType]
  );

  // Handle field change with HIPAA compliance
  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;

      // Track field access
      trackFieldAccess(name);

      // Apply sanitization if provided
      const sanitizedValue =
        sanitizeField && type !== "checkbox"
          ? sanitizeField(value, name)
          : value;

      // For nested properties (using dot notation: person.name)
      if (name.includes(".")) {
        const [parent, child] = name.split(".");

        setFormState((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === "checkbox" ? checked : sanitizedValue,
          },
        }));

        // Log field change for HIPAA compliance
        if (logFieldChange) {
          logFieldChange(
            `${parent}.${child}`,
            type === "checkbox" ? checked : sanitizedValue,
            {
              fieldType: "nested",
              formType,
              timestamp: new Date().toISOString(),
              userIdentifier,
            }
          );
        }

        // Log sensitive field changes for HIPAA compliance
        const sensitiveFields = ["sharingPreferences", "privacyPreferences"];
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
        setFormState((prev) => ({
          ...prev,
          [name]: type === "checkbox" ? checked : sanitizedValue,
        }));

        // Log field change for HIPAA compliance
        if (logFieldChange) {
          logFieldChange(name, type === "checkbox" ? checked : sanitizedValue, {
            fieldType: "standard",
            formType,
            timestamp: new Date().toISOString(),
            userIdentifier,
          });
        }

        // Log demographic info changes
        const demographicFields = ["name", "email", "age", "bio"];
        if (demographicFields.includes(name) && hipaaService) {
          hipaaService.createAuditLog("DEMOGRAPHIC_FIELD_CHANGE", {
            fieldName: name,
            timestamp: new Date().toISOString(),
            userId: userIdentifier,
            formType,
            valueChanged: true,
          });
        }
      }

      // Clear validation error for this field when it changes
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [
      sanitizeField,
      logFieldChange,
      errors,
      hipaaService,
      userIdentifier,
      formType,
      trackFieldAccess,
    ]
  );

  // Update form state directly (useful for non-input changes or bulk updates)
  const setFieldValue = useCallback(
    (fieldName, value) => {
      // Track field access
      trackFieldAccess(fieldName);

      if (fieldName.includes(".")) {
        const [parent, child] = fieldName.split(".");

        setFormState((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));

        // Log field change for HIPAA compliance
        if (logFieldChange) {
          logFieldChange(`${parent}.${child}`, value, {
            fieldType: "nested",
            formType,
            timestamp: new Date().toISOString(),
            userIdentifier,
            updateMethod: "direct",
          });
        }
      } else {
        setFormState((prev) => ({
          ...prev,
          [fieldName]: value,
        }));

        // Log field change for HIPAA compliance
        if (logFieldChange) {
          logFieldChange(fieldName, value, {
            fieldType: "standard",
            formType,
            timestamp: new Date().toISOString(),
            userIdentifier,
            updateMethod: "direct",
          });
        }
      }

      // Clear validation error for this field
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    },
    [logFieldChange, errors, formType, userIdentifier, trackFieldAccess]
  );

  const handleArrayFieldChange = useCallback(
    (fieldName, newArray) => {
      // Track field access
      trackFieldAccess(fieldName);

      // Update the array field
      setFormState((prev) => ({
        ...prev,
        [fieldName]: newArray,
      }));

      // Log field change for HIPAA compliance
      if (logFieldChange) {
        logFieldChange(fieldName, newArray, {
          fieldType: "array",
          arrayLength: newArray.length,
          formType,
          timestamp: new Date().toISOString(),
          userIdentifier,
          updateMethod: "array_update",
        });
      }

      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    },
    [logFieldChange, errors, formType, userIdentifier, trackFieldAccess]
  );

  const resetForm = useCallback(
    (newState = null) => {
      const stateToUse = newState || initialFormState;
      setFormState(stateToUse);
      setErrors({});

      // Log form reset for HIPAA compliance
      if (hipaaService) {
        hipaaService.createAuditLog("FORM_RESET", {
          formType,
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          action: "RESET",
        });
      }
    },
    [formType, hipaaService, initialFormState, userIdentifier]
  );

  // Validate the form and return whether it's valid
  const validateForm = useCallback(() => {
    if (typeof validate !== "function") {
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
          errorCount: Object.keys(validationErrors).length,
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
        action: "VALIDATION_SUCCESS",
      });
    }

    return true;
  }, [formState, validate, hipaaService, formType, userIdentifier]);

  // Get changed fields (useful for partially updating records)
  const getChangedFields = useCallback(() => {
    const changedFields = {};

    // Compare each field to find changes
    const compareObjects = (current, initial, path = "") => {
      if (
        typeof current !== "object" ||
        current === null ||
        typeof initial !== "object" ||
        initial === null
      ) {
        if (current !== initial) {
          changedFields[path] = current;
        }
        return;
      }

      // Handle nested objects
      Object.keys(current).forEach((key) => {
        const newPath = path ? `${path}.${key}` : key;

        if (typeof current[key] === "object" && current[key] !== null) {
          compareObjects(current[key], initial[key] || {}, newPath);
        } else if (current[key] !== initial[key]) {
          changedFields[newPath] = current[key];
        }
      });
    };

    compareObjects(formState, initialFormState);
    return changedFields;
  }, [formState, initialFormState]);

  // Set a new initial form state (memoized to prevent renders)
  const setInitialFormStateImpl = useCallback((newInitialState) => {
    setInitialFormState(newInitialState);
  }, []);

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
    setInitialFormState: setInitialFormStateImpl,
    trackFieldAccess,
  };
};

export default useHipaaFormState;
