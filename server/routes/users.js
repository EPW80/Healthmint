//users.js is the route file for user management
const express = require("express");
const router = express.Router();
const userService = require("../services/userService");

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get("/profile", async (req, res) => {
  try {
    const { address } = req.query;
    const user = await userService.getUserByAddress(address);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", async (req, res) => {
  try {
    const { address } = req.body;
    const updateData = req.body;

    const updatedUser = await userService.updateUser(address, updateData);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating user profile" });
  }
});

module.exports = router;
