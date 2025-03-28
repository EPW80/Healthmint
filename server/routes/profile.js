// server/routes/profile.js
import express from "express";
import { profileService } from "../services/profileService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import {
  validateAddress,
  validateProfileUpdate,
  validateHash,
} from "../middleware/validation.js";
import { ENDPOINTS, ERROR_CODES } from "../config/networkConfig.js";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { rateLimiters } from "../middleware/rateLimiter.js";

const router = express.Router();

// Helper function to require specific access level
const requireAccessControl = (accessLevel = "read") => {
  return hipaaCompliance.accessControl({ requiredLevel: accessLevel });
};

/**
 * @route   GET /api/v1/profile/stats
 * @desc    Get user profile statistics with HIPAA compliance
 * @access  Private
 */
router.get(
  ENDPOINTS.PROFILE.STATS,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    // Validate address
    const normalizedAddress = validateAddress(address);

    // Verify access with HIPAA compliance
    hipaaCompliance.verifyAccess(requestedBy, normalizedAddress, "read");

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
      throw createError.notFound("Profile not found");
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
router.put(
  ENDPOINTS.PROFILE.UPDATE,
  rateLimiters.profile,
  requireAccessControl("write"), // Apply specific access control
  asyncHandler(async (req, res) => {
    const { address, ...updateData } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    // Validate address and data
    const normalizedAddress = validateAddress(address);
    const validatedData = validateProfileUpdate(updateData);

    // Verify already handled by requireAccessControl middleware

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
      throw createError.notFound("Profile not found");
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
router.put(
  ENDPOINTS.PROFILE.IMAGE,
  rateLimiters.profile,
  requireAccessControl("write"), // Apply specific access control
  asyncHandler(async (req, res) => {
    const { address, imageHash } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    // Validate address and image hash
    const normalizedAddress = validateAddress(address);
    const validatedHash = validateHash(imageHash);

    // Verify already handled by requireAccessControl middleware

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
      throw createError.notFound("Profile not found");
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
router.get(
  ENDPOINTS.PROFILE.AUDIT,
  requireAccessControl("admin"), // Apply specific access control
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    // Validate address
    const normalizedAddress = validateAddress(address);

    // Verify already handled by requireAccessControl middleware

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
router.delete(
  ENDPOINTS.PROFILE.DELETE,
  rateLimiters.profile,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
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

export default router;
