//profile.js is the route file for user profiles
const express = require("express");
const router = express.Router();
const profileService = require("../services/profileService");

// @route   GET /api/profile/stats
// @desc    Get user profile statistics
// @access  Private
router.get("/stats", async (req, res) => {
  try {
    const { address } = req.query;
    const stats = await profileService.getProfileStats(address);

    if (!stats) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching profile stats:", error);
    res.status(500).json({ message: "Error fetching profile statistics" });
  }
});

// @route   PUT /api/profile/update
// @desc    Update user profile
// @access  Private
router.put("/update", async (req, res) => {
  try {
    const { address, ...updateData } = req.body;

    const updatedProfile = await profileService.updateProfile(
      address,
      updateData
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// @route   PUT /api/profile/image
// @desc    Update profile image
// @access  Private
router.put("/image", async (req, res) => {
  try {
    const { address, imageHash } = req.body;

    const updatedProfile = await profileService.updateProfileImage(
      address,
      imageHash
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      imageHash: updatedProfile.profileImageHash,
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    res.status(500).json({ message: "Error updating profile image" });
  }
});

module.exports = router;
