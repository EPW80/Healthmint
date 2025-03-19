import ethers from "ethers";
import {
  DATA_CATEGORIES,
} from "../constants/index.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";

class ValidationServiceError extends Error {
  constructor(message, code = "VALIDATION_ERROR", details = {}) {
    super(message);
    this.name = "ValidationServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

class ValidationService {
  static async validateAddress(address, options = {}) {
    try {
      if (!address) {
        throw new ValidationServiceError(
          "Address is required",
          "MISSING_ADDRESS"
        );
      }

      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new ValidationServiceError(
          "Invalid address format",
          "INVALID_FORMAT"
        );
      }

      const normalizedAddress = ethers.utils.getAddress(address);

      if (options.checkContract) {
        await this.validateContractAddress(normalizedAddress);
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
  }

  static async validateHealthData(data, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      const requiredFields = [
        "owner",
        "ipfsHash",
        "price",
        "category",
        "description",
      ];
      const missingFields = requiredFields.filter((field) => !data[field]);
      if (missingFields.length > 0) {
        errors.push({
          field: "required",
          message: "Missing required fields",
          fields: missingFields,
        });
      }

      if (
        data.category &&
        !Object.values(DATA_CATEGORIES).includes(data.category)
      ) {
        errors.push({
          field: "category",
          message: "Invalid category",
          validCategories: Object.values(DATA_CATEGORIES),
        });
      }

      const complianceValidation = await hipaaCompliance.validateData(data);
      if (!complianceValidation.isValid) {
        errors.push(...complianceValidation.errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      throw new ValidationServiceError(
        "Health data validation failed",
        "VALIDATION_FAILED",
        { originalError: error.message }
      );
    }
  }

  static async validateTransaction(transaction) {
    const errors = [];

    try {
      const requiredFields = ["buyer", "seller", "price", "dataId"];
      const missingFields = requiredFields.filter(
        (field) => !transaction[field]
      );

      if (missingFields.length > 0) {
        errors.push({
          field: "required",
          message: "Missing required fields",
          fields: missingFields,
        });
      }

      if (transaction.buyer && !ethers.utils.isAddress(transaction.buyer)) {
        errors.push({ field: "buyer", message: "Invalid Ethereum address" });
      }
      if (transaction.seller && !ethers.utils.isAddress(transaction.seller)) {
        errors.push({ field: "seller", message: "Invalid Ethereum address" });
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      throw new ValidationServiceError(
        "Transaction validation failed",
        "VALIDATION_FAILED"
      );
    }
  }

  static async validateContractAddress(address) {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL
    );
    const code = await provider.getCode(address);
    return code !== "0x";
  }

  static async sanitizeUserData(userData) {
    return {
      address: userData.address?.toLowerCase(),
      name: userData.name?.trim(),
      age: userData.age ? parseInt(userData.age) : undefined,
      email: userData.email?.toLowerCase().trim(),
      role: userData.role?.toLowerCase(),
    };
  }

  static validateUserData(userData) {
    if (!userData || typeof userData !== "object") {
      throw new ValidationServiceError("Invalid user data", "INVALID_DATA");
    }

    const sanitizedData = ValidationService.sanitizeUserData(userData);

    return {
      isValid: true,
      sanitizedData,
    };
  }
}

// ✅ Export individual functions so they can be used as named imports
export const validateAddress = ValidationService.validateAddress;
export const validateHealthData = ValidationService.validateHealthData;
export const validateTransaction = ValidationService.validateTransaction;
export const sanitizeUserData = ValidationService.sanitizeUserData;
export const validateContractAddress =
  ValidationService.validateContractAddress;
export const validateUserData = ValidationService.validateUserData;
