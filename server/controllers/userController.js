// server/controllers/userController.js
import userService from "../services/userService.js";
import { logger } from "../config/loggerConfig.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { USER_ROLES, AUDIT_TYPES } from "../constants/index.js";
import { sanitizeUserData } from "../utils/sanitizers.js";
import validation from "../validation/index.js";
import { ValidationError } from "../validation/errors.js";

const sendResponse = (res, statusCode, success, message, data = null) => {
  try {
    if (!res || typeof res.status !== "function") {
      logger.error("Invalid response object", { res });
      throw new Error("Invalid response object");
    }

    // Create response object
    const response = {
      success,
      message,
      timestamp: new Date().toISOString(),
    };

    // Add data if provided
    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Error in sendResponse", {
      error: error.message,
      stack: error.stack,
    });

    // Fallback response if possible
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }

    throw error;
  }
};

// Utility function to log request information
const logRequestInfo = (req, context) => {
  // Create a sanitized request body that masks sensitive information
  const sanitizedBody = req.body ? { ...req.body } : undefined;

  // Mask sensitive fields
  if (sanitizedBody) {
    // Securely mask Ethereum address (show only first 6 and last 4 chars)
    if (sanitizedBody.address) {
      sanitizedBody.address = maskAddress(sanitizedBody.address);
    }

    // Mask other sensitive fields
    ["name", "email", "age"].forEach((field) => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = "[MASKED]";
      }
    });
  }

  // Log the request with request ID for traceability
  logger.info(`${context}`, {
    requestId: req.id || "unknown",
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: sanitizedBody,
  });
};

// Utility function to mask Ethereum address
const maskAddress = (address) => {
  if (!address || typeof address !== "string") return "[INVALID]";

  const addressValidation = validation.validateAddress(address);
  if (!addressValidation.isValid) return "[INVALID]";

  const normalizedAddress = address.toLowerCase();

  // Show only first 6 and last 4 characters
  if (normalizedAddress.length >= 10) {
    return `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
  }
  return "[MASKED]";
};

// Utility function to sanitize user data
const userController = {
  async connectWallet(req, res) {
    const requestId = req.id || `req-${Date.now()}`;
    const requestLogger = logger.child({ requestId });

    try {
      logRequestInfo(req, "Connect Wallet");

      // Validate request body
      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      const { address, chainId } = req.body;

      try {
        // Validate wallet address
        const addressValidation = validation.validateAddress(address);
        if (!addressValidation.isValid) {
          return sendResponse(
            res,
            400,
            false,
            addressValidation.message || "Invalid wallet address format"
          );
        }

        // Normalize address
        const normalizedAddress = address.toLowerCase();

        // Create audit metadata
        const auditMetadata = {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
          chainId,
        };

        try {
          // Check if user exists
          const user = await userService.getUserByAddress(normalizedAddress);
          requestLogger.debug("User lookup completed", {
            address: maskAddress(normalizedAddress),
            found: !!user,
          });

          if (user) {
            // Update last login for existing user
            const updateData = {
              lastLogin: new Date(),
              lastChainId: chainId,
            };

            const updatedUser = await userService.updateUser(
              normalizedAddress,
              updateData
            );

            // Create HIPAA-compliant audit log for login
            await hipaaCompliance.createAuditLog(AUDIT_TYPES.LOGIN, {
              userId: updatedUser.id,
              address: normalizedAddress,
              ...auditMetadata,
            });

            // Return sanitized user data
            return sendResponse(
              res,
              200,
              true,
              "Wallet connected successfully",
              {
                user: await hipaaCompliance.sanitizeResponse(updatedUser),
                isNewUser: false,
              }
            );
          }

          // Create audit log for connection attempt by new user
          await hipaaCompliance.createAuditLog(
            "WALLET_CONNECTION_ATTEMPT",
            auditMetadata
          );

          return sendResponse(res, 200, true, "Registration required", {
            isNewUser: true,
          });
        } catch (dbError) {
          requestLogger.error("Database error in connectWallet", {
            error: dbError.message,
            stack: dbError.stack,
            address: maskAddress(normalizedAddress),
          });

          return sendResponse(res, 500, false, "Database operation failed");
        }
      } catch (error) {
        // Add specific validation error handling
        if (error instanceof ValidationError) {
          return sendResponse(res, 400, false, error.message, {
            code: error.code,
            details: error.details,
          });
        }
        throw error; // Re-throw other errors to be caught by outer catch block
      }
    } catch (error) {
      logger.error("Error in connectWallet", {
        error: error.message,
        stack: error.stack,
        requestId,
      });

      return sendResponse(
        res,
        500,
        false,
        "Failed to process wallet connection"
      );
    }
  },

  async registerUser(req, res) {
    const requestId = req.id || `req-${Date.now()}`;
    const requestLogger = logger.child({ requestId });

    try {
      logRequestInfo(req, "Register User");

      // Validate request body
      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      try {
        // Validate user data
        const userValidation = validation.validateProfile(req.body);
        if (!userValidation.isValid) {
          return sendResponse(res, 400, false, "Validation failed", {
            errors: userValidation.errors || [
              { message: userValidation.message },
            ],
          });
        }

        const { address, name, age, email, role } = req.body;

        // Normalize address
        const normalizedAddress = address.toLowerCase();

        try {
          // Check for existing user
          const existingUser =
            await userService.getUserByAddress(normalizedAddress);
          if (existingUser) {
            return sendResponse(res, 400, false, "User already exists");
          }

          // Sanitize and prepare user data
          const userData = sanitizeUserData({
            address: normalizedAddress,
            name: name.trim(),
            age: parseInt(age),
            role: role.toLowerCase(),
            createdAt: new Date(),
            lastLogin: new Date(),
            ...(email && { email: email.toLowerCase().trim() }),
          });

          // Create user
          const user = await userService.createUser(userData);

          // Create HIPAA-compliant audit log
          await hipaaCompliance.createAuditLog(AUDIT_TYPES.CREATE, {
            userId: user.id,
            address: normalizedAddress,
            role: userData.role,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          // Return sanitized user data
          return sendResponse(res, 201, true, "User registered successfully", {
            user: await hipaaCompliance.sanitizeResponse(user),
          });
        } catch (dbError) {
          requestLogger.error("Database error in registerUser", {
            error: dbError.message,
            stack: dbError.stack,
            address: maskAddress(normalizedAddress),
          });

          return sendResponse(res, 500, false, "Failed to create user account");
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          return sendResponse(res, 400, false, error.message, {
            code: error.code,
            details: error.details,
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error("Error in registerUser", {
        error: error.message,
        stack: error.stack,
        requestId,
      });

      return sendResponse(res, 500, false, "Failed to process registration");
    }
  },

  // Utility function to verify user
  async verifyUser(req, res) {
    const requestId = req.id || `req-${Date.now()}`;
    const requestLogger = logger.child({ requestId });

    try {
      logRequestInfo(req, "Verify User");

      const { address } = req.query;

      const addressValidation = validation.validateAddress(address);
      if (!addressValidation.isValid) {
        return sendResponse(
          res,
          400,
          false,
          addressValidation.message || "Invalid wallet address format"
        );
      }

      const normalizedAddress = address.toLowerCase();

      try {
        // Get user by address
        const user = await userService.getUserByAddress(normalizedAddress);

        // Create audit log for verification
        await hipaaCompliance.createAuditLog("USER_VERIFICATION", {
          address: normalizedAddress,
          exists: !!user,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
        });

        return sendResponse(res, 200, true, "User verification completed", {
          exists: !!user,
          user: user ? await hipaaCompliance.sanitizeResponse(user) : null,
        });
      } catch (dbError) {
        requestLogger.error("Database error in verifyUser", {
          error: dbError.message,
          stack: dbError.stack,
          address: maskAddress(normalizedAddress),
        });

        return sendResponse(res, 500, false, "Failed to verify user");
      }
    } catch (error) {
      logger.error("Error in verifyUser", {
        error: error.message,
        stack: error.stack,
        requestId,
      });

      return sendResponse(res, 500, false, "Failed to process verification");
    }
  },

  // Utility function to get user profile
  async getUserProfile(req, res) {
    const requestId = req.id || `req-${Date.now()}`;
    const requestLogger = logger.child({ requestId });

    try {
      logRequestInfo(req, "Get User Profile");

      // Get address from params or authenticated user
      const address = req.params.address || req.user?.address;

      const addressValidation = validation.validateAddress(address);
      if (!addressValidation.isValid) {
        return sendResponse(
          res,
          400,
          false,
          addressValidation.message || "Invalid wallet address format"
        );
      }

      const normalizedAddress = address.toLowerCase();

      // Check authorization for viewing other profiles
      const isOwnProfile =
        req.user?.address?.toLowerCase() === normalizedAddress;
      if (!isOwnProfile) {
        // Verify if the user has permission to view other profiles
        const hasPermission =
          req.user?.role === USER_ROLES.ADMIN ||
          req.user?.role === USER_ROLES.PROVIDER;

        if (!hasPermission) {
          return sendResponse(
            res,
            403,
            false,
            "Unauthorized to view this profile"
          );
        }
      }

      try {
        // Get user profile
        const user = await userService.getUserByAddress(normalizedAddress);

        if (!user) {
          return sendResponse(res, 404, false, "User not found");
        }

        // Create audit log
        await hipaaCompliance.createAuditLog(AUDIT_TYPES.READ, {
          userId: user.id,
          requestedBy: req.user?.address || "anonymous",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
        });

        // Return full or limited profile based on permissions
        const profile =
          isOwnProfile || req.user?.role === USER_ROLES.ADMIN
            ? await user.getFullProfile(req.user?.address)
            : user.getPublicProfile();

        return sendResponse(res, 200, true, "Profile retrieved successfully", {
          profile: await hipaaCompliance.sanitizeResponse(profile),
        });
      } catch (dbError) {
        requestLogger.error("Database error in getUserProfile", {
          error: dbError.message,
          stack: dbError.stack,
          address: maskAddress(normalizedAddress),
        });

        return sendResponse(res, 500, false, "Failed to retrieve user profile");
      }
    } catch (error) {
      logger.error("Error in getUserProfile", {
        error: error.message,
        stack: error.stack,
        requestId,
      });

      return sendResponse(res, 500, false, "Failed to process profile request");
    }
  },
};

export { sendResponse, logRequestInfo, maskAddress };

export default userController;
