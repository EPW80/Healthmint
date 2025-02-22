// utils/validators.js
import { ethers } from "ethers";
import {
  ACCESS_LEVELS,
  DATA_CATEGORIES,
  USER_ROLES,
} from "../constants/index.js";

class ValidationServiceError extends Error {
  constructor(message, code = "VALIDATION_ERROR", field = null) {
    super(message);
    this.name = "ValidationServiceError";
    this.code = code;
    this.field = field;
    this.timestamp = new Date().toISOString();
  }
}

// Validates Ethereum address format
export const validateAddress = (address) => {
  try {
    if (!address) {
      throw new ValidationServiceError(
        "Address is required",
        "MISSING_ADDRESS"
      );
    }
    return ethers.utils.getAddress(address.toLowerCase());
  } catch (error) {
    throw new ValidationServiceError(
      "Invalid Ethereum address format",
      "INVALID_ADDRESS",
      "address"
    );
  }
};

// Validates health data
export const validateHealthData = (data) => {
  const errors = [];

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
  if (data?.price) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price <= 0) {
      errors.push({
        field: "price",
        message: "Price must be a positive number",
        code: "INVALID_PRICE",
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
    if (!data.metadata.fileSize || data.metadata.fileSize <= 0) {
      errors.push({
        field: "metadata.fileSize",
        message: "Valid file size is required in metadata",
        code: "INVALID_FILE_SIZE",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates profile update data
export const validateProfileUpdate = (data) => {
  const errors = [];

  // Name validation
  if (data?.name && (data.name.length < 2 || data.name.length > 100)) {
    errors.push({
      field: "name",
      message: "Name must be between 2 and 100 characters",
      code: "INVALID_NAME_LENGTH",
    });
  }

  // Age validation
  if (data?.age) {
    const age = parseInt(data.age);
    if (isNaN(age) || age < 18 || age > 120) {
      errors.push({
        field: "age",
        message: "Age must be between 18 and 120",
        code: "INVALID_AGE",
      });
    }
  }

  // Email validation
  if (data?.email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push({
        field: "email",
        message: "Invalid email format",
        code: "INVALID_EMAIL",
      });
    }
  }

  // Role validation
  if (data?.role && !Object.values(USER_ROLES).includes(data.role)) {
    errors.push({
      field: "role",
      message: "Invalid user role",
      code: "INVALID_ROLE",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates transaction data
export const validateTransaction = (data) => {
  const errors = [];

  // Required fields validation
  if (!data?.transactionHash) {
    errors.push({
      field: "transactionHash",
      message: "Transaction hash is required",
      code: "MISSING_HASH",
    });
  }

  if (!data?.buyer) {
    errors.push({
      field: "buyer",
      message: "Buyer address is required",
      code: "MISSING_BUYER",
    });
  }

  if (!data?.price) {
    errors.push({
      field: "price",
      message: "Price is required",
      code: "MISSING_PRICE",
    });
  }

  // Address validation
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

// Validates access grant data
export const validateAccessGrant = (data) => {
  const errors = [];

  // Validate required fields
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

  // Validate access level
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

  // Validate address
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

  // Validate expiration if provided
  if (data?.expiresAt) {
    const expiry = new Date(data.expiresAt);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      errors.push({
        field: "expiresAt",
        message: "Invalid or past expiration date",
        code: "INVALID_EXPIRY",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates IPFS hash
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

export default {
  validateAddress,
  validateHealthData,
  validateProfileUpdate,
  validateTransaction,
  validateAccessGrant,
  validateIPFSHash,
};
