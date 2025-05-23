// validation/index.js

// Import all validation modules
import { ValidationError } from "./errors.js";
import * as validators from "./validators.js";
import * as middleware from "./middleware.js";

// Re-export individual modules
export * from "./errors.js";
export * from "./validators.js";
export * from "./middleware.js";

// Consolidate all validators and middleware into a single module
const ValidationModule = {
  // Error handling
  ValidationError,

  // Pure validators
  validateToken: validators.validateToken, // Add this line
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

  // Validation function
  validate(type, data) {
    switch (type.toLowerCase()) {
      case "token":
      case "jwt":
        return validators.validateToken(data); // Add this case
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

  // Middleware function
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

  // Add this helper for test endpoints
  getTestEndpointAuth(req, res, next) {
    // For test endpoints, bypass normal auth in development
    if (process.env.NODE_ENV === "development" && req.path.includes("/test-")) {
      req.user = {
        id: "test-user",
        roles: ["admin"],
        role: "admin",
        address: "0x0000000000000000000000000000000000000000",
      };
      return true;
    }
    return false; // Proceed with normal auth
  },
};

// Export default consolidated API
export default ValidationModule;
