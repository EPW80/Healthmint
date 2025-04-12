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
import { logger } from "../config/loggerConfig.js";

const router = express.Router();

// Middleware to require access control
const requireAccessControl = (accessLevel = "read") => {
  return hipaaCompliance.accessControl({ requiredLevel: accessLevel });
};

// Middleware to validate address
router.get(
  ENDPOINTS.PROFILE.STATS,
  rateLimiters.api, // Apply rate limiting
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      logger.warn("Unauthorized stats access attempt", { ip: req.ip });
      throw createError.unauthorized("Authentication required");
    }

    // Validate address (use requester's address if none provided)
    const normalizedAddress = validateAddress(address || requestedBy);

    logger.info("Profile stats request", {
      requestedBy,
      targetAddress: normalizedAddress,
      requestId: req.id,
    });

    // Verify access with HIPAA compliance
    const hasAccess = hipaaCompliance.verifyAccess(
      requestedBy,
      normalizedAddress,
      "read"
    );

    if (!hasAccess) {
      logger.warn("Access denied for profile stats", {
        requestedBy,
        targetAddress: normalizedAddress,
      });
      throw createError.forbidden("Insufficient access rights");
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_profile_stats",
      requestedBy,
      requestId: req.id,
    };

    try {
      const stats = await profileService.getProfileStats(
        normalizedAddress,
        requestMetadata
      );

      if (!stats) {
        throw createError.notFound("Profile not found");
      }

      // Create audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("VIEW_PROFILE_STATS", {
        address: normalizedAddress,
        requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        requestId: req.id,
      });

      const sanitizedStats = await hipaaCompliance.sanitizeResponse(stats);

      res.json({
        success: true,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        stats: sanitizedStats,
      });
    } catch (error) {
      logger.error("Error fetching profile stats", {
        error: error.message,
        address: normalizedAddress,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Update user profile
router.put(
  ENDPOINTS.PROFILE.UPDATE,
  rateLimiters.profile,
  requireAccessControl("write"),
  asyncHandler(async (req, res) => {
    const { address, ...updateData } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      logger.warn("Unauthorized profile update attempt", { ip: req.ip });
      throw createError.unauthorized("Authentication required");
    }

    // Validate address and data
    const normalizedAddress = validateAddress(address || requestedBy);

    logger.info("Profile update request", {
      requestedBy,
      targetAddress: normalizedAddress,
      fields: Object.keys(updateData),
      requestId: req.id,
    });

    try {
      // Enhanced validation with better error reporting
      const validationResult = validateProfileUpdate(updateData);

      if (typeof validationResult === "object" && !validationResult.isValid) {
        throw createError.validation(
          ERROR_CODES.VALIDATION_ERROR.code,
          "Invalid profile data",
          { validationErrors: validationResult.errors }
        );
      }

      // Either use validation result or the original data if validation just returns true
      const validatedData =
        typeof validationResult === "object"
          ? validationResult.data || updateData
          : updateData;

      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "update_profile",
        changes: Object.keys(validatedData).join(", "),
        requestedBy,
        requestId: req.id,
      };

      const updatedProfile = await profileService.updateProfile(
        normalizedAddress,
        validatedData,
        requestMetadata
      );

      if (!updatedProfile) {
        throw createError.notFound("Profile not found");
      }

      // Create comprehensive audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("UPDATE_PROFILE", {
        address: normalizedAddress,
        requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        changes: Object.keys(validatedData),
        requestId: req.id,
      });

      const sanitizedProfile =
        await hipaaCompliance.sanitizeResponse(updatedProfile);

      res.json({
        success: true,
        message: "Profile updated successfully",
        requestId: req.id,
        timestamp: new Date().toISOString(),
        profile: sanitizedProfile,
      });
    } catch (error) {
      logger.error("Error updating profile", {
        error: error.message,
        address: normalizedAddress,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Update user profile image
router.put(
  ENDPOINTS.PROFILE.IMAGE,
  rateLimiters.profile,
  requireAccessControl("write"),
  asyncHandler(async (req, res) => {
    const { address, imageHash } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      logger.warn("Unauthorized profile image update attempt", { ip: req.ip });
      throw createError.unauthorized("Authentication required");
    }

    if (!imageHash) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Image hash is required"
      );
    }

    // Validate address and image hash
    const normalizedAddress = validateAddress(address || requestedBy);

    logger.info("Profile image update request", {
      requestedBy,
      targetAddress: normalizedAddress,
      requestId: req.id,
    });

    try {
      // Validate hash with detailed error handling
      const hashValidation = validateHash(imageHash);
      if (typeof hashValidation === "object" && !hashValidation.isValid) {
        throw createError.validation(
          ERROR_CODES.VALIDATION_ERROR.code,
          hashValidation.error || "Invalid image hash format"
        );
      }

      const validatedHash =
        typeof hashValidation === "string" ? hashValidation : imageHash;

      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "update_profile_image",
        requestedBy,
        requestId: req.id,
      };

      const updatedProfile = await profileService.updateProfileImage(
        normalizedAddress,
        validatedHash,
        requestMetadata
      );

      if (!updatedProfile) {
        throw createError.notFound("Profile not found");
      }

      // Create audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("UPDATE_PROFILE_IMAGE", {
        address: normalizedAddress,
        requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        previousHash: req.body.previousHash,
        newHash: validatedHash,
        requestId: req.id,
      });

      res.json({
        success: true,
        message: "Profile image updated successfully",
        requestId: req.id,
        timestamp: new Date().toISOString(),
        imageHash: updatedProfile.profileImageHash,
      });
    } catch (error) {
      logger.error("Error updating profile image", {
        error: error.message,
        address: normalizedAddress,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Get user profile image
router.get(
  ENDPOINTS.PROFILE.AUDIT,
  rateLimiters.api,
  requireAccessControl("admin"),
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      logger.warn("Unauthorized audit log access attempt", { ip: req.ip });
      throw createError.unauthorized("Authentication required");
    }

    // Validate address - this is required for audit log
    if (!address) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Address is required for audit log access"
      );
    }

    const normalizedAddress = validateAddress(address);

    logger.info("Audit log request", {
      requestedBy,
      targetAddress: normalizedAddress,
      requestId: req.id,
    });

    try {
      // Add audit metadata
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "view_audit_log",
        requestedBy,
        requestId: req.id,
      };

      // Get filtered audit log with pagination support
      const { startDate, endDate, page = 1, limit = 20 } = req.query;

      const auditOptions = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      };

      const auditLog = await profileService.getAuditLog(
        normalizedAddress,
        requestMetadata,
        auditOptions
      );

      // Create meta audit log entry for tracking audit log access
      await hipaaCompliance.createAuditLog("VIEW_AUDIT_LOG", {
        address: normalizedAddress,
        requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        filters: {
          startDate,
          endDate,
          page,
          limit,
        },
        requestId: req.id,
      });

      const sanitizedAuditLog =
        await hipaaCompliance.sanitizeAuditLog(auditLog);

      res.json({
        success: true,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: auditLog.totalCount || auditLog.length,
          pages:
            auditLog.totalPages ||
            Math.ceil(auditLog.length / parseInt(limit, 10)),
        },
        auditLog: sanitizedAuditLog,
      });
    } catch (error) {
      logger.error("Error retrieving audit log", {
        error: error.message,
        address: normalizedAddress,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Delete user profile
router.delete(
  ENDPOINTS.PROFILE.DELETE,
  rateLimiters.profile,
  asyncHandler(async (req, res) => {
    const { address, reason } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      logger.warn("Unauthorized profile deletion attempt", { ip: req.ip });
      throw createError.unauthorized("Authentication required");
    }

    // Validate address
    const normalizedAddress = validateAddress(address || requestedBy);

    logger.info("Profile deletion request", {
      requestedBy,
      targetAddress: normalizedAddress,
      reason: reason || "User initiated",
      requestId: req.id,
    });

    try {
      // Verify admin or self access
      const isSelf = normalizedAddress === requestedBy;
      const isAdmin = req.user.roles?.includes("admin");

      if (!isSelf && !isAdmin) {
        const hasAccess = await hipaaCompliance.verifyAccess(
          requestedBy,
          normalizedAddress,
          "admin"
        );

        if (!hasAccess) {
          logger.warn("Access denied for profile deletion", {
            requestedBy,
            targetAddress: normalizedAddress,
          });
          throw createError.forbidden(
            "Only administrators can delete other user profiles"
          );
        }
      }

      // Require confirmation for deletion
      const confirmation = req.headers["x-delete-confirmation"];
      if (!confirmation || confirmation !== "confirmed") {
        return res.status(428).json({
          success: false,
          message: "Profile deletion requires confirmation",
          requestId: req.id,
          timestamp: new Date().toISOString(),
          instructions:
            "Please add the header 'x-delete-confirmation: confirmed' to proceed",
        });
      }

      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "delete_profile",
        requestedBy,
        reason: reason || "User initiated",
        requestId: req.id,
      };

      // Delete profile with comprehensive auditing
      await profileService.deleteProfile(normalizedAddress, requestMetadata);

      // Final audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("DELETE_PROFILE", {
        address: normalizedAddress,
        requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        reason: reason || "User initiated",
        requestId: req.id,
      });

      res.json({
        success: true,
        message: "Profile deleted successfully",
        requestId: req.id,
        timestamp: new Date().toISOString(),
        address: normalizedAddress,
      });
    } catch (error) {
      logger.error("Error deleting profile", {
        error: error.message,
        address: normalizedAddress,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Get consent settings
router.get(
  "/consent",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    logger.info("Consent settings request", {
      requestedBy,
      requestId: req.id,
    });

    try {
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "view_consent_settings",
        requestId: req.id,
      };

      const consentSettings = await profileService.getConsentSettings(
        requestedBy,
        requestMetadata
      );

      if (!consentSettings) {
        throw createError.notFound("Consent settings not found");
      }

      // Create audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("VIEW_CONSENT_SETTINGS", {
        address: requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        requestId: req.id,
      });

      res.json({
        success: true,
        requestId: req.id,
        timestamp: new Date().toISOString(),
        consentSettings:
          await hipaaCompliance.sanitizeResponse(consentSettings),
      });
    } catch (error) {
      logger.error("Error retrieving consent settings", {
        error: error.message,
        address: requestedBy,
        requestId: req.id,
      });
      throw error;
    }
  })
);

// Update consent settings
router.put(
  "/consent",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { consentSettings } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    if (!consentSettings || typeof consentSettings !== "object") {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Valid consent settings are required"
      );
    }

    logger.info("Consent settings update", {
      requestedBy,
      consentTypes: Object.keys(consentSettings),
      requestId: req.id,
    });

    try {
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "update_consent_settings",
        requestId: req.id,
      };

      const updatedSettings = await profileService.updateConsentSettings(
        requestedBy,
        consentSettings,
        requestMetadata
      );

      // Create audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("UPDATE_CONSENT_SETTINGS", {
        address: requestedBy,
        timestamp: new Date(),
        ipAddress: req.ip,
        changes: Object.keys(consentSettings),
        requestId: req.id,
      });

      res.json({
        success: true,
        message: "Consent settings updated successfully",
        requestId: req.id,
        timestamp: new Date().toISOString(),
        consentSettings:
          await hipaaCompliance.sanitizeResponse(updatedSettings),
      });
    } catch (error) {
      logger.error("Error updating consent settings", {
        error: error.message,
        address: requestedBy,
        requestId: req.id,
      });
      throw error;
    }
  })
);

export default router;
