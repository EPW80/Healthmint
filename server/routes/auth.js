import express from "express";
import ethers from "ethers";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// CORS Preflight Handling
router.options("/wallet/connect", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(204); // ✅ No content response for preflight
});

// Wallet Connect Route
router.post(
  "/wallet/connect",
  asyncHandler(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    try {
      const { address, chainId } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
          timestamp: new Date().toISOString(),
        });
      }

      let normalizedAddress;
      try {
        normalizedAddress = ethers.utils.getAddress(address.toLowerCase());
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid Ethereum address format",
          timestamp: new Date().toISOString(),
        });
      }

      console.log("Wallet connection attempt:", {
        address: normalizedAddress,
        chainId,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: "Wallet connected successfully",
        data: {
          isNewUser: true,
          address: normalizedAddress,
          chainId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Wallet connect error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process wallet connection",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// User Registration Route
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    try {
      const { address, name, role } = req.body;

      if (!address || !name || !role) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate address
      const normalizedAddress = ethers.utils.getAddress(address.toLowerCase());

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          address: normalizedAddress,
          name,
          role,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to register user",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// Wallet Verification Route
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    try {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Address is required",
          timestamp: new Date().toISOString(),
        });
      }

      // Validate address
      const normalizedAddress = ethers.utils.getAddress(address.toLowerCase());

      return res.json({
        success: true,
        message: "Address verified",
        data: {
          address: normalizedAddress,
          verified: true,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Verification error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify address",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// ✅ Use ES Module Export
export default router;
