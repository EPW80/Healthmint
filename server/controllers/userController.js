const userService = require("../services/userService");

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
  if (!address) return false;
  return address.toString().startsWith("0x") && address.length === 42;
};

const userController = {
  async connectWallet(req, res) {
    try {
      console.log("Connect wallet request:", {
        body: req.body,
        method: req.method,
        path: req.path,
      });

      // Check for empty request body
      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      const { address } = req.body;

      // Validate wallet address
      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

      try {
        // Check if user exists
        let user = await userService.getUserByAddress(address);
        console.log("User lookup result:", { address, found: !!user });

        if (user) {
          // Update last login for existing user
          user = await userService.updateUser(address, {
            lastLogin: new Date(),
          });

          return sendResponse(res, 200, true, "Wallet connected successfully", {
            user,
            isNewUser: false,
          });
        }

        return sendResponse(res, 200, true, "Registration required", {
          isNewUser: true,
        });
      } catch (dbError) {
        console.error("Database error in connectWallet:", dbError);
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
      console.log("Register user request:", {
        body: req.body,
        method: req.method,
        path: req.path,
      });

      if (!req.body) {
        return sendResponse(res, 400, false, "Request body is required");
      }

      const { address, name, age, email, role } = req.body;

      // Validate wallet address
      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

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
      if (isNaN(parsedAge) || parsedAge < 18) {
        return sendResponse(res, 400, false, "User must be 18 or older");
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
        const existingUser = await userService.getUserByAddress(address);
        if (existingUser) {
          return sendResponse(res, 400, false, "User already exists");
        }

        // Create user
        const userData = {
          address,
          name: name.trim(),
          age: parsedAge,
          role: role.toLowerCase(),
          ...(email && { email: email.toLowerCase().trim() }),
        };

        const user = await userService.createUser(userData);

        return sendResponse(res, 201, true, "User registered successfully", {
          user,
        });
      } catch (dbError) {
        console.error("Database error in registerUser:", dbError);
        return sendResponse(res, 500, false, "Failed to create user account");
      }
    } catch (error) {
      console.error("Error in registerUser:", error);
      return sendResponse(res, 500, false, "Failed to process registration");
    }
  },

  async verifyUser(req, res) {
    try {
      console.log("Verify user request:", {
        query: req.query,
        method: req.method,
        path: req.path,
      });

      const { address } = req.query;

      if (!validateWalletAddress(address)) {
        return sendResponse(res, 400, false, "Invalid wallet address format");
      }

      try {
        const user = await userService.getUserByAddress(address);

        return sendResponse(res, 200, true, "User verification completed", {
          exists: !!user,
          user: user || null,
        });
      } catch (dbError) {
        console.error("Database error in verifyUser:", dbError);
        return sendResponse(res, 500, false, "Failed to verify user");
      }
    } catch (error) {
      console.error("Error in verifyUser:", error);
      return sendResponse(res, 500, false, "Failed to process verification");
    }
  },
};

module.exports = userController;
