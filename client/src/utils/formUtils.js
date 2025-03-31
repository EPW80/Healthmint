// client/src/utils/formUtils.js

/**
 * Safely converts values for React input elements to prevent NaN warnings
 *
 * @param {any} value - The value to sanitize
 * @param {string} type - The input type (number, text, etc.)
 * @returns {string|number} A safe value for the input
 */
export const sanitizeInputValue = (value, type = "text") => {
  // Return empty string for undefined/null values
  if (value === undefined || value === null) {
    return "";
  }

  // For number inputs
  if (type === "number") {
    // If it's NaN or empty string, return empty string
    if (value === "" || isNaN(value)) {
      return "";
    }
    // Otherwise ensure it's a proper number
    return Number(value);
  }

  // For checkbox inputs - return the value as is
  if (type === "checkbox") {
    return value;
  }

  // For all other inputs, ensure we return a string
  return String(value);
};

/**
 * Ensures a form state object has valid values for all fields
 *
 * @param {Object} formState - The form state object to sanitize
 * @returns {Object} Sanitized form state
 */
export const sanitizeFormState = (formState) => {
  if (!formState || typeof formState !== "object") {
    return {};
  }

  const sanitized = {};

  Object.entries(formState).forEach(([key, value]) => {
    // Handle nested objects recursively
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeFormState(value);
    }
    // Handle arrays (keep them as is)
    else if (Array.isArray(value)) {
      sanitized[key] = value;
    }
    // Special handling for numeric fields that might be NaN
    else if (key === "age" && (value === "" || isNaN(value))) {
      sanitized[key] = "";
    }
    // Handle all other values
    else {
      sanitized[key] = value === undefined || value === null ? "" : value;
    }
  });

  return sanitized;
};

export default {
  sanitizeInputValue,
  sanitizeFormState,
};
