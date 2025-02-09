// server/routes/browse.js
const express = require("express");
const router = express.Router();
const healthDataService = require("../../services/healthDataService");
const hipaaCompliance = require("../../middleware/hipaaCompliance");
const { validateAddress } = require("../../middleware/validation");
const { ERROR_CODES } = require("../../config/networkConfig");
const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/apiError");
const { rateLimiters } = require("../../middleware/rateLimiter");

// Apply HIPAA compliance middleware
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

/**
 * @route   GET /browse
 * @desc    Browse available health data with filters
 * @access  Private
 */
router.get(
  "/",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const {
      category,
      minAge,
      maxAge,
      verified,
      priceRange,
      page = 1,
      limit = 10,
    } = req.query;

    const requestedBy = req.user?.address;
    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "browse_data",
      filters: {
        category,
        minAge,
        maxAge,
        verified,
        priceRange,
      },
    };

    const result = await healthDataService.browseHealthData({
      filters: {
        category,
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        verified: verified === "true",
        priceRange,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
      requestedBy,
      metadata: requestMetadata,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @route   GET /browse/:id
 * @desc    Get detailed view of specific health data
 * @access  Private
 */
router.get(
  "/:id",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
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
      timestamp: new Date(),
      action: "view_data_details",
      purpose: accessPurpose,
    };

    const result = await healthDataService.getHealthDataDetails(
      id,
      requestedBy,
      requestMetadata
    );

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "Health data not found");
    }

    res.json({
      success: true,
      data: await hipaaCompliance.sanitizeResponse(result),
    });
  })
);

/**
 * @route   GET /browse/categories
 * @desc    Get list of available categories
 * @access  Private
 */
router.get(
  "/categories",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "get_categories",
    };

    const categories = await healthDataService.getCategories(requestMetadata);

    res.json({
      success: true,
      categories,
    });
  })
);

/**
 * @route   GET /browse/stats
 * @desc    Get marketplace statistics
 * @access  Private
 */
router.get(
  "/stats",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "get_marketplace_stats",
    };

    const stats = await healthDataService.getMarketplaceStats(requestMetadata);

    res.json({
      success: true,
      stats: await hipaaCompliance.sanitizeResponse(stats),
    });
  })
);

module.exports = router;
