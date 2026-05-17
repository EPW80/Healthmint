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
import { validateAddress } from "../validation/index.js";
import blockchainService from "../services/blockchainService.js";
import { ERROR_CODES } from "../config/networkConfig.js";

const router = express.Router();
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const applyCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID"
  );
};

const validateAndNormalizeAddress = (address) => {
  const result = validateAddress(address);
  if (!result.isValid) {
    throw createError.validation(result.error, result.code);
  }
  return result.normalizedAddress;
};
const generateTokens = (user) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured — server should have refused to start");
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
router.options("*", (req, res) => {
  applyCorsHeaders(res);
  return res.sendStatus(204);
});

// POST /api/auth/wallet/connect
// Connects a wallet and issues an auth token.
router.post(
  "/wallet/connect",
  rateLimiters.auth,
  asyncHandler(async (req, res) => {
    applyCorsHeaders(res);
    const { address } = req.body;

    if (!address) {
      throw createError.validation("Wallet address is required");
    }

    const normalizedAddress = validateAndNormalizeAddress(address);

    // TODO: signature verification — skip for now so the demo flow works.
    let user = await userService.getUserByAddress(normalizedAddress);
    if (!user) {
      user = await userService.createUser({
        address: normalizedAddress.toLowerCase(),
        roles: ["patient"],
        createdAt: new Date(),
        walletConnected: true,
      });
    }

    const { token, refreshToken, expiresIn } = generateTokens({
      id: user.id,
      address: normalizedAddress,
      role: user.role || "patient",
    });

    res.json({
      success: true,
      message: "Wallet connected",
      token,
      refreshToken,
      expiresIn,
      user: await hipaaCompliance.sanitizeResponse(user),
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
