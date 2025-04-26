import express from "express";
// Remove this import to break the circular dependency
// import hipaaComplianceService from "../services/hipaaComplianceService.js"; 
import { logger } from "../config/loggerConfig.js";

const router = express.Router();

// Create audit log endpoint - DIRECTLY handle logs without calling the service
router.post("/log", async (req, res) => {
  try {
    const { action, details, severity = "info" } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action is required for audit logging",
      });
    }

    // Log directly instead of calling hipaaComplianceService
    const logEntry = {
      action,
      timestamp: new Date().toISOString(),
      user: req.user?.id || "anonymous",
      details: details || {},
      severity
    };
    
    // Log to console
    console.log(`[AUDIT] ${action}:`, JSON.stringify(logEntry));
    
    // If you have a database, you would write to it here
    
    return res.json({
      success: true,
      message: "Audit log created",
      id: Date.now().toString(),
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create audit log",
      error: error.message,
    });
  }
});

export default router;
