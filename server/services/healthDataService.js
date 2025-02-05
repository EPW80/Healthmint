const User = require("../models/User");
const HealthData = require("../models/HealthData");
const hipaaCompliance = require("../middleware/hipaaCompliance");
const { validateHealthData } = require("../utils/validators");
const { sanitizeData } = require("../utils/sanitizers");
const { AUDIT_TYPES, ACCESS_LEVELS, DATA_RETENTION } = require("../constants");

class DataServiceError extends Error {
  constructor(message, code = "DATA_SERVICE_ERROR", details = {}) {
    super(message);
    this.name = "DataServiceError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

const dataService = {
  // Upload health data with enhanced HIPAA compliance
  async uploadHealthData(address, data, requestDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Normalize and validate address
      const normalizedAddress = address.toLowerCase();

      // Validate input data
      const validationResult = validateHealthData(data);
      if (!validationResult.isValid) {
        throw new DataServiceError(
          "Invalid health data",
          "VALIDATION_FAILED",
          validationResult.errors
        );
      }

      // Verify user exists and has permission
      const user = await User.findOne({ address: normalizedAddress }).session(
        session
      );
      if (!user) {
        throw new DataServiceError("User not found", "USER_NOT_FOUND");
      }

      // Sanitize input data
      const sanitizedData = sanitizeData(data);

      // Enhanced encryption with versioning
      const encryptedData = {
        description: await hipaaCompliance.encryptWithMetadata(
          sanitizedData.description
        ),
        patientAge: await hipaaCompliance.encryptWithMetadata(
          sanitizedData.patientAge.toString()
        ),
        medicalData: await hipaaCompliance.encryptWithMetadata(
          JSON.stringify(sanitizedData.medicalData)
        ),
        encryptionVersion: hipaaCompliance.CURRENT_ENCRYPTION_VERSION,
      };

      // Create new health data record with enhanced metadata
      const healthData = new HealthData({
        owner: normalizedAddress,
        protectedData: encryptedData,
        category: sanitizedData.category,
        price: sanitizedData.price,
        blockchainMetadata: sanitizedData.blockchainMetadata,
        metadata: {
          fileType: sanitizedData.metadata.fileType,
          fileSize: sanitizedData.metadata.fileSize,
          uploadDate: new Date(),
          lastModified: new Date(),
          checksums: await hipaaCompliance.generateFileChecksums(
            sanitizedData.metadata
          ),
          retentionPeriod: DATA_RETENTION.HEALTH_RECORDS,
        },
        status: {
          isVerified: false,
          isAvailable: true,
          verificationRequired: sanitizedData.category === "sensitive",
        },
      });

      // Set granular access controls
      await healthData.grantAccess(
        normalizedAddress,
        ACCESS_LEVELS.ADMIN,
        null, // No expiration for owner
        "Owner Access",
        { consentValidated: true }
      );

      // Comprehensive audit logging
      await healthData.addAuditLog(AUDIT_TYPES.CREATE, normalizedAddress, {
        ipAddress: requestDetails.ipAddress,
        userAgent: requestDetails.userAgent,
        category: sanitizedData.category,
        location: requestDetails.location,
        accessPurpose: requestDetails.purpose || "data_upload",
      });

      // Update user statistics with retry mechanism
      const updateStats = async (retries = 3) => {
        try {
          user.statistics.totalUploads += 1;
          user.statistics.lastUploadDate = new Date();
          await user.save({ session });
        } catch (error) {
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return updateStats(retries - 1);
          }
          throw error;
        }
      };
      await updateStats();

      // Save health data with integrity check
      await healthData.save({ session });

      // Verify data integrity after save
      const integrityCheck = await healthData.verifyIntegrity();
      if (!integrityCheck.isValid) {
        throw new DataServiceError(
          "Data integrity check failed",
          "INTEGRITY_ERROR"
        );
      }

      await session.commitTransaction();

      return {
        success: true,
        healthData: {
          id: healthData._id,
          category: healthData.category,
          price: healthData.price,
          blockchainMetadata: healthData.blockchainMetadata,
          metadata: {
            uploadDate: healthData.metadata.uploadDate,
            retentionPeriod: healthData.metadata.retentionPeriod,
          },
        },
        user: await user.getPublicProfile(),
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error uploading health data:", {
        error,
        address,
        timestamp: new Date(),
        requestId: requestDetails.requestId,
      });
      throw new DataServiceError(
        `Failed to upload health data: ${error.message}`,
        error.code || "UPLOAD_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Get health data with enhanced access control and monitoring
  async getHealthData(requestedBy, dataId, requestDetails) {
    const session = await HealthData.startSession();
    session.startTransaction();

    try {
      // Input validation
      if (!requestedBy || !dataId) {
        throw new DataServiceError(
          "Missing required parameters",
          "INVALID_REQUEST"
        );
      }

      // Find health data with optimized query
      const healthData = await HealthData.findById(dataId)
        .select("+protectedData +accessControl")
        .session(session);

      if (!healthData) {
        throw new DataServiceError("Health data not found", "DATA_NOT_FOUND");
      }

      // Enhanced access control check
      const accessCheck = await healthData.hasAccess(requestedBy, "read");
      if (!accessCheck.granted) {
        await hipaaCompliance.logAccessDenial(
          requestedBy,
          dataId,
          accessCheck.reason
        );
        throw new DataServiceError("Unauthorized access", "ACCESS_DENIED", {
          reason: accessCheck.reason,
        });
      }

      // Verify data hasn't expired
      if (healthData.isExpired()) {
        throw new DataServiceError(
          "Data retention period expired",
          "DATA_EXPIRED"
        );
      }

      // Decrypt with version handling
      const decryptedData = await healthData.decryptProtectedData();

      // Comprehensive access logging
      await healthData.addAuditLog(AUDIT_TYPES.READ, requestedBy, {
        ipAddress: requestDetails.ipAddress,
        userAgent: requestDetails.userAgent,
        accessPurpose: requestDetails.purpose,
        location: requestDetails.location,
        timestamp: new Date(),
      });

      // Update access statistics
      healthData.statistics.viewCount += 1;
      healthData.statistics.lastAccessDate = new Date();
      await healthData.save({ session });

      await session.commitTransaction();

      // Return sanitized response
      return {
        success: true,
        data: {
          ...decryptedData,
          category: healthData.category,
          price: healthData.price,
          blockchainMetadata: healthData.blockchainMetadata,
          metadata: {
            fileType: healthData.metadata.fileType,
            fileSize: healthData.metadata.fileSize,
            uploadDate: healthData.metadata.uploadDate,
            retentionPeriod: healthData.metadata.retentionPeriod,
          },
        },
        accessDetails: {
          grantedAt: new Date(),
          expiresAt: accessCheck.expiresAt,
          purpose: requestDetails.purpose,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error retrieving health data:", {
        error,
        requestedBy,
        dataId,
        timestamp: new Date(),
        requestId: requestDetails.requestId,
      });
      throw new DataServiceError(
        `Failed to retrieve health data: ${error.message}`,
        error.code || "RETRIEVAL_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Purchase health data with enhanced transaction safety
  async purchaseData(buyerAddress, dataId, transactionDetails) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Concurrent fetch of buyer and health data
      const [buyer, healthData] = await Promise.all([
        User.findOne({ address: buyerAddress.toLowerCase() }).session(session),
        HealthData.findById(dataId).session(session),
      ]);

      // Enhanced validation
      if (!buyer) {
        throw new DataServiceError("Buyer not found", "BUYER_NOT_FOUND");
      }
      if (!healthData) {
        throw new DataServiceError("Health data not found", "DATA_NOT_FOUND");
      }

      // Comprehensive availability check
      if (!healthData.isAvailableForPurchase()) {
        throw new DataServiceError(
          "Data not available for purchase",
          "NOT_AVAILABLE",
          { reason: healthData.getUnavailabilityReason() }
        );
      }

      // Verify transaction hasn't been processed before
      const existingTransaction = await healthData.findTransaction(
        transactionDetails.transactionHash
      );
      if (existingTransaction) {
        throw new DataServiceError(
          "Transaction already processed",
          "DUPLICATE_TRANSACTION"
        );
      }

      // Record transaction with additional metadata
      healthData.transactions.push({
        buyer: buyerAddress.toLowerCase(),
        price: healthData.price,
        transactionHash: transactionDetails.transactionHash,
        accessGranted: true,
        timestamp: new Date(),
        metadata: {
          network: transactionDetails.network,
          blockNumber: transactionDetails.blockNumber,
          gasUsed: transactionDetails.gasUsed,
        },
      });

      // Grant time-limited access with consent tracking
      const accessDuration = DATA_RETENTION.PURCHASE_ACCESS; // 1 year in milliseconds
      await healthData.grantAccess(
        buyerAddress.toLowerCase(),
        ACCESS_LEVELS.READ,
        accessDuration,
        "Data Purchase",
        {
          consentValidated: true,
          purchaseTransactionHash: transactionDetails.transactionHash,
        }
      );

      // Update statistics atomically
      healthData.statistics.purchaseCount += 1;
      healthData.statistics.totalRevenue =
        (healthData.statistics.totalRevenue || 0) +
        parseFloat(healthData.price);
      buyer.statistics.totalPurchases += 1;
      buyer.statistics.lastPurchaseDate = new Date();

      // Comprehensive audit logging
      await healthData.addAuditLog(
        AUDIT_TYPES.PURCHASE,
        buyerAddress.toLowerCase(),
        {
          transactionHash: transactionDetails.transactionHash,
          price: healthData.price,
          network: transactionDetails.network,
          location: transactionDetails.location,
          timestamp: new Date(),
          ...transactionDetails,
        }
      );

      // Save all changes atomically
      await Promise.all([
        healthData.save({ session }),
        buyer.save({ session }),
      ]);

      await session.commitTransaction();

      return {
        success: true,
        purchase: {
          dataId: healthData._id,
          transactionHash: transactionDetails.transactionHash,
          accessGranted: true,
          expiresAt: new Date(Date.now() + accessDuration),
          price: healthData.price,
        },
        user: await buyer.getPublicProfile(),
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error processing purchase:", {
        error,
        buyer: buyerAddress,
        dataId,
        timestamp: new Date(),
        transactionHash: transactionDetails.transactionHash,
      });
      throw new DataServiceError(
        `Failed to process purchase: ${error.message}`,
        error.code || "PURCHASE_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Get purchased data with enhanced filtering and pagination
  async getPurchasedData(address, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "uploadDate",
        sortOrder = -1,
        category,
        startDate,
        endDate,
      } = options;

      // Build query with filters
      const query = {
        "transactions.buyer": address.toLowerCase(),
        "transactions.accessGranted": true,
      };

      if (category) {
        query.category = category;
      }

      if (startDate || endDate) {
        query["transactions.timestamp"] = {};
        if (startDate)
          query["transactions.timestamp"].$gte = new Date(startDate);
        if (endDate) query["transactions.timestamp"].$lte = new Date(endDate);
      }

      // Execute query with pagination
      const purchasedData = await HealthData.find(query)
        .select(
          "category price blockchainMetadata metadata.uploadDate transactions"
        )
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await HealthData.countDocuments(query);

      return {
        success: true,
        purchases: purchasedData,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.error("Error retrieving purchased data:", {
        error,
        address,
        timestamp: new Date(),
      });
      throw new DataServiceError(
        `Failed to retrieve purchased data: ${error.message}`,
        "RETRIEVAL_FAILED",
        error.details
      );
    }
  },

  // Enhanced data integrity verification
  async verifyDataIntegrity(dataId) {
    try {
      const healthData = await HealthData.findById(dataId);
      if (!healthData) {
        throw new DataServiceError("Health data not found", "DATA_NOT_FOUND");
      }

      const integrityCheck = await healthData.performIntegrityCheck();

      // Log verification attempt
      await healthData.addAuditLog(AUDIT_TYPES.VERIFY_INTEGRITY, "system", {
        result: integrityCheck.isValid,
        timestamp: new Date(),
        details: integrityCheck.details,
      });

      return {
        success: true,
        isValid: integrityCheck.isValid,
        details: integrityCheck.details,
        lastValidated: new Date(),
      };
    } catch (error) {
      console.error("Error verifying data integrity:", {
        error,
        dataId,
        timestamp: new Date(),
      });
      throw new DataServiceError(
        `Failed to verify data integrity: ${error.message}`,
        "VERIFICATION_FAILED",
        error.details
      );
    }
  },

  // Emergency access handling
  async handleEmergencyAccess(requestedBy, dataId, accessMetadata) {
    const session = await HealthData.startSession();
    session.startTransaction();

    try {
      // Validate provider status
      const provider = await User.findOne({
        address: requestedBy.toLowerCase(),
        role: "provider",
      }).session(session);

      if (!provider) {
        throw new DataServiceError(
          "Emergency access restricted to healthcare providers",
          "UNAUTHORIZED_ACCESS"
        );
      }

      // Find and validate health data
      const healthData = await HealthData.findById(dataId)
        .select("+protectedData +accessControl")
        .session(session);

      if (!healthData) {
        throw new DataServiceError("Health data not found", "DATA_NOT_FOUND");
      }

      // Grant temporary emergency access
      const emergencyDuration = DATA_RETENTION.EMERGENCY_ACCESS; // 30 minutes
      await healthData.grantAccess(
        requestedBy.toLowerCase(),
        ACCESS_LEVELS.EMERGENCY,
        emergencyDuration,
        "Emergency Access",
        {
          emergencyReason: accessMetadata.reason,
          approvedAt: new Date(),
          restrictions: {
            readOnly: true,
            noDownload: true,
            auditRequired: true,
          },
        }
      );

      // Comprehensive emergency audit logging
      await healthData.addAuditLog(
        AUDIT_TYPES.EMERGENCY_ACCESS,
        requestedBy.toLowerCase(),
        {
          ipAddress: accessMetadata.ipAddress,
          userAgent: accessMetadata.userAgent,
          reason: accessMetadata.reason,
          location: accessMetadata.location,
          timestamp: new Date(),
        }
      );

      // Notify data owner (implement notification service)
      await this.notifyEmergencyAccess(healthData.owner, {
        provider: requestedBy,
        reason: accessMetadata.reason,
        dataId: dataId,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + emergencyDuration),
      });

      await session.commitTransaction();

      return {
        success: true,
        message: "Emergency access granted",
        access: {
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + emergencyDuration),
          restrictions: {
            readOnly: true,
            noDownload: true,
            auditRequired: true,
          },
        },
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error granting emergency access:", {
        error,
        requestedBy,
        dataId,
        timestamp: new Date(),
      });
      throw new DataServiceError(
        `Failed to grant emergency access: ${error.message}`,
        error.code || "EMERGENCY_ACCESS_FAILED",
        error.details
      );
    } finally {
      session.endSession();
    }
  },

  // Notify owner of emergency access
  async notifyEmergencyAccess(owner, details) {
    try {
      // Implement notification service integration
      // This could send an email, SMS, or blockchain event
      console.log("Emergency access notification:", {
        owner,
        ...details,
        type: "emergency_access_notification",
      });
    } catch (error) {
      // Log but don't fail the main transaction
      console.error("Failed to send emergency access notification:", error);
    }
  },

  // Get audit logs with filtering
  async getAuditLog(dataId, requestedBy, options = {}) {
    try {
      const healthData = await HealthData.findById(dataId);
      if (!healthData) {
        throw new DataServiceError("Health data not found", "DATA_NOT_FOUND");
      }

      // Verify access permission
      if (!(await healthData.hasAccess(requestedBy, "admin"))) {
        throw new DataServiceError(
          "Unauthorized access to audit logs",
          "ACCESS_DENIED"
        );
      }

      // Filter and sanitize audit logs
      const auditLogs = await healthData.getFilteredAuditLogs(options);

      // Add additional context and metadata
      const enhancedLogs = await Promise.all(
        auditLogs.map(async (log) => ({
          ...log,
          userInfo: await this.getAuditUserInfo(log.performedBy),
          riskLevel: this.calculateAccessRiskLevel(log),
          complianceStatus: this.verifyComplianceRequirements(log),
        }))
      );

      return {
        success: true,
        auditLogs: enhancedLogs,
        summary: {
          totalAccesses: enhancedLogs.length,
          uniqueUsers: new Set(enhancedLogs.map((log) => log.performedBy)).size,
          riskAnalysis: this.summarizeRiskLevels(enhancedLogs),
        },
      };
    } catch (error) {
      console.error("Error retrieving audit logs:", {
        error,
        dataId,
        requestedBy,
        timestamp: new Date(),
      });
      throw new DataServiceError(
        `Failed to retrieve audit logs: ${error.message}`,
        error.code || "AUDIT_RETRIEVAL_FAILED",
        error.details
      );
    }
  },

  // Utility methods for audit log enhancement
  async getAuditUserInfo(address) {
    try {
      const user = await User.findOne({
        address: address.toLowerCase(),
      }).select("role statistics lastActive");
      return user
        ? {
            role: user.role,
            accessCount: user.statistics?.totalAccesses || 0,
            lastActive: user.lastActive,
          }
        : null;
    } catch (error) {
      console.error("Error fetching audit user info:", error);
      return null;
    }
  },

  calculateAccessRiskLevel(log) {
    // Implement risk scoring based on access patterns
    const riskFactors = {
      emergency: 5,
      offHours: 3,
      multipleAttempts: 2,
      unusualLocation: 4,
    };

    let riskScore = 0;
    if (log.action === AUDIT_TYPES.EMERGENCY_ACCESS)
      riskScore += riskFactors.emergency;
    if (this.isOffHoursAccess(log.timestamp)) riskScore += riskFactors.offHours;
    if (log.attempts > 1) riskScore += riskFactors.multipleAttempts;
    if (this.isUnusualLocation(log.location))
      riskScore += riskFactors.unusualLocation;

    return {
      score: riskScore,
      level: riskScore > 7 ? "high" : riskScore > 4 ? "medium" : "low",
      factors: Object.entries(riskFactors)
        .filter(([key, value]) => riskScore >= value)
        .map(([key]) => key),
    };
  },

  verifyComplianceRequirements(log) {
    // Implement compliance verification logic
    const requirements = {
      hasValidPurpose: !!log.details?.purpose,
      hasUserConsent: !!log.details?.consentValidated,
      withinRetentionPeriod: this.isWithinRetentionPeriod(log.timestamp),
      hasRequiredFields: this.hasRequiredAuditFields(log),
    };

    return {
      compliant: Object.values(requirements).every(Boolean),
      requirements,
      missingRequirements: Object.entries(requirements)
        .filter(([, value]) => !value)
        .map(([key]) => key),
    };
  },

  summarizeRiskLevels(logs) {
    const riskCounts = logs.reduce((acc, log) => {
      const risk = this.calculateAccessRiskLevel(log).level;
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});

    return {
      ...riskCounts,
      totalHigh: riskCounts.high || 0,
      requiresAttention:
        (riskCounts.high || 0) > 0 ||
        (riskCounts.medium || 0) > logs.length * 0.2,
    };
  },

  isOffHoursAccess(timestamp) {
    const hour = new Date(timestamp).getHours();
    return hour < 6 || hour > 18;
  },

  isUnusualLocation(location) {
    // Implement location risk analysis
    return false; // Placeholder
  },

  isWithinRetentionPeriod(timestamp) {
    const retentionPeriod = DATA_RETENTION.AUDIT_LOGS;
    return Date.now() - new Date(timestamp).getTime() <= retentionPeriod;
  },

  hasRequiredAuditFields(log) {
    const requiredFields = ["performedBy", "timestamp", "action", "ipAddress"];
    return requiredFields.every((field) => log[field] !== undefined);
  },
};
