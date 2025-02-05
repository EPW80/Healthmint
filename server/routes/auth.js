// routes/auth.js
const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const { rateLimiters } = require("../middleware/rateLimiter");

/**
 * @route   POST /api/auth/wallet/connect
 * @desc    Connect wallet and validate user
 * @access  Public
 */
router.post(
  "/wallet/connect",
  asyncHandler(async (req, res) => {
    const { address, chainId } = req.body;

    if (!address) {
      throw new ApiError("Wallet address is required", "VALIDATION_ERROR");
    }

    // Log the request for debugging
    console.log("Wallet connect request:", {
      address,
      chainId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Add HIPAA compliant audit logging
      await hipaaCompliance.auditLog({
        action: "wallet_connect_attempt",
        performedBy: address,
        details: {
          chainId,
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });

      // Mock response for testing
      res.json({
        success: true,
        message: "Wallet connection request received",
        data: {
          address,
          chainId,
          timestamp: new Date().toISOString(),
          isNewUser: true,
        },
      });
    } catch (error) {
      console.error("Wallet connect error:", error);
      throw new ApiError(
        "Failed to process wallet connection",
        "WALLET_CONNECT_ERROR"
      );
    }
  })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { address, name, role } = req.body;

    if (!address || !name || !role) {
      throw new ApiError("Missing required fields", "VALIDATION_ERROR");
    }

    // Add your registration logic here
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        address,
        name,
        role,
      },
    });
  })
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify wallet connection
 * @access  Public
 */
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const { address } = req.query;

    if (!address) {
      throw new ApiError("Address is required", "VALIDATION_ERROR");
    }

    res.json({
      success: true,
      message: "Wallet verified",
      data: {
        address,
        verified: true,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

module.exports = router;
