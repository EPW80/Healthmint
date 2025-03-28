import express from "express";
import browseRoutes from "./data/browse.js";
import {
  validateAddress,
  validateHealthData,
} from "../services/validationService.js";
import { ERROR_CODES } from "../config/hipaaConfig.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { rateLimiters } from "../middleware/rateLimiter.js";
import { userService } from "../services/userService.js";
import transactionService from "../services/transactionService.js";
import secureStorageService from "../services/secureStorageService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";

const router = express.Router();

// Upload health data
router.post(
  "/upload",
  rateLimiters.upload,
  asyncHandler(async (req, res) => {
    const { address, data } = req.body;

    if (!address || !data) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Address and data are required"
      );
    }

    try {
      const normalizedAddress = validateAddress(address);
      const validationResult = validateHealthData(data);

      // Handle validation errors consistently
      if (!validationResult.isValid) {
        throw createError.validation(
          ERROR_CODES.VALIDATION_ERROR.code,
          "Invalid health data",
          { validationErrors: validationResult.errors }
        );
      }

      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "data_upload",
        category: data.category,
      };

      const result = await secureStorageService.storeHealthData(
        normalizedAddress,
        validationResult.data || data,
        requestMetadata
      );

      res.status(201).json({
        success: true,
        message: "Data uploaded successfully",
        data: {
          dataId: result.dataId,
          category: result.category,
          uploadTimestamp: requestMetadata.timestamp,
        },
      });
    } catch (error) {
      // Handle specific service errors
      if (error.code === "STORAGE_FAILED") {
        throw createError.api("STORAGE_ERROR", "Failed to store health data", {
          originalError: error.message,
        });
      }
      throw error; // Re-throw other errors
    }
  })
);

// Retrieve user data
router.get(
  "/user",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address, dataId } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const result = await userService.getUserHealthData(
      requestedBy,
      dataId || address
    );

    if (!result) {
      throw createError.notFound("No data found or access denied");
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

// Purchase health data
router.post(
  "/purchase",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { buyerAddress, dataId, purpose, transactionHash } = req.body;

    if (!buyerAddress || !dataId || !purpose) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Missing required transaction data",
        {
          missingFields: !buyerAddress
            ? "buyerAddress"
            : !dataId
              ? "dataId"
              : "purpose",
        }
      );
    }

    try {
      const result = await transactionService.purchaseData(
        buyerAddress,
        dataId,
        purpose,
        transactionHash
      );

      res.json({
        success: true,
        message: "Data purchased successfully",
        purchase: result,
      });
    } catch (error) {
      // Handle blockchain transaction errors specifically
      if (error.code === "PURCHASE_FAILED") {
        throw createError.transaction(
          "TRANSACTION_ERROR",
          "Failed to purchase data on blockchain",
          {
            dataId,
            buyer: buyerAddress,
            originalError: error.message,
          }
        );
      }
      throw error; // Re-throw other errors
    }
  })
);

// Fetch audit log
router.get(
  "/audit",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { dataId } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    if (!dataId) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Data ID is required"
      );
    }

    const auditLog = await secureStorageService.getAuditLog(
      dataId,
      requestedBy
    );

    res.json({
      success: true,
      auditLog: await hipaaCompliance.sanitizeAuditLog(auditLog),
    });
  })
);

// Emergency access request
router.post(
  "/emergency-access",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { dataId, reason } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    if (!dataId) {
      throw createError.hipaa(
        "HIPAA_VALIDATION_ERROR",
        "Data identifier is required for emergency access",
        { severity: "high" }
      );
    }

    if (!reason) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Emergency access reason is required"
      );
    }

    try {
      const result = await secureStorageService.handleEmergencyAccess(
        requestedBy,
        dataId,
        reason
      );

      res.json({
        success: true,
        message: "Emergency access granted",
        access: result,
      });
    } catch (error) {
      // HIPAA-specific error handling for emergency access
      if (error.code === "EMERGENCY_ACCESS_FAILED") {
        throw createError.hipaa(
          "HIPAA_EMERGENCY_ACCESS_ERROR",
          "Failed to process emergency access request",
          {
            dataId,
            requestedBy,
            reason: "Access denied by data owner policy",
            severity: "high",
            originalError: error.message,
          }
        );
      }
      throw error; // Re-throw other errors
    }
  })
);

// Data browsing route
router.get(
  "/browse",
  asyncHandler(async (_req, res) => {
    // Use async handler for consistency even on simple routes
    res.json({ success: true, message: "Data browsing available!" });
  })
);

router.use("/browse", browseRoutes);

// Export the router for use in the main server.js file
export default router;
