import ValidationService from "../services/validationService.js";
import hipaaCompliance from "./hipaaCompliance.js";

export class ValidationError extends Error {
  constructor(message, code = "VALIDATION_ERROR") {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

// Validate name with enhanced security
const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return "Name is required";
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return "Name must be between 2 and 100 characters";
  }

  // Validate name format (letters, spaces, hyphens, apostrophes only)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return "Name contains invalid characters";
  }

  return true;
};

// Validate age with HIPAA compliance
const validateAge = (age) => {
  const parsedAge = parseInt(age);

  if (!age || isNaN(parsedAge)) {
    return "Valid age is required";
  }

  if (parsedAge < 18 || parsedAge > 120) {
    return "Age must be between 18 and 120";
  }

  return true;
};

// Validate role with access control
const validateRole = (role) => {
  const validRoles = ["patient", "provider", "researcher"];

  if (!role || !validRoles.includes(role)) {
    return "Valid role is required (patient, provider, or researcher)";
  }

  return true;
};

// Validate email with enhanced security
const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return "Valid email is required";
  }

  // Enhanced email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  return true;
};

// Validate emergency contact
const validateEmergencyContact = (contact) => {
  if (!contact.name || !contact.relationship || !contact.phone) {
    return "Emergency contact must include name, relationship, and phone number";
  }

  // Validate phone number
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(contact.phone)) {
    return "Invalid emergency contact phone number";
  }

  return true;
};

// Validate registration with HIPAA compliance
export const validateRegistration = async (req, res, next) => {
  try {
    const {
      address,
      age,
      name,
      role,
      email,
      consentToHIPAA,
      acknowledgePrivacyPractices,
      emergencyContact,
    } = req.body;

    const errors = [];

    // Validate wallet address
    const addressValidation = ValidationService.validateAddress(address);
    if (!addressValidation.isValid) {
      errors.push({
        field: "address",
        message: addressValidation.error,
      });
    }

    // Validate protected health information
    const phiValidation = {
      name: validateName(name),
      age: validateAge(age),
      role: validateRole(role),
      email: email ? validateEmail(email) : true,
      emergencyContact: emergencyContact
        ? validateEmergencyContact(emergencyContact)
        : true,
    };

    // Collect validation errors
    Object.entries(phiValidation).forEach(([field, isValid]) => {
      if (isValid !== true) {
        errors.push({
          field,
          message: isValid,
        });
      }
    });

    // Validate HIPAA compliance requirements
    if (!consentToHIPAA) {
      errors.push({
        field: "consentToHIPAA",
        message: "HIPAA consent is required",
      });
    }

    if (!acknowledgePrivacyPractices) {
      errors.push({
        field: "acknowledgePrivacyPractices",
        message: "Acknowledgment of privacy practices is required",
      });
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Add metadata for audit
    req.validationMetadata = {
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      validatedFields: Object.keys(phiValidation),
    };

    // Encrypt sensitive data before passing to next middleware
    req.body.protectedInfo = await hipaaCompliance.encrypt({
      name,
      age: age.toString(),
      email,
      emergencyContact,
    });

    next();
  } catch (error) {
    next(new ValidationError(error.message));
  }
};

// Validate data access request
export const validateDataAccess = (req, res, next) => {
  try {
    const { purpose, duration, requestedBy } = req.body;

    if (!purpose || typeof purpose !== "string" || purpose.length < 10) {
      return res.status(400).json({
        success: false,
        message:
          "Valid purpose for data access is required (minimum 10 characters)",
      });
    }

    if (!duration || duration < 300000 || duration > 31536000000) {
      // 5 minutes to 1 year
      return res.status(400).json({
        success: false,
        message: "Valid access duration is required (5 minutes to 1 year)",
      });
    }

    const addressValidation = ValidationService.validateAddress(requestedBy);
    if (!addressValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Valid requester address is required",
      });
    }

    next();
  } catch (error) {
    next(new ValidationError(error.message));
  }
};

// Validate consent update
export const validateConsentUpdate = (req, res, next) => {
  try {
    const { consentType, grantedTo, purpose, expirationDate } = req.body;

    const errors = [];

    if (
      !consentType ||
      !["data_access", "research", "treatment"].includes(consentType)
    ) {
      errors.push("Valid consent type is required");
    }

    if (grantedTo) {
      const addressValidation = ValidationService.validateAddress(grantedTo);
      if (!addressValidation.isValid) {
        errors.push("Valid grantee address is required");
      }
    }

    if (!purpose || typeof purpose !== "string" || purpose.length < 10) {
      errors.push("Valid purpose is required (minimum 10 characters)");
    }

    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (isNaN(expDate) || expDate <= new Date()) {
        errors.push("Valid future expiration date is required");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  } catch (error) {
    next(new ValidationError(error.message));
  }
};

// Named exports
export {
  validateName,
  validateAge,
  validateRole,
  validateEmail,
  validateEmergencyContact,
};

// Default export
export default {
  validateRegistration,
  validateDataAccess,
  validateConsentUpdate,
  ValidationError,
};
