// server/routes/datasets.js
import express from "express";
import { asyncHandler, createError } from "../utils/errorUtils.js";
import { rateLimiters } from "../middleware/rateLimiter.js";
import secureStorageService from "../services/secureStorageService.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { ERROR_CODES } from "../config/hipaaConfig.js";

const router = express.Router();

// Middleware to check if the user is authenticated
router.get(
  "/:id/download",
  rateLimiters.api,
  asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const requestedBy = req.user?.address;

      if (!requestedBy) {
        throw createError.unauthorized("Authentication required");
      }

      // Add audit metadata
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        action: "download_dataset",
        auditMetadata: {
          datasetId: id,
          requestedBy,
        },
      };

      // Get necessary access purpose from header or query
      const accessPurpose =
        req.headers["x-access-purpose"] || req.query.purpose;
      if (!accessPurpose) {
        throw createError.validation(
          ERROR_CODES.VALIDATION_ERROR.code,
          "Access purpose is required for HIPAA compliance"
        );
      }

      // Resolve the secure reference to the actual file
      const secureReference = id;

      // Add audit log for HIPAA compliance
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_ATTEMPT", {
        datasetId: id,
        requestedBy,
        purpose: accessPurpose,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Check access rights
      hipaaCompliance.verifyAccess(requestedBy, id, "read");

      // Download the file with progress tracking
      const result = await secureStorageService.downloadFile(secureReference, {
        accessToken: req.headers.authorization?.split(" ")[1],
        onProgress: (progress) => {
          // Can be used for server-side tracking of long downloads
          console.log(`Download progress for ${id}: ${progress}%`);
        },
        auditMetadata: {
          ...requestMetadata,
          purpose: accessPurpose,
        },
      });

      if (!result || !result.content) {
        throw createError.notFound("Dataset not found or access denied");
      }

      // Set appropriate headers
      res.setHeader(
        "Content-Type",
        result.metadata.type || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.metadata.name || `dataset-${id}.dat`}"`
      );
      res.setHeader("Content-Length", result.content.length);
      res.setHeader("X-HIPAA-Compliant", "true");
      res.setHeader("X-Download-Purpose", accessPurpose);

      // Send the file content
      res.send(result.content);

      // Add successful download audit log
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_COMPLETE", {
        datasetId: id,
        requestedBy,
        fileSize: result.content.length,
        fileName: result.metadata.name,
        timestamp: new Date(),
        ipAddress: req.ip,
      });
    } catch (error) {
      // Add failed download audit log
      await hipaaCompliance.createAuditLog("DATASET_DOWNLOAD_FAILED", {
        datasetId: req.params.id,
        requestedBy: req.user?.address || "anonymous",
        error: error.message,
        timestamp: new Date(),
        ipAddress: req.ip,
      });

      // Re-throw to let the error handler middleware handle it
      throw error;
    }
  })
);

// Middleware to check if the user is authenticated
router.get(
  "/",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { category, page = 1, limit = 10 } = req.query;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "list_datasets",
    };

    // Assuming secureStorageService has a method to browse data
    // similar to browseHealthData but for datasets
    const result = await secureStorageService.browseHealthData({
      filters: {
        category,
        dataType: "dataset", // Add a filter to identify datasets specifically
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
      requestedBy,
      metadata: requestMetadata,
    });

    // Create audit log for HIPAA compliance
    await hipaaCompliance.createAuditLog("LIST_DATASETS", {
      requestedBy,
      filters: { category },
      timestamp: new Date(),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

// Middleware to check if the user is authenticated
router.get(
  "/:id",
  rateLimiters.api,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestedBy = req.user?.address;

    if (!requestedBy) {
      throw createError.unauthorized("Authentication required");
    }

    const accessPurpose = req.headers["x-access-purpose"] || req.query.purpose;
    if (!accessPurpose) {
      throw createError.validation(
        ERROR_CODES.VALIDATION_ERROR.code,
        "Access purpose is required for HIPAA compliance"
      );
    }

    const requestMetadata = {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
      action: "view_dataset_details",
      purpose: accessPurpose,
    };

    const result = await secureStorageService.getHealthDataDetails(
      id,
      requestedBy,
      requestMetadata
    );

    if (!result) {
      throw createError.notFound("Dataset not found or access denied");
    }

    res.json({
      success: true,
      data: await hipaaCompliance.sanitizeResponse(result),
    });
  })
);

export default router;
