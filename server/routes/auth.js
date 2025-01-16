// auth.js
const express = require("express");
const router = express.Router();
const { validateRegistration } = require("../middleware/validation");
const userController = require("../controllers/userController");

/**
 * @route   POST /api/auth/wallet/connect
 * @desc    Connect wallet and check if user exists
 * @access  Public
 */
router.post("/wallet/connect", async (req, res) => {
  try {
    // Pass the entire request object to the controller
    await userController.connectWallet(req, res);
  } catch (error) {
    console.error("Wallet connection error:", error);
    // Error is now handled by the controller
    res.status(500).json({
      success: false,
      message: "Error connecting wallet",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post("/register", validateRegistration, async (req, res) => {
  try {
    await userController.registerUser(req, res);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify user authentication
 * @access  Public
 */
router.get("/verify", async (req, res) => {
  try {
    await userController.verifyUser(req, res);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying user",
      error: error.message
    });
  }
});

module.exports = router;