// validation/middleware.js
import { ValidationError } from "./errors.js";
import {
  validateAddress,
  validateProfile,
  validateHealthData,
  validateTransaction,
  validateAccessGrant,
  validateIPFSHash,
  sanitizeUserData,
} from "./validators.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";

/**
 * Middleware to validate Ethereum address
 * @param {Object} options - Options for address validation
 * @returns {Function} Express middleware
 */
export const addressValidator = (options = {}) => {
  const {
    source = "body", // 'body', 'query', 'params', or function
    paramName = "address",
    required = true,
    allowNull = false,
    errorStatus = 400,
  } = options;

  return (req, res, next) => {
    try {
      // Get address from the specified source
      let address;
      if (typeof source === "function") {
        address = source(req);
      } else if (source === "body") {
        address = req.body?.[paramName];
      } else if (source === "query") {
        address = req.query?.[paramName];
      } else if (source === "params") {
        address = req.params?.[paramName];
      }

      // Check if required
      if (!address) {
        if (required && !allowNull) {
          return res.status(errorStatus).json({
            success: false,
            error: {
              message: `${paramName} is required`,
              code: "MISSING_ADDRESS",
              field: paramName,
            },
          });
        }
        // Skip validation if not required and not present
        return next();
      }

      // Validate the address
      const result = validateAddress(address);
      if (!result.isValid) {
        return res.status(errorStatus).json({
          success: false,
          error: {
            message: result.error,
            code: result.code,
            field: paramName,
          },
        });
      }

      // Store normalized address in the request
      req.normalizedAddress = result.normalizedAddress;

      // For convenience, also set it in the original location
      if (typeof source === "function") {
        // Can't update this case automatically
      } else if (source === "body" && req.body) {
        req.body[paramName] = result.normalizedAddress;
      } else if (source === "query" && req.query) {
        req.query[paramName] = result.normalizedAddress;
      } else if (source === "params" && req.params) {
        req.params[paramName] = result.normalizedAddress;
      }

      next();
    } catch (error) {
      next(
        new ValidationError(
          error.message || "Address validation failed",
          error.code || "VALIDATION_ERROR",
          paramName
        )
      );
    }
  };
};

/**
 * Middleware to validate profile data
 * @returns {Function} Express middleware
 */
export const profileValidator = (req, res, next) => {
  try {
    const profileData = req.body;

    if (!profileData || typeof profileData !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Profile data is required",
          code: "MISSING_PROFILE_DATA",
        },
      });
    }

    // Validate profile data
    const result = validateProfile(profileData);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: "Profile validation failed",
        errors: result.errors,
      });
    }

    // Add sanitized data to the request
    req.sanitizedData = sanitizeUserData(profileData);

    next();
  } catch (error) {
    next(
      new ValidationError(
        error.message || "Profile validation failed",
        error.code || "VALIDATION_ERROR"
      )
    );
  }
};

/**
 * Middleware to validate health data
 * @returns {Function} Express middleware
 */
export const healthDataValidator = (req, res, next) => {
  try {
    const healthData = req.body;

    if (!healthData || typeof healthData !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Health data is required",
          code: "MISSING_HEALTH_DATA",
        },
      });
    }

    // Validate health data
    const result = validateHealthData(healthData);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: "Health data validation failed",
        errors: result.errors,
      });
    }

    // If there are warnings, add them to the request
    if (result.warnings && result.warnings.length > 0) {
      req.validationWarnings = result.warnings;
    }

    next();
  } catch (error) {
    next(
      new ValidationError(
        error.message || "Health data validation failed",
        error.code || "VALIDATION_ERROR"
      )
    );
  }
};

/**
 * Middleware to validate transaction data
 * @returns {Function} Express middleware
 */
export const transactionValidator = (req, res, next) => {
  try {
    const transactionData = req.body;

    if (!transactionData || typeof transactionData !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Transaction data is required",
          code: "MISSING_TRANSACTION_DATA",
        },
      });
    }

    // Validate transaction data
    const result = validateTransaction(transactionData);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: "Transaction validation failed",
        errors: result.errors,
      });
    }

    next();
  } catch (error) {
    next(
      new ValidationError(
        error.message || "Transaction validation failed",
        error.code || "VALIDATION_ERROR"
      )
    );
  }
};

/**
 * Middleware to validate access grant data
 * @returns {Function} Express middleware
 */
export const accessGrantValidator = (req, res, next) => {
  try {
    const accessData = req.body;

    if (!accessData || typeof accessData !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Access grant data is required",
          code: "MISSING_ACCESS_DATA",
        },
      });
    }

    // Validate access grant data
    const result = validateAccessGrant(accessData);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: "Access grant validation failed",
        errors: result.errors,
      });
    }

    next();
  } catch (error) {
    next(
      new ValidationError(
        error.message || "Access grant validation failed",
        error.code || "VALIDATION_ERROR"
      )
    );
  }
};

/**
 * Middleware to validate IPFS hash
 * @param {Object} options - Options for IPFS hash validation
 * @returns {Function} Express middleware
 */
export const ipfsHashValidator = (options = {}) => {
  const { source = "body", paramName = "ipfsHash", required = true } = options;

  return (req, res, next) => {
    try {
      // Get hash from the specified source
      let hash;
      if (source === "body") {
        hash = req.body?.[paramName];
      } else if (source === "query") {
        hash = req.query?.[paramName];
      } else if (source === "params") {
        hash = req.params?.[paramName];
      }

      // Check if required
      if (!hash) {
        if (required) {
          return res.status(400).json({
            success: false,
            error: {
              message: `IPFS hash is required`,
              code: "MISSING_HASH",
              field: paramName,
            },
          });
        }
        // Skip validation if not required and not present
        return next();
      }

      // Validate the hash
      const result = validateIPFSHash(hash);
      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      next();
    } catch (error) {
      next(
        new ValidationError(
          error.message || "IPFS hash validation failed",
          error.code || "VALIDATION_ERROR",
          paramName
        )
      );
    }
  };
};

/**
 * Comprehensive registration validator with HIPAA compliance checks
 * @returns {Function} Express middleware
 */
export const registrationValidator = async (req, res, next) => {
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
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      errors.push({
        field: "address",
        message: addressValidation.error,
        code: addressValidation.code,
      });
    }

    // Validate name
    if (!name) {
      errors.push({
        field: "name",
        message: "Name is required",
        code: "MISSING_NAME",
      });
    } else if (
      typeof name !== "string" ||
      name.length < 2 ||
      name.length > 100
    ) {
      errors.push({
        field: "name",
        message: "Name must be between 2 and 100 characters",
        code: "INVALID_NAME_LENGTH",
      });
    }

    // Validate age
    if (!age) {
      errors.push({
        field: "age",
        message: "Age is required",
        code: "MISSING_AGE",
      });
    } else {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
        errors.push({
          field: "age",
          message: "Age must be between 18 and 120",
          code: "INVALID_AGE",
        });
      }
    }

    // Validate role
    if (!role) {
      errors.push({
        field: "role",
        message: "Role is required",
        code: "MISSING_ROLE",
      });
    } else {
      const validRoles = ["patient", "provider", "researcher"];
      if (!validRoles.includes(role)) {
        errors.push({
          field: "role",
          message: `Role must be one of: ${validRoles.join(", ")}`,
          code: "INVALID_ROLE",
        });
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        errors.push({
          field: "email",
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        });
      }
    }

    // Validate emergency contact if provided
    if (emergencyContact) {
      if (!emergencyContact.name) {
        errors.push({
          field: "emergencyContact.name",
          message: "Emergency contact name is required",
          code: "MISSING_EMERGENCY_CONTACT_NAME",
        });
      }

      if (!emergencyContact.relationship) {
        errors.push({
          field: "emergencyContact.relationship",
          message: "Emergency contact relationship is required",
          code: "MISSING_EMERGENCY_CONTACT_RELATIONSHIP",
        });
      }

      if (!emergencyContact.phone) {
        errors.push({
          field: "emergencyContact.phone",
          message: "Emergency contact phone is required",
          code: "MISSING_EMERGENCY_CONTACT_PHONE",
        });
      } else {
        // Basic phone validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(emergencyContact.phone)) {
          errors.push({
            field: "emergencyContact.phone",
            message: "Invalid emergency contact phone number",
            code: "INVALID_PHONE",
          });
        }
      }
    }

    // Validate HIPAA compliance requirements
    if (!consentToHIPAA) {
      errors.push({
        field: "consentToHIPAA",
        message: "HIPAA consent is required",
        code: "MISSING_HIPAA_CONSENT",
      });
    }

    if (!acknowledgePrivacyPractices) {
      errors.push({
        field: "acknowledgePrivacyPractices",
        message: "Acknowledgment of privacy practices is required",
        code: "MISSING_PRIVACY_ACKNOWLEDGMENT",
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
      validatedFields: [
        "address",
        "name",
        "age",
        "role",
        "email",
        "emergencyContact",
        "consents",
      ],
    };

    // Add normalized address to the request
    if (addressValidation.isValid) {
      req.normalizedAddress = addressValidation.normalizedAddress;
    }

    // Encrypt sensitive data before passing to next middleware
    try {
      req.body.protectedInfo = await hipaaCompliance.encrypt({
        name,
        age: age.toString(),
        email,
        emergencyContact,
      });
    } catch (encryptionError) {
      return next(
        new ValidationError(
          "Failed to encrypt sensitive information",
          "ENCRYPTION_ERROR",
          null,
          { originalError: encryptionError.message }
        )
      );
    }

    next();
  } catch (error) {
    next(
      new ValidationError(
        error.message || "Registration validation failed",
        error.code || "VALIDATION_ERROR"
      )
    );
  }
};

// Export all middleware validators
export default {
  addressValidator,
  profileValidator,
  healthDataValidator,
  transactionValidator,
  accessGrantValidator,
  ipfsHashValidator,
  registrationValidator,
};
