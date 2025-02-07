const userService = require("../services/userService");
const { ethers } = require("ethers");

const sendResponse = (res, statusCode, success, message, data = null) => {
  try {
    if (!res || !res.status) {
      console.error("Invalid response object:", res);
      throw new Error("Invalid response object");
    }

    const response = {
      success,
      message,
      ...(data && { data }),
    };

    return res.status(statusCode).json(response);
  } catch (error) {
    console.error("Error in sendResponse:", error);
    if (res && res.status) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
    throw error;
  }
};

const validateWalletAddress = (address) => {
  try {
    if (!address) return false;
    // Use ethers.js to validate and checksum the address
    const checksumAddress = ethers.utils.getAddress(address);
    return true;
  } catch (error) {
    console.error("Address validation error:", error);
    return false;
  }
};

const logRequestInfo = (req, context) => {
  console.log(`${context} - Request Info:`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    body: req.body
      ? {
          ...req.body,
          address: req.body.address
            ? `${req.body.address.slice(0, 6)}...${req.body.address.slice(-4)}`
            : undefined,
        }
      : undefined,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
};

const userController = {
  async connectWallet(req, res) {
    try {
      logRequestInfo(req, "Connect Wallet");

      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      const { address, chainId } = req.body;

      // Enhanced address validation
      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      try {
        // Check if user exists
        const user = await userService.getUserByAddress(normalizedAddress);
        console.log("User lookup result:", {
          address: `${normalizedAddress.slice(
            0,
            6
          )}...${normalizedAddress.slice(-4)}`,
          found: !!user,
        });

        if (user) {
          // Update last login for existing user
          const updatedUser = await userService.updateUser(normalizedAddress, {
            lastLogin: new Date(),
            lastChainId: chainId,
          });

          return sendResponse(res, 200, true, "Wallet connected successfully", {
            user: updatedUser,
            isNewUser: false,
          });
        }

        return sendResponse(res, 200, true, "Registration required", {
          isNewUser: true,
        });
      } catch (dbError) {
        console.error("Database error in connectWallet:", {
          error: dbError,
          address: `${normalizedAddress.slice(
            0,
            6
          )}...${normalizedAddress.slice(-4)}`,
        });
        return sendResponse(res, 500, false, "Database operation failed");
      }
    } catch (error) {
      console.error("Error in connectWallet:", error);
      return sendResponse(
        res,
        500,
        false,
        "Failed to process wallet connection"
      );
    }
  },

  async registerUser(req, res) {
    try {
      logRequestInfo(req, "Register User");

      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      const { address, name, age, email, role } = req.body;

      // Enhanced address validation
      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Validate required fields
      const requiredFields = ["name", "age", "role"];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return sendResponse(res, 400, false, "Missing required fields", {
          required: missingFields,
        });
      }

      // Validate age
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
        return sendResponse(res, 400, false, "Age must be between 18 and 120");
      }

      // Validate role
      const validRoles = ["patient", "provider", "researcher"];
      if (!validRoles.includes(role.toLowerCase())) {
        return sendResponse(res, 400, false, "Invalid role", {
          validRoles,
        });
      }

      try {
        // Check for existing user
        const existingUser = await userService.getUserByAddress(
          normalizedAddress
        );
        if (existingUser) {
          return sendResponse(res, 400, false, "User already exists");
        }

        // Create user with sanitized data
        const userData = {
          address: normalizedAddress,
          name: name.trim(),
          age: parsedAge,
          role: role.toLowerCase(),
          createdAt: new Date(),
          lastLogin: new Date(),
          ...(email && { email: email.toLowerCase().trim() }),
        };

        const user = await userService.createUser(userData);

        return sendResponse(res, 201, true, "User registered successfully", {
          user,
        });
      } catch (dbError) {
        console.error("Database error in registerUser:", {
          error: dbError,
          address: `${normalizedAddress.slice(
            0,
            6
          )}...${normalizedAddress.slice(-4)}`,
        });
        return sendResponse(res, 500, false, "Failed to create user account");
      }
    } catch (error) {
      console.error("Error in registerUser:", error);
      return sendResponse(res, 500, false, "Failed to process registration");
    }
  },

  async verifyUser(req, res) {
    try {
      logRequestInfo(req, "Verify User");

      const { address } = req.query;

      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

      const normalizedAddress = address.toLowerCase();

      try {
        const user = await userService.getUserByAddress(normalizedAddress);

        return sendResponse(res, 200, true, "User verification completed", {
          exists: !!user,
          user: user || null,
        });
      } catch (dbError) {
        console.error("Database error in verifyUser:", {
          error: dbError,
          address: `${normalizedAddress.slice(
            0,
            6
          )}...${normalizedAddress.slice(-4)}`,
        });
        return sendResponse(res, 500, false, "Failed to verify user");
      }
    } catch (error) {
      console.error("Error in verifyUser:", error);
      return sendResponse(res, 500, false, "Failed to process verification");
    }
  },
};

module.exports = userController;
