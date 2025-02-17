// server/routes/browse.js
import express from "express";
import hipaaCompliance from "../../middleware/hipaaCompliance.js";
import { ERROR_CODES } from '../../config/networkConfig.js';
import { ApiError } from "../../utils/apiError.js";
import { secureStorageService } from "../../services/secureStorageService.js";
import { userService } from "../../services/userService.js";
import { rateLimiters } from "../../middleware/rateLimiter.js";

const router = express.Router();

// Apply HIPAA compliance middleware
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

// Browse health data
router.get("/", rateLimiters.api, async (req, res, next) => {
  try {
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
      filters: { category, minAge, maxAge, verified, priceRange },
    };

    const result = await secureStorageService.browseHealthData({
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
  } catch (error) {
    next(error);
  }
});

// Get health data details
router.get("/:id", rateLimiters.api, async (req, res, next) => {
  try {
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

    const result = await secureStorageService.getHealthDataDetails(
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
  } catch (error) {
    next(error);
  }
});

// Get health data categories
router.get("/categories", rateLimiters.api, async (req, res, next) => {
  try {
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

    const categories = await secureStorageService.getCategories(
      requestMetadata
    );

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

// Get marketplace statistics
router.get("/stats", rateLimiters.api, async (req, res, next) => {
  try {
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

    const stats = await userService.getUserStats(requestMetadata);

    res.json({
      success: true,
      stats: await hipaaCompliance.sanitizeResponse(stats),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
