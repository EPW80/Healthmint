// server/routes/users.js
import express from "express";
import {
  validateAddress,
  validateProfile as validateProfileUpdate,
} from "../validation/index.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { ENDPOINTS } from "../config/networkConfig.js";
import { asyncHandler, createError } from "../errors/index.js";
import { rateLimiters } from "../middleware/rateLimiter.js";
import { userService } from "../services/userService.js";
import authMiddleware, { authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Helper function to validate and normalize address while maintaining existing error format
const validateAndNormalizeAddress = (address) => {
  const result = validateAddress(address);
  if (!result.isValid) {
    throw createError.validation(result.error, result.code);
  }
  return result.normalizedAddress;
};

// Middleware to check if user is authenticated
router.get(
  ENDPOINTS.USERS.PROFILE,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const normalizedAddress = validateAndNormalizeAddress(
      address || requestedBy
    );

    // Check if user is requesting their own profile or has admin access
    const isSelf = normalizedAddress === requestedBy;
    if (!isSelf) {
      await hipaaCompliance.verifyAccess(
        requestedBy,
        normalizedAddress,
        "read"
      );
    }

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
      throw createError.notFound("User not found");
    }

    // Return full profile for own user, otherwise public profile
    const profile = isSelf
      ? await user.getFullProfile(requestedBy)
      : await user.getPublicProfile();

    // Create audit log for HIPAA compliance
    await hipaaCompliance.createAuditLog("VIEW_PROFILE", {
      userId: user.id,
      address: normalizedAddress,
      requestedBy,
      timestamp: new Date(),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      profile: await hipaaCompliance.sanitizeResponse(profile),
    });
  })
);

// Create new user
router.put(
  ENDPOINTS.USERS.PROFILE,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { address, ...updateData } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const normalizedAddress = validateAndNormalizeAddress(
      address || requestedBy
    );

    // Validate update data
    const validateResult = validateProfileUpdate(updateData);
    if (!validateResult.isValid) {
      throw createError.validation(
        "Profile validation failed",
        "PROFILE_VALIDATION_ERROR",
        { errors: validateResult.errors }
      );
    }
    const validatedData = updateData; 

    // Check if user is updating their own profile or has admin access
    const isSelf = normalizedAddress === requestedBy;
    if (!isSelf) {
      await hipaaCompliance.verifyAccess(
        requestedBy,
        normalizedAddress,
        "write"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "update_profile",
      changes: Object.keys(validatedData),
      requestedBy,
    };

    // Update user profile
    const updatedUser = await userService.updateUser(
      normalizedAddress,
      validatedData,
      requestMetadata
    );

    if (!updatedUser) {
      throw createError.notFound("User not found");
    }

    // Get profile data to return
    const profile = isSelf
      ? await updatedUser.getFullProfile(requestedBy)
      : await updatedUser.getPublicProfile();

    // Create audit log for HIPAA compliance
    await hipaaCompliance.createAuditLog("UPDATE_PROFILE", {
      userId: updatedUser.id,
      address: normalizedAddress,
      requestedBy,
      timestamp: new Date(),
      ipAddress: req.ip,
      changes: Object.keys(validatedData),
    });

    res.json({
      success: true,
      profile: await hipaaCompliance.sanitizeResponse(profile),
    });
  })
);

// Update user role
router.post(
  "/role",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { role, address } = req.body;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    // Check if role is valid
    if (!role || !["patient", "researcher", "provider"].includes(role)) {
      throw createError.validation("Invalid role specified");
    }

    // Determine which address to update - defaults to requesting user
    const targetAddress = address || requestedBy;
    const normalizedAddress = validateAndNormalizeAddress(targetAddress);

    // Only self or admin can update roles
    const isSelf = normalizedAddress === requestedBy;
    if (!isSelf) {
      // Check if user has admin privileges
      const isAdmin = req.user.roles.includes("admin");
      if (!isAdmin) {
        throw createError.forbidden(
          "Only administrators can update other users' roles"
        );
      }
    }

    // Update user role
    const result = await userService.updateUser(
      normalizedAddress,
      {
        role,
        lastRoleUpdate: new Date(),
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "update_role",
        requestedBy,
      }
    );

    if (!result) {
      throw createError.notFound("User not found");
    }

    // Create audit log
    await hipaaCompliance.createAuditLog("ROLE_UPDATE", {
      userId: result.id,
      address: normalizedAddress,
      newRole: role,
      timestamp: new Date(),
      ipAddress: req.ip,
      requestedBy,
    });

    // Return updated user data
    const sanitizedUser = await hipaaCompliance.sanitizeResponse(result);

    res.json({
      success: true,
      message: `Role updated to ${role}`,
      user: sanitizedUser,
      roles: [role],
    });
  })
);

// Update user consent
router.get(
  ENDPOINTS.USERS.ACCESS_LOG,
  rateLimiters.api,
  authorize(["admin"]), // Only admins can access this route
  asyncHandler(async (req, res) => {
    const { address } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const normalizedAddress = validateAndNormalizeAddress(
      address || requestedBy
    );

    // Admin can view any log, user can only view their own
    const isSelf = normalizedAddress === requestedBy;
    const isAdmin = req.user.roles.includes("admin");

    if (!isSelf && !isAdmin) {
      throw createError.forbidden("Access denied");
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_access_log", // Changed from update_consent to view_access_log
      requestedBy,
    };

    // This endpoint seems to mix getting access logs with updating consent
    // There seems to be a bug here - validatedConsent is not defined
    // Let's fix this by getting access logs instead
    const accessLogs = await userService.getUserAccessLogs(
      normalizedAddress,
      requestMetadata
    );

    // Create audit log for HIPAA compliance
    await hipaaCompliance.createAuditLog("VIEW_ACCESS_LOG", {
      address: normalizedAddress,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.id,
    });

    res.json({
      success: true,
      message: "Access logs retrieved successfully",
      timestamp: new Date(),
      accessLogs: await hipaaCompliance.sanitizeResponse(accessLogs),
    });
  })
);

// Retrieve user settings
router.get(
  ENDPOINTS.USERS.SETTINGS,
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_settings",
      requestedBy,
    };

    const settings = await userService.getUserStats(
      requestedBy,
      requestMetadata
    );

    if (!settings) {
      throw createError.notFound("User settings not found");
    }

    res.json({
      success: true,
      settings: await hipaaCompliance.sanitizeResponse(settings),
    });
  })
);

export default router;
