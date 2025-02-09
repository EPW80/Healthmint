// server/routes/data.js
const express = require("express");
const router = express.Router();
const healthDataService = require("../services/healthDataService");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const browseRoutes = require("./data/browse");
const {
  validateAddress,
  validateHealthData,
} = require("../middleware/validation");
const { ERROR_CODES } = require("../config/networkConfig");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { rateLimiters } = require("../middleware/rateLimiter");

// Apply HIPAA compliance middleware to all routes
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

/**
 * @route   POST /upload
 * @desc    Upload health data with HIPAA compliance
 * @access  Private
 */
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

    const result = await healthDataService.uploadHealthData(
      normalizedAddress,
      validatedData,
      requestMetadata
    );

    res.status(201).json({
      success: true,
      message: "Data uploaded successfully",
      data: {
        dataId: result.healthData.id,
        category: result.healthData.category,
        uploadTimestamp: requestMetadata.timestamp,
      },
    });
  })
);

/**
 * @route   GET /user
 * @desc    Get user's health data with access control
 * @access  Private
 */
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

    const accessPurpose = req.headers["x-access-purpose"];
    if (!accessPurpose) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Access purpose is required"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      purpose: accessPurpose,
      timestamp: new Date(),
      action: "data_access",
    };

    const result = await healthDataService.getHealthData(
      requestedBy,
      dataId || address,
      requestMetadata
    );

    if (!result) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND.code,
        "No data found or access denied"
      );
    }

    res.json({
      success: true,
      data: result.data,
      accessDetails: {
        granted: true,
        expiresAt: result.accessExpires,
        purpose: accessPurpose,
      },
    });
  })
);

/**
 * @route   POST /purchase
 * @desc    Purchase health data with consent verification
 * @access  Private
 */
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

    const transactionMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      purpose,
      transactionHash,
      timestamp: new Date(),
      action: "data_purchase",
    };

    const result = await healthDataService.purchaseData(
      buyerAddress,
      dataId,
      transactionMetadata
    );

    res.json({
      success: true,
      message: "Data purchased successfully",
      purchase: {
        id: result.purchase.dataId,
        accessGranted: result.purchase.accessGranted,
        expiresAt: result.purchase.expiresAt,
        transactionHash: result.purchase.transactionHash,
      },
    });
  })
);

/**
 * @route   GET /audit
 * @desc    Get access audit log for health data
 * @access  Private
 */
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

    const auditLog = await healthDataService.getAuditLog(dataId, requestedBy, {
      action: "audit_log_access",
    });

    res.json({
      success: true,
      auditLog: await hipaaCompliance.sanitizeAuditLog(auditLog),
    });
  })
);

/**
 * @route   POST /emergency-access
 * @desc    Request emergency access to health data
 * @access  Private (Providers only)
 */
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

    const accessMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      reason,
      timestamp: new Date(),
      action: "emergency_access_request",
    };

    const result = await healthDataService.handleEmergencyAccess(
      requestedBy,
      dataId,
      accessMetadata
    );

    res.json({
      success: true,
      message: "Emergency access granted",
      access: {
        granted: true,
        expiresAt: result.expiresAt,
        reason: result.reason,
        restrictions: result.restrictions,
      },
    });
  })
);

router.get("/browse", (req, res) => {
  res.json({ success: true, message: "Data browsing available!" });
});

router.use("/browse", browseRoutes);

module.exports = router;
