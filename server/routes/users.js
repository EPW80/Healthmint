// server/routes/users.js
const express = require("express");
const router = express.Router();
const userService = require("../services/userService");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const {
  validateAddress,
  validateProfileUpdate,
  validateConsent,
} = require("../middleware/validation");
const { ERROR_CODES, ENDPOINTS } = require("../config/networkConfig");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { rateLimiters } = require("../middleware/rateLimiter");

// Apply HIPAA middleware to all routes
router.use(hipaaCompliance.validatePHI);
router.use(hipaaCompliance.auditLog);

/**
 * @route   GET /profile
 * @desc    Get user profile with HIPAA compliance
 * @access  Private
 */
router.get(
  ENDPOINTS.USERS.PROFILE,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const normalizedAddress = validateAddress(address);
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "read");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_profile",
      requestedBy,
    };

    const user = await userService.getUserByAddress(
      normalizedAddress,
      requestMetadata
    );
    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "User not found");
    }

    const profile =
      requestedBy === normalizedAddress
        ? await user.getFullProfile(requestedBy)
        : await user.getPublicProfile();

    res.json({
      success: true,
      profile: await hipaaCompliance.sanitizeResponse(profile),
    });
  })
);

/**
 * @route   PUT /profile
 * @desc    Update user profile with HIPAA compliance
 * @access  Private
 */
router.put(
  ENDPOINTS.USERS.PROFILE,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address, ...updateData } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const normalizedAddress = validateAddress(address);
    const validatedData = validateProfileUpdate(updateData);
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "write");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "update_profile",
      changes: Object.keys(validatedData),
      requestedBy,
    };

    const updatedUser = await userService.updateUser(
      normalizedAddress,
      validatedData,
      requestMetadata
    );
    if (!updatedUser) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "User not found");
    }

    const profile =
      requestedBy === normalizedAddress
        ? await updatedUser.getFullProfile(requestedBy)
        : await updatedUser.getPublicProfile();

    res.json({
      success: true,
      profile: await hipaaCompliance.sanitizeResponse(profile),
    });
  })
);

/**
 * @route   GET /access-log
 * @desc    Get user access log
 * @access  Private (Admin)
 */
router.get(
  ENDPOINTS.USERS.ACCESS_LOG,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const normalizedAddress = validateAddress(address);
    await hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "admin");

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_access_log",
      requestedBy,
    };

    const accessLog = await userService.getAccessLog(
      normalizedAddress,
      requestMetadata
    );
    res.json({
      success: true,
      accessLog: await hipaaCompliance.sanitizeAuditLog(accessLog),
    });
  })
);

/**
 * @route   POST /consent
 * @desc    Update user's HIPAA consent settings
 * @access  Private (Self only)
 */
router.post(
  ENDPOINTS.USERS.CONSENT,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address, consentSettings } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication required"
      );
    }

    const normalizedAddress = validateAddress(address);
    const validatedConsent = validateConsent(consentSettings);

    if (requestedBy !== normalizedAddress) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN.code,
        "Only the user can update their consent settings"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "update_consent",
      requestedBy,
    };

    const result = await userService.updateConsent(
      normalizedAddress,
      validatedConsent,
      requestMetadata
    );

    res.json({
      success: true,
      message: "Consent settings updated successfully",
      timestamp: new Date(),
      details: {
        consentUpdated: true,
        consentVersion: result.consentVersion,
        lastUpdated: result.timestamp,
      },
    });
  })
);

/**
 * @route   GET /settings
 * @desc    Get user settings
 * @access  Private (Self only)
 */
router.get(
  ENDPOINTS.USERS.SETTINGS,
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
      action: "view_settings",
      requestedBy,
    };

    const settings = await userService.getUserSettings(
      requestedBy,
      requestMetadata
    );
    if (!settings) {
      throw new ApiError(ERROR_CODES.NOT_FOUND.code, "User settings not found");
    }

    res.json({
      success: true,
      settings: await hipaaCompliance.sanitizeResponse(settings),
    });
  })
);

module.exports = router;
