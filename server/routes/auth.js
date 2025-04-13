// Function to create a new health data entry
import express from "express";
import ethers from "ethers";
import { asyncHandler, createError } from "../errors/index.js";
import { rateLimiters } from "../middleware/rateLimiter.js";
import { logger } from "../config/loggerConfig.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import userService from "../services/userService.js";
import { USER_ROLES, AUDIT_TYPES } from "../constants/index.js";
import jwt from "jsonwebtoken";
import { validateAddress } from "../validation/index.js"; // Import from new validation module

const router = express.Router();

// Get CORS origin from environment or use default
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Set CORS headers for all responses
const applyCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID"
  );
};

// Validate Ethereum address and throw appropriate error
// Helper function to maintain compatibility with existing code
const validateAndNormalizeAddress = (address) => {
  const result = validateAddress(address);
  if (!result.isValid) {
    throw createError.validation(result.error, result.code);
  }
  return result.normalizedAddress;
};

// Generate JWT tokens for user authentication
const generateTokens = (user) => {
  // Get JWT secret from environment with fallback
  const jwtSecret = process.env.JWT_SECRET || "healthmint-dev-secret-key";
  if (!jwtSecret && process.env.NODE_ENV === "production") {
    logger.warn("JWT_SECRET not configured properly in production environment");
  }

  // Create payload with essential user data
  const payload = {
    id: user.id,
    address: user.address,
    role: user.role,
    roles: [user.role],
    iat: Math.floor(Date.now() / 1000),
  };
  const tokenExpiry = process.env.TOKEN_EXPIRY || "24h";
  const token = jwt.sign(payload, jwtSecret, { expiresIn: tokenExpiry });
  const refreshToken = ethers.utils.hexlify(ethers.utils.randomBytes(32));

  return {
    token,
    refreshToken,
    expiresIn: tokenExpiry,
  };
};

// CORS Preflight Handling for all auth routes
router.options("*", (req, res) => {
  applyCorsHeaders(res);
  return res.sendStatus(204); // No content response for preflight
});

// Middleware to apply CORS headers
router.post(
  "/wallet/connect",
  rateLimiters.auth, // Apply rate limiting
  asyncHandler(async (req, res) => {
    const requestLogger = logger.child({
      requestId: req.id || "req_" + Date.now(),
    });
    applyCorsHeaders(res);

    const { address, chainId } = req.body;
    const normalizedAddress = validateAndNormalizeAddress(address);
    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      chainId: chainId || "unknown",
    };

    requestLogger.info("Wallet connection attempt", {
      address: `${normalizedAddress.substring(0, 6)}...${normalizedAddress.substring(38)}`,
      chainId,
    });

    // Check if user exists in database
    let user = null;
    let isNewUser = true;

    try {
      user = await userService.getUserByAddress(normalizedAddress);
      if (user) {
        isNewUser = false;

        // Update last login time
        await userService.updateUser(normalizedAddress, {
          lastLogin: new Date(),
          lastChainId: chainId,
        });

        // Create audit log for existing user
        await hipaaCompliance.createAuditLog(AUDIT_TYPES.LOGIN, {
          userId: user.id,
          address: normalizedAddress,
          ...requestMetadata,
        });
      } else {
        // Log connection attempt by new user
        await hipaaCompliance.createAuditLog("WALLET_CONNECTION_ATTEMPT", {
          address: normalizedAddress,
          ...requestMetadata,
        });
      }
    } catch (error) {
      requestLogger.error("Error checking user existence", {
        error: error.message,
        address: normalizedAddress,
      });
      // Continue flow even if database check fails
    }

    // Generate JWT tokens if user exists
    let tokenData = null;
    if (user) {
      tokenData = generateTokens(user);

      // Set HTTP-only cookie with token for added security
      if (process.env.USE_COOKIE_AUTH === "true") {
        res.cookie("auth_token", tokenData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }
    }

    return res.json({
      success: true,
      message: isNewUser
        ? "Registration required"
        : "Wallet connected successfully",
      data: {
        isNewUser,
        address: normalizedAddress,
        chainId,
        timestamp: new Date().toISOString(),
        ...(tokenData && {
          token: tokenData.token,
          expiresIn: tokenData.expiresIn,
        }),
        ...(user &&
          !isNewUser && { user: await hipaaCompliance.sanitizeResponse(user) }),
      },
    });
  })
);

router.post(
  "/register",
  rateLimiters.auth, // Apply rate limiting
  asyncHandler(async (req, res) => {
    const requestLogger = logger.child({
      requestId: req.id || "req_" + Date.now(),
    });
    applyCorsHeaders(res);

    const { address, name, role, email, age } = req.body;

    // Validate required fields
    if (!address || !name || !role) {
      throw createError.validation(
        "Missing required fields: address, name, and role are required"
      );
    }

    // Validate and normalize address
    const normalizedAddress = validateAndNormalizeAddress(address);

    // Validate role
    const validRoles = Object.values(USER_ROLES).map((r) => r.toLowerCase());
    if (!validRoles.includes(role.toLowerCase())) {
      throw createError.validation(
        `Invalid role. Must be one of: ${validRoles.join(", ")}`
      );
    }

    // Validate age if provided
    if (age !== undefined) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
        throw createError.validation("Age must be between 18 and 120");
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw createError.validation("Invalid email format");
      }
    }

    // Check if user already exists
    try {
      const existingUser =
        await userService.getUserByAddress(normalizedAddress);
      if (existingUser) {
        throw createError.validation(
          "User with this wallet address already exists"
        );
      }
    } catch (error) {
      if (error.code === "VALIDATION_ERROR") {
        throw error; // Re-throw validation errors
      }
      requestLogger.error("Error checking existing user", {
        error: error.message,
        address: normalizedAddress,
      });
      // Continue if just a database error
    }

    // Create user in database
    const userData = {
      address: normalizedAddress,
      name: name.trim(),
      role: role.toLowerCase(),
      createdAt: new Date(),
      lastLogin: new Date(),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(age && { age: parseInt(age) }),
    };

    let user;
    try {
      user = await userService.createUser(userData);

      // Create audit log for registration
      await hipaaCompliance.createAuditLog(AUDIT_TYPES.CREATE, {
        userId: user.id,
        address: normalizedAddress,
        action: "USER_REGISTERED",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (error) {
      requestLogger.error("Failed to create user", {
        error: error.message,
        userData: {
          ...userData,
          address: `${normalizedAddress.substring(0, 6)}...`,
        },
      });
      throw createError.internal("Failed to create user account");
    }

    // Generate authentication tokens
    const tokenData = generateTokens(user);

    // Set HTTP-only cookie with token for added security
    if (process.env.USE_COOKIE_AUTH === "true") {
      res.cookie("auth_token", tokenData.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: await hipaaCompliance.sanitizeResponse(user),
        token: tokenData.token,
        expiresIn: tokenData.expiresIn,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

router.get(
  "/verify",
  rateLimiters.auth, // Apply rate limiting
  asyncHandler(async (req, res) => {
    const requestLogger = logger.child({
      requestId: req.id || "req_" + Date.now(),
    });
    applyCorsHeaders(res);

    const { address } = req.query;

    // Validate and normalize address
    const normalizedAddress = validateAndNormalizeAddress(address);

    // Check if user exists
    let user = null;
    let exists = false;

    try {
      user = await userService.getUserByAddress(normalizedAddress);
      exists = !!user;

      // Create audit log
      await hipaaCompliance.createAuditLog("USER_VERIFICATION", {
        address: normalizedAddress,
        exists,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });
    } catch (error) {
      requestLogger.error("Error verifying user", {
        error: error.message,
        address: normalizedAddress,
      });
      // Continue even if verification fails
    }

    return res.json({
      success: true,
      message: "Address verification completed",
      data: {
        address: normalizedAddress,
        exists,
        user: exists ? await hipaaCompliance.sanitizeResponse(user) : null,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    applyCorsHeaders(res);

    // Get token from authorization header or cookie
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.auth_token;

    // Check if token exists
    if (token) {
      // Clear auth cookie if it was set
      if (req.cookies?.auth_token) {
        res.clearCookie("auth_token");
      }

      // Create audit log for logout if user is identified
      if (req.user) {
        await hipaaCompliance.createAuditLog(AUDIT_TYPES.LOGOUT, {
          userId: req.user.id,
          address: req.user.address,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
        });
      }
    }

    return res.json({
      success: true,
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
    });
  })
);

router.post(
  "/refresh",
  rateLimiters.auth,
  asyncHandler(async (req, res) => {
    applyCorsHeaders(res);

    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError.validation("Refresh token is required");
    }

    // For now, we'll just check if user exists from the current token
    const user = req.user;
    if (!user || !user.address) {
      throw createError.unauthorized("Invalid refresh token");
    }

    try {
      // Get fresh user data
      const freshUser = await userService.getUserByAddress(user.address);
      if (!freshUser) {
        throw createError.unauthorized("User no longer exists");
      }

      // Generate new tokens
      const tokenData = generateTokens(freshUser);

      // Update HTTP-only cookie if using cookie auth
      if (process.env.USE_COOKIE_AUTH === "true") {
        res.cookie("auth_token", tokenData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }

      // Create audit log for token refresh
      await hipaaCompliance.createAuditLog("TOKEN_REFRESHED", {
        userId: freshUser.id,
        address: freshUser.address,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: tokenData.token,
          refreshToken: tokenData.refreshToken,
          expiresIn: tokenData.expiresIn,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Token refresh error", {
        error: error.message,
        address: user?.address,
        requestId: req.id,
      });

      throw createError.unauthorized("Failed to refresh token");
    }
  })
);

export default router;
