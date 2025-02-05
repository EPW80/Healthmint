// server/services/validationService.js
const ethers = require("ethers");
const { FILE_TYPES, CATEGORIES, DATA_LIMITS } = require("../constants");
const hipaaCompliance = require("../middleware/hipaaCompliance");

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
  // Validate Ethereum address with enhanced checks
  static async validateAddress(address, options = {}) {
    try {
      if (!address) {
        throw new ValidationServiceError(
          "Address is required",
          "MISSING_ADDRESS"
        );
      }

      // Basic format check
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        throw new ValidationServiceError(
          "Invalid address format",
          "INVALID_FORMAT"
        );
      }

      // Checksum validation
      const normalizedAddress = ethers.utils.getAddress(address);

      // Additional checks for contract addresses if specified
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

  // Validate health data with enhanced HIPAA compliance
  static async validateHealthData(data, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields validation
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

      // Price validation with enhanced checks
      if (data.price) {
        try {
          const price = ethers.utils.parseEther(data.price.toString());
          if (price.lte(0)) {
            errors.push({
              field: "price",
              message: "Price must be positive",
            });
          }
          if (price.gt(ethers.utils.parseEther("1000000"))) {
            // 1M ETH limit
            warnings.push({
              field: "price",
              message: "Unusually high price detected",
            });
          }
        } catch (error) {
          errors.push({
            field: "price",
            message: "Invalid price format",
          });
        }
      }

      // Category validation with data sensitivity
      if (data.category) {
        if (!CATEGORIES.HEALTH_DATA.includes(data.category)) {
          errors.push({
            field: "category",
            message: "Invalid category",
            validCategories: CATEGORIES.HEALTH_DATA,
          });
        }

        // Check data sensitivity level
        const sensitivityLevel = this.assessDataSensitivity(data);
        if (sensitivityLevel === "high" && !options.allowSensitive) {
          errors.push({
            field: "sensitivity",
            message: "Sensitive data requires additional authorization",
          });
        }
      }

      // Enhanced metadata validation
      if (data.metadata) {
        const metadataValidation = this.validateFileMetadata(data.metadata);
        if (!metadataValidation.isValid) {
          errors.push(...metadataValidation.errors);
        }
      }

      // Content validation if required
      if (options.validateContent && data.content) {
        const contentValidation = await this.validateContent(data.content);
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors);
        }
      }

      // HIPAA compliance validation
      const complianceValidation = await hipaaCompliance.validateData(data);
      if (!complianceValidation.isValid) {
        errors.push(...complianceValidation.errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sensitivityLevel: this.assessDataSensitivity(data),
      };
    } catch (error) {
      throw new ValidationServiceError(
        "Health data validation failed",
        "VALIDATION_FAILED",
        { originalError: error.message }
      );
    }
  }

  // Validate transaction with enhanced security
  static validateTransaction(transaction, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields validation
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

      // Address validation with enhanced checks
      if (transaction.buyer) {
        const buyerValidation = this.validateAddress(transaction.buyer, {
          checkContract: options.validateContracts,
        });
        if (!buyerValidation.isValid) {
          errors.push({
            field: "buyer",
            message: buyerValidation.error,
          });
        }
      }

      if (transaction.seller) {
        const sellerValidation = this.validateAddress(transaction.seller, {
          checkContract: options.validateContracts,
        });
        if (!sellerValidation.isValid) {
          errors.push({
            field: "seller",
            message: sellerValidation.error,
          });
        }
      }

      // Price validation with sanity checks
      if (transaction.price) {
        try {
          const price = ethers.utils.parseEther(transaction.price.toString());
          if (price.lte(0)) {
            errors.push({
              field: "price",
              message: "Price must be positive",
            });
          }

          // Check for unusual transaction amounts
          const priceInEth = Number(ethers.utils.formatEther(price));
          if (priceInEth > 100) {
            // Warning for transactions over 100 ETH
            warnings.push({
              field: "price",
              message: "Large transaction amount detected",
            });
          }
        } catch (error) {
          errors.push({
            field: "price",
            message: "Invalid price format",
          });
        }
      }

      // Gas price validation if provided
      if (transaction.gasPrice) {
        try {
          const gasPrice = ethers.utils.parseUnits(
            transaction.gasPrice.toString(),
            "gwei"
          );
          if (gasPrice.gt(ethers.utils.parseUnits("500", "gwei"))) {
            // 500 Gwei limit
            warnings.push({
              field: "gasPrice",
              message: "High gas price detected",
            });
          }
        } catch (error) {
          errors.push({
            field: "gasPrice",
            message: "Invalid gas price format",
          });
        }
      }

      // Timestamp validation if provided
      if (transaction.timestamp) {
        const timestamp = new Date(transaction.timestamp);
        if (isNaN(timestamp.getTime())) {
          errors.push({
            field: "timestamp",
            message: "Invalid timestamp format",
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      throw new ValidationServiceError(
        "Transaction validation failed",
        "VALIDATION_FAILED",
        { originalError: error.message }
      );
    }
  }

  // Validate IPFS hash with enhanced checks
  static async validateIPFSHash(hash, options = {}) {
    try {
      // Basic format validation (CIDv0 or CIDv1)
      const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
      const cidv1Regex = /^b[A-Za-z2-7]{58}$/;

      if (!hash) {
        throw new ValidationServiceError(
          "IPFS hash is required",
          "MISSING_HASH"
        );
      }

      const isValidCIDv0 = cidv0Regex.test(hash);
      const isValidCIDv1 = cidv1Regex.test(hash);

      if (!isValidCIDv0 && !isValidCIDv1) {
        throw new ValidationServiceError(
          "Invalid IPFS hash format",
          "INVALID_FORMAT"
        );
      }

      // Additional checks if required
      if (options.validateAvailability) {
        await this.checkIPFSAvailability(hash);
      }

      return {
        isValid: true,
        version: isValidCIDv0 ? "v0" : "v1",
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        code: error.code || "INVALID_HASH",
      };
    }
  }

  // Validate file metadata with enhanced security
  static validateFileMetadata(metadata, options = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields validation
      const requiredFields = ["name", "type", "size"];
      const missingFields = requiredFields.filter((field) => !metadata[field]);

      if (missingFields.length > 0) {
        errors.push({
          field: "required",
          message: "Missing required metadata fields",
          fields: missingFields,
        });
      }

      // File size validation with configurable limits
      const maxSize = options.maxSize || DATA_LIMITS.MAX_FILE_SIZE;
      if (metadata.size > maxSize) {
        errors.push({
          field: "size",
          message: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
        });
      }

      // Type validation with enhanced security
      const allowedTypes = options.allowedTypes || FILE_TYPES.ALLOWED;
      if (!allowedTypes.includes(metadata.type)) {
        errors.push({
          field: "type",
          message: "Unsupported file type",
          allowedTypes,
        });
      }

      // Name validation
      if (metadata.name) {
        // Check for malicious file names
        const nameValidation = this.validateFileName(metadata.name);
        if (!nameValidation.isValid) {
          errors.push({
            field: "name",
            message: nameValidation.error,
          });
        }
      }

      // Additional metadata validation
      if (metadata.created) {
        const created = new Date(metadata.created);
        if (isNaN(created.getTime())) {
          errors.push({
            field: "created",
            message: "Invalid creation date",
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      throw new ValidationServiceError(
        "Metadata validation failed",
        "VALIDATION_FAILED",
        { originalError: error.message }
      );
    }
  }

  // Utility methods
  static async validateContractAddress(address) {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL
    );
    const code = await provider.getCode(address);
    return code !== "0x";
  }

  static async checkIPFSAvailability(hash) {
    // Implement IPFS availability check
    return true;
  }

  static validateFileName(name) {
    // Implement file name security validation
    const disallowedChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (disallowedChars.test(name)) {
      return {
        isValid: false,
        error: "File name contains invalid characters",
      };
    }
    return { isValid: true };
  }

  static assessDataSensitivity(data) {
    // Implement data sensitivity assessment
    const sensitiveCategories = ["Mental Health", "Genetics", "HIV"];
    if (sensitiveCategories.includes(data.category)) {
      return "high";
    }
    return "normal";
  }

  static async validateContent(content) {
    // Implement content validation
    return { isValid: true };
  }
}

module.exports = ValidationService;
