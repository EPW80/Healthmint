// data.js
const express = require("express");
const router = express.Router();
const dataService = require("../services/dataService");

// @route   POST /api/data/upload
// @desc    Upload health data
// @access  Private
router.post("/upload", async (req, res) => {
  try {
    const { address, data } = req.body;

    const result = await dataService.uploadHealthData(address, data);

    res.status(201).json({
      message: "Data uploaded successfully",
      result,
    });
  } catch (error) {
    console.error("Error uploading data:", error);
    res.status(500).json({ message: "Error uploading health data" });
  }
});

// @route   GET /api/data/user
// @desc    Get user's health data
// @access  Private
router.get("/user", async (req, res) => {
  try {
    const { address } = req.query;

    const data = await dataService.getHealthData(address);

    if (!data) {
      return res.status(404).json({ message: "No data found for this user" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Error fetching health data" });
  }
});

// @route   POST /api/data/purchase
// @desc    Purchase health data
// @access  Private
router.post("/purchase", async (req, res) => {
  try {
    const { buyerAddress, dataId } = req.body;

    const result = await dataService.purchaseData(buyerAddress, dataId);

    res.json({
      message: "Data purchased successfully",
      result,
    });
  } catch (error) {
    console.error("Error purchasing data:", error);
    res.status(500).json({ message: "Error purchasing health data" });
  }
});

module.exports = router;
