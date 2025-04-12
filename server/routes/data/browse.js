// Utility function to update user profile
import express from "express";
import hipaaCompliance from "../../middleware/hipaaCompliance.js";
import { ERROR_CODES } from "../../config/hipaaConfig.js";
import { ApiError } from "../../utils/apiError.js";
import secureStorageService from "../../services/secureStorageService.js";
import userService from "../../services/userService.js";
import { rateLimiters } from "../../middleware/rateLimiter.js";
import { asyncHandler } from "../../utils/errorUtils.js";

const router = express.Router();

// Apply HIPAA compliance middleware to all routes
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

// Function to require authentication
const requireAuthentication = (req) => {
  const requestedBy = req.user?.address;
  if (!requestedBy) {
    throw new ApiError(
      ERROR_CODES.UNAUTHORIZED.code,
      "Authentication required"
    );
  }
  return requestedBy;
};

// Function to create request metadata for logging
const createRequestMetadata = (req, action, additionalData = {}) => {
  return {
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date(),
    action,
    ...additionalData,
  };
};

// Function to validate and parse query parameters
router.get(
  "/",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    // Get and validate user
    const requestedBy = requireAuthentication(req);

    // Parse and validate query parameters
    const {
      category,
      minAge,
      maxAge,
      verified,
      priceRange,
      page = 1,
      limit = 10,
    } = req.query;

    // Validate numeric parameters
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));

    // Parse age parameters safely
    const parsedMinAge = minAge ? parseInt(minAge) : undefined;
    const parsedMaxAge = maxAge ? parseInt(maxAge) : undefined;

    // Validate age range if both are provided
    if (
      parsedMinAge !== undefined &&
      parsedMaxAge !== undefined &&
      parsedMinAge > parsedMaxAge
    ) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Invalid age range: minAge cannot be greater than maxAge"
      );
    }

    // Create request metadata for audit logging
    const requestMetadata = createRequestMetadata(req, "browse_data", {
      filters: { category, minAge, maxAge, verified, priceRange },
    });

    // Call service with organized parameters
    const result = await secureStorageService.browseHealthData({
      filters: {
        category,
        minAge: parsedMinAge,
        maxAge: parsedMaxAge,
        verified: verified === "true",
        priceRange,
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
      },
      requestedBy,
      metadata: requestMetadata,
    });

    // Return sanitized response
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.data,
      pagination: result.pagination,
    });
  })
);

// Function to get details of a specific health data entry
router.get(
  "/:id",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    // Get and validate user
    const requestedBy = requireAuthentication(req);

    // Validate data ID
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Valid data ID is required"
      );
    }

    // Validate access purpose
    const accessPurpose = req.headers["x-access-purpose"];
    if (!accessPurpose) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Access purpose is required in x-access-purpose header"
      );
    }

    // Create request metadata
    const requestMetadata = createRequestMetadata(req, "view_data_details", {
      dataId: id,
      purpose: accessPurpose,
    });

    // Fetch data
    const result = await secureStorageService.getHealthDataDetails(
      id,
      requestedBy,
      requestMetadata
    );

    // Check if data exists
    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "Health data not found");
    }

    // Return sanitized response
    res.json({
      success: true,
      data: await hipaaCompliance.sanitizeResponse(result),
      timestamp: new Date().toISOString(),
    });
  })
);

// Function to get categories of health data
router.get(
  "/categories",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    // Get and validate user
    const requestedBy = requireAuthentication(req);

    // Create request metadata
    const requestMetadata = createRequestMetadata(req, "get_categories");

    // Fetch categories from service
    const categories =
      await secureStorageService.getCategories(requestMetadata);

    // Return response
    res.json({
      success: true,
      categories,
      timestamp: new Date().toISOString(),
    });
  })
);

// Function to get marketplace statistics
router.get(
  "/stats",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const requestedBy = requireAuthentication(req);
    const requestMetadata = createRequestMetadata(req, "get_marketplace_stats");
    const stats = await userService.getUserStats(requestMetadata);

    res.json({
      success: true,
      stats: await hipaaCompliance.sanitizeResponse(stats),
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
