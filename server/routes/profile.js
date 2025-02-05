// server/routes/profile.js
const express = require("express");
const router = express.Router();
const profileService = require("../services/profileService");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const {
  validateAddress,
  validateProfileUpdate,
  validateHash,
} = require("../middleware/validation");
const {
  ENDPOINTS,
  ERROR_CODES,
} = require("../config/networkConfig");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { rateLimiters } = require("../middleware/rateLimiter");

// Security middleware setup
const secureRouter = express.Router();
secureRouter.use(hipaaCompliance.auditLog);
secureRouter.use(hipaaCompliance.accessControl());
secureRouter.use(hipaaCompliance.validatePHI);

/**
 * @route   GET /api/v1/profile/stats
 * @desc    Get user profile statistics with HIPAA compliance
 * @access  Private
 */
secureRouter.get(
  ENDPOINTS.PROFILE.STATS,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    // Validate address
    const normalizedAddress = validateAddress(address);

    // Verify access with HIPAA compliance
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "read");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_profile_stats",
    };

    const stats = await profileService.getProfileStats(
      normalizedAddress,
      requestMetadata
    );

    if (!stats) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "Profile not found");
    }

    res.json({
      success: true,
      stats: await hipaaCompliance.sanitizeResponse(stats),
    });
  })
);

/**
 * @route   PUT /api/v1/profile/update
 * @desc    Update user profile with HIPAA compliance
 * @access  Private
 */
secureRouter.put(
  ENDPOINTS.PROFILE.UPDATE,
  rateLimiters.profile,
  asyncHandler(async (req, res) => {
    const { address, ...updateData } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    // Validate address and data
    const normalizedAddress = validateAddress(address);
    const validatedData = validateProfileUpdate(updateData);

    // Verify write access
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "write");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "update_profile",
      changes: Object.keys(validatedData).join(", "),
    };

    const updatedProfile = await profileService.updateProfile(
      normalizedAddress,
      validatedData,
      requestMetadata
    );

    if (!updatedProfile) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "Profile not found");
    }

    res.json({
      success: true,
      profile: await hipaaCompliance.sanitizeResponse(updatedProfile),
    });
  })
);

/**
 * @route   PUT /api/v1/profile/image
 * @desc    Update profile image with HIPAA compliance
 * @access  Private
 */
secureRouter.put(
  ENDPOINTS.PROFILE.IMAGE,
  rateLimiters.profile,
  asyncHandler(async (req, res) => {
    const { address, imageHash } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    // Validate address and image hash
    const normalizedAddress = validateAddress(address);
    const validatedHash = validateHash(imageHash);

    // Verify write access
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "write");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "update_profile_image",
    };

    const updatedProfile = await profileService.updateProfileImage(
      normalizedAddress,
      validatedHash,
      requestMetadata
    );

    if (!updatedProfile) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "Profile not found");
    }

    res.json({
      success: true,
      message: "Profile image updated successfully",
      imageHash: updatedProfile.profileImageHash,
    });
  })
);

/**
 * @route   GET /api/v1/profile/audit
 * @desc    Get profile audit log
 * @access  Private (Admin)
 */
secureRouter.get(
  ENDPOINTS.PROFILE.AUDIT,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    // Validate address
    const normalizedAddress = validateAddress(address);

    // Verify admin access
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "admin");

    // Add audit metadata
    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_audit_log",
    };

    const auditLog = await profileService.getAuditLog(
      normalizedAddress,
      requestMetadata
    );

    res.json({
      success: true,
      auditLog: await hipaaCompliance.sanitizeAuditLog(auditLog),
    });
  })
);

/**
 * @route   DELETE /api/v1/profile/delete
 * @desc    Delete user profile
 * @access  Private (Admin or Self)
 */
secureRouter.delete(
  ENDPOINTS.PROFILE.DELETE,
  rateLimiters.profile,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    // Validate address
    const normalizedAddress = validateAddress(address);

    // Verify admin or self access
    if (normalizedAddress !== requestedBy) {
      await hipaaCompliance.verifyAccess(
        requestedBy,
        normalizedAddress,
        "admin"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "delete_profile",
    };

    await profileService.deleteProfile(normalizedAddress, requestMetadata);

    res.json({
      success: true,
      message: "Profile deleted successfully",
    });
  })
);

// Use secure router for all profile routes
router.use("/", secureRouter);

module.exports = router;
