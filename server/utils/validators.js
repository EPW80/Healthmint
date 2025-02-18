// utils/validators.js
const ethers = require("ethers");
const { ACCESS_LEVELS, DATA_CATEGORIES, USER_ROLES } = require("../constants");

// Validates Ethereum address format
const validateAddress = (address) => {
  try {
    if (!address) {
      throw new Error("Address is required");
    }
    return ethers.utils.getAddress(address);
  } catch (error) {
    throw new Error("Invalid Ethereum address format");
  }
};

// Validates health data
const validateHealthData = (data) => {
  const errors = [];

  // Required fields validation
  const requiredFields = ["description", "category", "price", "metadata"];
  requiredFields.forEach((field) => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Category validation
  if (
    data.category &&
    !Object.values(DATA_CATEGORIES).includes(data.category)
  ) {
    errors.push("Invalid data category");
  }

  // Price validation
  if (data.price) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price <= 0) {
      errors.push("Price must be a positive number");
    }
  }

  // Metadata validation
  if (data.metadata) {
    if (!data.metadata.fileType) {
      errors.push("File type is required in metadata");
    }
    if (!data.metadata.fileSize || data.metadata.fileSize <= 0) {
      errors.push("Valid file size is required in metadata");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates access level
const validateProfileUpdate = (data) => {
  const errors = [];

  // Name validation
  if (data.name && (data.name.length < 2 || data.name.length > 100)) {
    errors.push("Name must be between 2 and 100 characters");
  }

  // Age validation
  if (data.age) {
    const age = parseInt(data.age);
    if (isNaN(age) || age < 18 || age > 120) {
      errors.push("Age must be between 18 and 120");
    }
  }

  // Email validation
  if (data.email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push("Invalid email format");
    }
  }

  // Role validation
  if (data.role && !Object.values(USER_ROLES).includes(data.role)) {
    errors.push("Invalid user role");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates transaction data
const validateTransaction = (data) => {
  const errors = [];

  // Required fields validation
  if (!data.transactionHash) {
    errors.push("Transaction hash is required");
  }

  if (!data.buyer) {
    errors.push("Buyer address is required");
  }

  if (!data.price) {
    errors.push("Price is required");
  }

  // Address validation
  if (data.buyer) {
    try {
      ethers.utils.getAddress(data.buyer);
    } catch {
      errors.push("Invalid buyer address format");
    }
  }

  // Price validation
  if (data.price) {
    try {
      ethers.utils.parseEther(data.price.toString());
    } catch {
      errors.push("Invalid price format");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates access grant data
const validateAccessGrant = (data) => {
  const errors = [];

  // Validate required fields
  if (!data.grantedTo) {
    errors.push("Recipient address is required");
  }

  if (!data.accessLevel) {
    errors.push("Access level is required");
  }

  // Validate access level
  if (
    data.accessLevel &&
    !Object.values(ACCESS_LEVELS).includes(data.accessLevel)
  ) {
    errors.push("Invalid access level");
  }

  // Validate address
  if (data.grantedTo) {
    try {
      ethers.utils.getAddress(data.grantedTo);
    } catch {
      errors.push("Invalid recipient address format");
    }
  }

  // Validate expiration if provided
  if (data.expiresAt) {
    const expiry = new Date(data.expiresAt);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      errors.push("Invalid or past expiration date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validates IPFS hash
const validateIPFSHash = (hash) => {
  if (!hash) {
    return {
      isValid: false,
      error: "IPFS hash is required",
    };
  }

  // CIDv0 or CIDv1 format
  const ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/;
  return {
    isValid: ipfsHashRegex.test(hash),
    error: ipfsHashRegex.test(hash) ? null : "Invalid IPFS hash format",
  };
};

module.exports = {
  validateAddress,
  validateHealthData,
  validateProfileUpdate,
  validateTransaction,
  validateAccessGrant,
  validateIPFSHash,
};
