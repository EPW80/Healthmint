// validation/index.js

// Import all validation modules
import { ValidationError } from "./errors.js";
import * as validators from "./validators.js";
import * as middleware from "./middleware.js";

// Re-export individual modules
export * from "./errors.js";
export * from "./validators.js";
export * from "./middleware.js";

/**
 * High-level validation API for convenience
 * Provides access to both validation functions and middleware
 */
const ValidationModule = {
  // Error handling
  ValidationError,

  // Pure validators
  validateAddress: validators.validateAddress,
  validateProfile: validators.validateProfile,
  validateHealthData: validators.validateHealthData,
  validateTransaction: validators.validateTransaction,
  validateAccessGrant: validators.validateAccessGrant,
  validateIPFSHash: validators.validateIPFSHash,
  sanitizeUserData: validators.sanitizeUserData,

  // Middleware validators
  middleware: {
    address: middleware.addressValidator,
    profile: middleware.profileValidator,
    healthData: middleware.healthDataValidator,
    transaction: middleware.transactionValidator,
    accessGrant: middleware.accessGrantValidator,
    ipfsHash: middleware.ipfsHashValidator,
    registration: middleware.registrationValidator,
  },

  /**
   * Validate input data with appropriate validator based on type
   * @param {string} type - Type of data to validate
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validate(type, data) {
    switch (type.toLowerCase()) {
      case "address":
        return validators.validateAddress(data);
      case "profile":
        return validators.validateProfile(data);
      case "health":
      case "healthdata":
        return validators.validateHealthData(data);
      case "transaction":
        return validators.validateTransaction(data);
      case "access":
      case "accessgrant":
        return validators.validateAccessGrant(data);
      case "ipfs":
      case "ipfshash":
        return validators.validateIPFSHash(data);
      default:
        throw new ValidationError(`Unknown validation type: ${type}`);
    }
  },

  /**
   * Get middleware for the specified validation type
   * @param {string} type - Type of validation middleware
   * @param {Object} options - Options for the middleware
   * @returns {Function} Express middleware function
   */
  getMiddleware(type, options = {}) {
    switch (type.toLowerCase()) {
      case "address":
        return middleware.addressValidator(options);
      case "profile":
        return middleware.profileValidator;
      case "health":
      case "healthdata":
        return middleware.healthDataValidator;
      case "transaction":
        return middleware.transactionValidator;
      case "access":
      case "accessgrant":
        return middleware.accessGrantValidator;
      case "ipfs":
      case "ipfshash":
        return middleware.ipfsHashValidator(options);
      case "registration":
        return middleware.registrationValidator;
      default:
        throw new ValidationError(`Unknown middleware type: ${type}`);
    }
  },
};

// Export default consolidated API
export default ValidationModule;
