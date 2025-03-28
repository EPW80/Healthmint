import express from "express";
import ethers from "ethers";
import { asyncHandler, createError } from "../utils/errorUtils.js";

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

    const { address, chainId } = req.body;

    if (!address) {
      throw createError.validation("Wallet address is required");
    }

    let normalizedAddress;
    try {
      normalizedAddress = ethers.utils.getAddress(address.toLowerCase());
    } catch (error) {
      throw createError.validation("Invalid Ethereum address format");
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
  })
);

// User Registration Route
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { address, name, role } = req.body;

    if (!address || !name || !role) {
      throw createError.validation("Missing required fields");
    }

    // Validate address
    let normalizedAddress;
    try {
      normalizedAddress = ethers.utils.getAddress(address.toLowerCase());
    } catch (error) {
      throw createError.validation("Invalid Ethereum address format");
    }

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
  })
);

// Wallet Verification Route
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const { address } = req.query;

    if (!address) {
      throw createError.validation("Address is required");
    }

    // Validate address
    let normalizedAddress;
    try {
      normalizedAddress = ethers.utils.getAddress(address.toLowerCase());
    } catch (error) {
      throw createError.validation("Invalid Ethereum address format");
    }

    return res.json({
      success: true,
      message: "Address verified",
      data: {
        address: normalizedAddress,
        verified: true,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

// ✅ Use ES Module Export
export default router;
