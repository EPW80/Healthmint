import express from "express";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import browseRoutes from "./data/browse.js";
import {
  validateAddress,
  validateHealthData,
} from "../services/validationService.js";
import { ERROR_CODES } from "../config/networkConfig.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"; // ✅ Correct ES Module import
import { rateLimiters } from "../middleware/rateLimiter.js";
import { userService } from "../services/userService.js";
import transactionService from "../services/transactionService.js";
import { secureStorageService } from "../services/secureStorageService.js";

const router = express.Router();

// Apply HIPAA compliance middleware to all routes
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

// Upload health data
router.post(
  "/upload",
  rateLimiters.upload,
  asyncHandler(async (req, res) => {
    const { address, data } = req.body;

    if (!address || !data) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Address and data are required"
      );
    }

    const normalizedAddress = validateAddress(address);
    const validatedData = validateHealthData(data);

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "data_upload",
      category: data.category,
    };

    const result = await secureStorageService.storeHealthData(
      normalizedAddress,
      validatedData,
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
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const result = await userService.getUserHealthData(
      requestedBy,
      dataId || address
    );

    if (!result) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND.code,
        "No data found or access denied"
      );
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
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Missing required transaction data"
      );
    }

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
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
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
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    if (!reason) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Emergency access reason is required"
      );
    }

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
  })
);

// Data browsing route
router.get("/browse", (_req, res) => {
  res.json({ success: true, message: "Data browsing available!" });
});
router.use("/browse", browseRoutes);

// Export the router for use in the main server.js file
export default router;
