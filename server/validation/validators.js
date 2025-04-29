// validation/validators.js
import { ethers } from "ethers";
import {
  ACCESS_LEVELS,
  DATA_CATEGORIES,
  USER_ROLES,
} from "../constants/index.js";

/**
 * Validates Ethereum address
 * @param {string} address - Ethereum address to validate
 * @param {Object} options - Additional validation options
 * @returns {Object} Validation result
 */
export const validateAddress = (address, options = {}) => {
  try {
    // Check if address is provided
    if (!address) {
      return {
        isValid: false,
        error: "Address is required",
        code: "MISSING_ADDRESS",
      };
    }

    // Check basic format with regex first (for efficiency)
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return {
        isValid: false,
        error: "Invalid address format",
        code: "INVALID_FORMAT",
      };
    }

    // Use ethers for the checksum validation
    const normalizedAddress = ethers.utils.getAddress(address);

    // Check if this is a contract address if requested
    if (options.checkContract && options.provider) {
      // This should be handled asynchronously by the caller
      // We're just indicating that it needs to be checked
      return {
        isValid: true,
        normalizedAddress,
        checksumMatch: address === normalizedAddress,
        requiresContractCheck: true,
      };
    }

    return {
      isValid: true,
      normalizedAddress,
      checksumMatch: address === normalizedAddress,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message || "Invalid Ethereum address",
      code: error.code || "INVALID_ADDRESS",
    };
  }
};

/**
 * Validates user profile data
 * @param {Object} data - Profile data to validate
 * @returns {Object} Validation result
 */
export const validateProfile = (data) => {
  const errors = [];

  // Name validation
  if (data?.name !== undefined) {
    if (typeof data.name !== "string") {
      errors.push({
        field: "name",
        message: "Name must be a string",
        code: "INVALID_NAME_TYPE",
      });
    } else if (data.name.length < 2 || data.name.length > 100) {
      errors.push({
        field: "name",
        message: "Name must be between 2 and 100 characters",
        code: "INVALID_NAME_LENGTH",
      });
    }
  }

  // Age validation
  if (data?.age !== undefined) {
    const age = parseInt(data.age);
    if (isNaN(age)) {
      errors.push({
        field: "age",
        message: "Age must be a number",
        code: "INVALID_AGE_TYPE",
      });
    } else if (age < 18 || age > 120) {
      errors.push({
        field: "age",
        message: "Age must be between 18 and 120",
        code: "INVALID_AGE_RANGE",
      });
    }
  }

  // Email validation
  if (data?.email !== undefined) {
    if (typeof data.email !== "string") {
      errors.push({
        field: "email",
        message: "Email must be a string",
        code: "INVALID_EMAIL_TYPE",
      });
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(data.email)) {
        errors.push({
          field: "email",
          message: "Invalid email format",
          code: "INVALID_EMAIL_FORMAT",
        });
      }
    }
  }

  // Role validation
  if (data?.role !== undefined) {
    if (typeof data.role !== "string") {
      errors.push({
        field: "role",
        message: "Role must be a string",
        code: "INVALID_ROLE_TYPE",
      });
    } else if (!Object.values(USER_ROLES).includes(data.role)) {
      errors.push({
        field: "role",
        message: `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}`,
        code: "INVALID_ROLE",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates health data
 * @param {Object} data - Health data to validate
 * @returns {Object} Validation result
 */
export const validateHealthData = (data) => {
  const errors = [];
  const warnings = [];

  // Required fields validation
  const requiredFields = ["description", "category", "price", "metadata"];
  requiredFields.forEach((field) => {
    if (!data?.[field]) {
      errors.push({
        field,
        message: `${field} is required`,
        code: "REQUIRED_FIELD",
      });
    }
  });

  // Category validation
  if (
    data?.category &&
    !Object.values(DATA_CATEGORIES).includes(data.category)
  ) {
    errors.push({
      field: "category",
      message: "Invalid data category",
      code: "INVALID_CATEGORY",
    });
  }

  // Price validation
  if (data?.price !== undefined) {
    const price = parseFloat(data.price);
    if (isNaN(price)) {
      errors.push({
        field: "price",
        message: "Price must be a number",
        code: "INVALID_PRICE_TYPE",
      });
    } else if (price <= 0) {
      errors.push({
        field: "price",
        message: "Price must be a positive number",
        code: "INVALID_PRICE_VALUE",
      });
    }
  }

  // Metadata validation
  if (data?.metadata) {
    if (!data.metadata.fileType) {
      errors.push({
        field: "metadata.fileType",
        message: "File type is required in metadata",
        code: "MISSING_FILE_TYPE",
      });
    }

    if (!data.metadata.fileSize) {
      errors.push({
        field: "metadata.fileSize",
        message: "File size is required in metadata",
        code: "MISSING_FILE_SIZE",
      });
    } else if (data.metadata.fileSize <= 0) {
      errors.push({
        field: "metadata.fileSize",
        message: "File size must be a positive number",
        code: "INVALID_FILE_SIZE",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Validates transaction data
 * @param {Object} data - Transaction data to validate
 * @returns {Object} Validation result
 */
export const validateTransaction = (data) => {
  const errors = [];

  // Required fields validation
  const requiredFields = ["buyer", "seller", "price", "dataId"];
  requiredFields.forEach((field) => {
    if (!data?.[field]) {
      errors.push({
        field,
        message: `${field} is required`,
        code: `MISSING_${field.toUpperCase()}`,
      });
    }
  });

  // Address validation for buyer and seller
  if (data?.buyer) {
    try {
      ethers.utils.getAddress(data.buyer);
    } catch {
      errors.push({
        field: "buyer",
        message: "Invalid buyer address format",
        code: "INVALID_BUYER_ADDRESS",
      });
    }
  }

  if (data?.seller) {
    try {
      ethers.utils.getAddress(data.seller);
    } catch {
      errors.push({
        field: "seller",
        message: "Invalid seller address format",
        code: "INVALID_SELLER_ADDRESS",
      });
    }
  }

  // Price validation
  if (data?.price) {
    try {
      ethers.utils.parseEther(data.price.toString());
    } catch {
      errors.push({
        field: "price",
        message: "Invalid price format",
        code: "INVALID_PRICE_FORMAT",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates access grant data
 * @param {Object} data - Access grant data to validate
 * @returns {Object} Validation result
 */
export const validateAccessGrant = (data) => {
  const errors = [];

  // Required fields validation
  if (!data?.grantedTo) {
    errors.push({
      field: "grantedTo",
      message: "Recipient address is required",
      code: "MISSING_RECIPIENT",
    });
  }

  if (!data?.accessLevel) {
    errors.push({
      field: "accessLevel",
      message: "Access level is required",
      code: "MISSING_ACCESS_LEVEL",
    });
  }

  // Access level validation
  if (
    data?.accessLevel &&
    !Object.values(ACCESS_LEVELS).includes(data.accessLevel)
  ) {
    errors.push({
      field: "accessLevel",
      message: "Invalid access level",
      code: "INVALID_ACCESS_LEVEL",
    });
  }

  // Address validation
  if (data?.grantedTo) {
    try {
      ethers.utils.getAddress(data.grantedTo);
    } catch {
      errors.push({
        field: "grantedTo",
        message: "Invalid recipient address format",
        code: "INVALID_RECIPIENT_ADDRESS",
      });
    }
  }

  // Expiration validation
  if (data?.expiresAt) {
    const expiry = new Date(data.expiresAt);
    if (isNaN(expiry.getTime())) {
      errors.push({
        field: "expiresAt",
        message: "Invalid expiration date format",
        code: "INVALID_EXPIRY_FORMAT",
      });
    } else if (expiry <= new Date()) {
      errors.push({
        field: "expiresAt",
        message: "Expiration date cannot be in the past",
        code: "PAST_EXPIRY",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates IPFS hash
 * @param {string} hash - IPFS hash to validate
 * @returns {Object} Validation result
 */
export const validateIPFSHash = (hash) => {
  if (!hash) {
    return {
      isValid: false,
      error: {
        field: "hash",
        message: "IPFS hash is required",
        code: "MISSING_HASH",
      },
    };
  }

  // CIDv0 or CIDv1 format
  const ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/;
  return {
    isValid: ipfsHashRegex.test(hash),
    error: ipfsHashRegex.test(hash)
      ? null
      : {
          field: "hash",
          message: "Invalid IPFS hash format",
          code: "INVALID_HASH_FORMAT",
        },
  };
};

/**
 * Sanitizes user data by trimming strings and normalizing values
 * @param {Object} userData - User data to sanitize
 * @returns {Object} Sanitized user data
 */
export const sanitizeUserData = (userData) => {
  if (!userData || typeof userData !== "object") {
    return {};
  }

  return {
    address: userData.address?.toLowerCase().trim(),
    name: userData.name?.trim(),
    age: userData.age !== undefined ? parseInt(userData.age) : undefined,
    email: userData.email?.toLowerCase().trim(),
    role: userData.role?.toLowerCase().trim(),
    // Only copy other fields that are present
    ...(userData.profileImageHash && {
      profileImageHash: userData.profileImageHash,
    }),
    ...(userData.consentSettings && {
      consentSettings: userData.consentSettings,
    }),
  };
};

/**
 * Validates JWT token structure and format (not the signature)
 * @param {string} token - JWT token to validate
 * @returns {object} Validation result
 */
export const validateToken = (token) => {
  try {
    if (!token) {
      return { isValid: false, code: 'MISSING_TOKEN', message: 'Token is required' };
    }
    
    // Basic format validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, code: 'INVALID_FORMAT', message: 'Token must have 3 parts' };
    }
    
    try {
      // Try to decode without verifying signature (just to validate structure)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
      
      if (!payload) {
        return { isValid: false, code: 'DECODE_FAILED', message: 'Token payload could not be decoded' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, code: 'DECODE_ERROR', message: error.message };
    }
  } catch (error) {
    return { isValid: false, code: 'VALIDATION_ERROR', message: error.message };
  }
};

// Export grouped validators for convenience
export default {
  validateAddress,
  validateProfile,
  validateHealthData,
  validateTransaction,
  validateAccessGrant,
  validateIPFSHash,
  sanitizeUserData,
};
