import mongoose from "mongoose";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import crypto from "crypto";

// Define the HealthData schema
const healthDataSchema = new mongoose.Schema(
  {
    // Non-PHI Fields
    owner: {
      type: String,
      required: true,
      lowercase: true,
      ref: "User",
      index: true,
    },

    // Blockchain-related fields
    blockchainMetadata: {
      transactionHash: String,
      blockNumber: Number,
      contractAddress: String,
      tokenId: Number,
      ipfsHash: {
        type: String,
        unique: true,
        trim: true,
        sparse: true, // Allow null values while maintaining uniqueness for non-null
      },
    },

    // Market-related fields
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: "Price must be non-negative",
      },
    },

    // Protected Health Information (encrypted)
    protectedData: {
      description: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
      patientAge: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
      medicalData: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
    },

    category: {
      type: String,
      required: true,
      enum: [
        "General Health",
        "Cardiology",
        "Neurology",
        "Orthopedics",
        "Pediatrics",
        "Laboratory",
        "Radiology",
        "Genetics",
        "Mental Health",
        "Dental",
        "Dataset", // Added Dataset category
      ],
      index: true,
    },

    // Dataset-specific metadata
    datasetMetadata: {
      recordCount: Number,
      fields: [String],
      dataDescription: String,
      dataSource: String,
      dateCollected: Date,
      format: {
        type: String,
        enum: ["CSV", "JSON", "XML", "Excel", "Text", "Other"],
      },
      version: String,
      lastUpdated: Date,
      dataQuality: {
        type: Number,
        min: 0,
        max: 100,
      },
      containsPHI: {
        type: Boolean,
        default: true,
      },
      schema: mongoose.Schema.Types.Mixed, // Optional schema definition
      tags: [String],
    },

    // Verification and availability
    status: {
      isVerified: {
        type: Boolean,
        default: false,
        index: true,
      },
      isAvailable: {
        type: Boolean,
        default: true,
        index: true,
      },
      verifiedBy: String,
      verificationDate: Date,
      verificationNotes: String,
    },

    // Transaction history
    transactions: [
      {
        buyer: {
          type: String,
          required: true,
          lowercase: true,
          ref: "User",
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        transactionHash: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        accessGranted: {
          type: Boolean,
          default: false,
        },
        purpose: {
          type: String,
          required: true,
        },
      },
    ],

    // Enhanced access control
    accessControl: [
      {
        address: {
          type: String,
          required: true,
          lowercase: true,
          ref: "User",
        },
        accessType: {
          type: String,
          enum: ["read", "write", "admin", "download"],
          default: "read",
        },
        grantedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
        purpose: {
          type: String,
          required: true,
        },
        consentObtained: {
          type: Boolean,
          default: false,
        },
        accessCount: {
          type: Number,
          default: 0,
        },
        lastAccessed: Date,
      },
    ],

    // File metadata (encrypted sensitive parts)
    metadata: {
      fileType: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
        min: 0,
      },
      encryptedMetadata: {
        data: String,
        iv: String,
        authTag: String,
      },
      uploadDate: {
        type: Date,
        default: Date.now,
      },
      lastModified: Date,
      integrityHash: String,
      filename: {
        type: String,
        trim: true,
      },
      contentHash: String, // Hash of file contents for integrity verification
    },

    // Usage statistics
    statistics: {
      viewCount: {
        type: Number,
        default: 0,
      },
      downloadCount: {
        type: Number,
        default: 0,
      },
      purchaseCount: {
        type: Number,
        default: 0,
      },
      lastViewed: Date,
      lastDownloaded: Date,
      popularityScore: {
        type: Number,
        default: 0,
      },
    },

    // Audit trail
    auditLog: [
      {
        action: {
          type: String,
          required: true,
          enum: [
            "create",
            "read",
            "update",
            "delete",
            "share",
            "access_granted",
            "access_revoked",
            "purchase",
            "download",
            "download_attempt",
            "download_failure",
            "access_attempt",
            "dataset_query",
            "dataset_export",
            "integrity_check",
          ],
        },
        performedBy: {
          type: String,
          required: true,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
        userAgent: String,
        details: String,
        success: {
          type: Boolean,
          default: true,
        },
        purposeOfUse: String,
      },
    ],

    // Data retention
    retention: {
      period: {
        type: Number,
        default: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years in milliseconds
      },
      expiryDate: Date,
      deletionScheduled: Boolean,
      retentionPolicy: {
        type: String,
        enum: ["standard", "extended", "permanent", "custom"],
        default: "standard",
      },
      retentionNotes: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true }, // Include virtuals when converting to Object
  }
);

// Enhanced indexing for better query performance
healthDataSchema.index({ owner: 1, category: 1 });
healthDataSchema.index({
  "accessControl.address": 1,
  "accessControl.accessType": 1,
});
healthDataSchema.index({
  "status.isAvailable": 1,
  "status.isVerified": 1,
  category: 1,
});
healthDataSchema.index({ "datasetMetadata.containsPHI": 1 });
healthDataSchema.index({ "datasetMetadata.tags": 1 });
healthDataSchema.index({ "retention.expiryDate": 1 });
healthDataSchema.index({ createdAt: -1 }); // For date-based sorting

// Pre-save middleware for automatic field management
healthDataSchema.pre("save", async function (next) {
  try {
    // Update modification timestamp
    this.metadata.lastModified = new Date();

    // Auto-set expiry date based on retention period if not already set
    if (this.retention && this.retention.period && !this.retention.expiryDate) {
      this.retention.expiryDate = new Date(Date.now() + this.retention.period);
    }

    // Auto-set filename if not present but we have a fileType
    if (this.metadata.fileType && !this.metadata.filename) {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 8);
      this.metadata.filename = `${this.category.toLowerCase().replace(/\s+/g, "-")}-${timestamp}-${randomStr}.${this.metadata.fileType.split("/").pop()}`;
    }

    // Encrypt PHI if modified using common function
    if (this.isModified("protectedData")) {
      await this.encryptProtectedData();
    }

    // Generate integrity hash
    this.metadata.integrityHash = await this.generateIntegrityHash();

    next();
  } catch (error) {
    console.error("Error in HealthData pre-save middleware:", error);
    next(error);
  }
});

// Method to generate integrity hash
healthDataSchema.methods.encryptProtectedData = async function () {
  const fields = ["description", "patientAge", "medicalData"];

  for (const field of fields) {
    if (this.isModified(`protectedData.${field}`)) {
      let value = this.protectedData[field];

      // Ensure correct string formatting for different types
      if (field === "patientAge" && typeof value !== "string") {
        value = value?.toString() || "";
      } else if (field === "medicalData" && typeof value !== "string") {
        value = JSON.stringify(value || {});
      }

      try {
        const encrypted = hipaaCompliance.encrypt(value);
        this.protectedData[field] = encrypted;
      } catch (error) {
        throw new Error(`Failed to encrypt ${field}: ${error.message}`);
      }
    }
  }
};

// Method to decrypt a specific field
healthDataSchema.methods.decryptField = async function (fieldName) {
  try {
    const encryptedField = this.protectedData[fieldName];
    if (!encryptedField || !encryptedField.encryptedData) {
      return null;
    }

    const decrypted = await hipaaCompliance.decrypt(
      encryptedField.encryptedData,
      encryptedField.iv,
      encryptedField.authTag
    );

    // Parse JSON strings for objects
    if (fieldName === "medicalData") {
      try {
        return JSON.parse(decrypted);
      } catch (e) {
        return decrypted; // Return as is if not valid JSON
      }
    }

    return decrypted;
  } catch (error) {
    console.error(`Decryption error for ${fieldName}:`, error);
    throw new Error(`Failed to decrypt ${fieldName}: ${error.message}`);
  }
};

// Method to check access with enhanced error handling
healthDataSchema.methods.hasAccess = async function (
  address,
  requiredAccess = "read"
) {
  if (!address) return false;

  address = address.toLowerCase();

  // Owner has full access
  if (this.owner === address) return true;

  // Check access control list
  const access = this.accessControl.find(
    (ac) =>
      ac.address === address &&
      (ac.accessType === requiredAccess || ac.accessType === "admin") &&
      (!ac.expiresAt || ac.expiresAt > new Date())
  );

  const hasAccess = !!access;

  // Update access statistics if access granted
  if (hasAccess && access) {
    access.accessCount += 1;
    access.lastAccessed = new Date();
  }

  // Log access attempt (async but don't wait)
  this.addAuditLog("access_attempt", address, {
    accessType: requiredAccess,
    granted: hasAccess,
    timestamp: new Date(),
  }).catch((err) => console.error("Failed to log access attempt:", err));

  return hasAccess;
};

// Method to grant access with enhanced error handling
healthDataSchema.methods.grantAccess = async function (
  address,
  accessType = "read",
  duration = null,
  purpose
) {
  if (!address) throw new Error("Address is required");
  if (!purpose) throw new Error("Purpose is required for HIPAA compliance");

  address = address.toLowerCase();

  // Check if access already exists
  const existingAccessIndex = this.accessControl.findIndex(
    (ac) => ac.address === address && ac.accessType === accessType
  );

  const access = {
    address,
    accessType,
    grantedAt: new Date(),
    purpose,
    consentObtained: true,
    accessCount: 0,
  };

  if (duration) {
    access.expiresAt = new Date(Date.now() + duration);
  }

  // Update existing or add new
  if (existingAccessIndex >= 0) {
    this.accessControl[existingAccessIndex] = {
      ...this.accessControl[existingAccessIndex],
      ...access,
    };
  } else {
    this.accessControl.push(access);
  }

  // Add audit log
  await this.addAuditLog("access_granted", this.owner, {
    grantedTo: address,
    accessType,
    duration,
    purpose,
    timestamp: new Date(),
  });

  return this.save();
};

// Method to revoke access with enhanced error handling
healthDataSchema.methods.revokeAccess = async function (
  address,
  accessType = "all"
) {
  if (!address) throw new Error("Address is required");

  address = address.toLowerCase();

  // Filter the access control list
  if (accessType === "all") {
    this.accessControl = this.accessControl.filter(
      (ac) => ac.address !== address
    );
  } else {
    this.accessControl = this.accessControl.filter(
      (ac) => !(ac.address === address && ac.accessType === accessType)
    );
  }

  // Add audit log
  await this.addAuditLog("access_revoked", this.owner, {
    revokedFrom: address,
    accessType,
    timestamp: new Date(),
  });

  return this.save();
};

// Method to generate integrity hash
healthDataSchema.methods.addAuditLog = async function (
  action,
  performedBy,
  details = {}
) {
  try {
    // Validate required parameters
    if (!action) throw new Error("Audit action is required");
    if (!performedBy) throw new Error("Performer address is required");

    // Create audit entry with enhanced fields
    const auditEntry = {
      action,
      performedBy,
      timestamp: new Date(),
      ipAddress: details.ipAddress || "unknown",
      userAgent: details.userAgent || "unknown",
      details:
        typeof details === "object" ? JSON.stringify(details) : String(details),
      success: details.success !== false, // Default to true unless explicitly false
      purposeOfUse: details.purpose || details.purposeOfUse || "unspecified",
    };

    this.auditLog.push(auditEntry);

    // If the document is already saved (has an _id), update just the audit log
    if (this._id) {
      try {
        await this.constructor.updateOne(
          { _id: this._id },
          { $push: { auditLog: auditEntry } }
        );
      } catch (err) {
        console.error("Failed to update audit log:", err);
        // Continue with in-memory update even if DB update fails
      }
    }
  } catch (error) {
    console.error("Error adding audit log:", error);
    // Don't throw - audit logging should not break main functionality
  }
};

// Method to track file upload
healthDataSchema.methods.trackDownload = async function (
  address,
  details = {}
) {
  try {
    // Update download statistics
    this.statistics.downloadCount += 1;
    this.statistics.lastDownloaded = new Date();

    // Add audit log
    await this.addAuditLog("download", address, {
      ...details,
      timestamp: new Date(),
      success: true,
    });

    // Update the document if it has an _id
    if (this._id) {
      await this.constructor.updateOne(
        { _id: this._id },
        {
          $inc: { "statistics.downloadCount": 1 },
          $set: { "statistics.lastDownloaded": new Date() },
        }
      );
    }
  } catch (error) {
    console.error("Error tracking download:", error);
    // Still log the attempt even if updating stats failed
    await this.addAuditLog("download_failure", address, {
      ...details,
      error: error.message,
      timestamp: new Date(),
      success: false,
    });
  }
};

// Method to generate integrity hash
healthDataSchema.methods.generateIntegrityHash = async function () {
  try {
    const content = JSON.stringify({
      protectedData: this.protectedData,
      metadata: {
        fileType: this.metadata?.fileType,
        fileSize: this.metadata?.fileSize,
        uploadDate: this.metadata?.uploadDate,
      },
      category: this.category,
      owner: this.owner,
      _id: this._id?.toString(),
    });

    // Use the hipaaCompliance utility if available, or create our own hash
    if (typeof hipaaCompliance.generateHash === "function") {
      return hipaaCompliance.generateHash(content);
    } else {
      // Fallback to direct crypto if hipaaCompliance doesn't have generateHash
      return crypto.createHash("sha256").update(content).digest("hex");
    }
  } catch (error) {
    console.error("Error generating integrity hash:", error);
    // Return a fallback hash to prevent errors breaking the save process
    return crypto
      .createHash("sha256")
      .update(`fallback-${this._id || ""}-${new Date().toISOString()}`)
      .digest("hex");
  }
};

// Method to verify integrity
healthDataSchema.methods.verifyIntegrity = async function () {
  try {
    // Generate a fresh hash
    const currentHash = await this.generateIntegrityHash();

    // Compare with stored hash
    const storedHash = this.metadata?.integrityHash;

    // If no stored hash, consider it valid but set the hash
    if (!storedHash) {
      this.metadata.integrityHash = currentHash;
      return true;
    }

    const isValid = currentHash === storedHash;

    // Log integrity check
    await this.addAuditLog("integrity_check", this.owner, {
      result: isValid ? "passed" : "failed",
      storedHash,
      currentHash,
      timestamp: new Date(),
    });

    return isValid;
  } catch (error) {
    console.error("Integrity verification error:", error);
    return false;
  }
};

// Method to find datasets by category with enhanced filtering
healthDataSchema.statics.findByCategory = function (category, options = {}) {
  const {
    minPrice,
    maxPrice,
    verified = true,
    sortBy = "createdAt",
    sortOrder = -1,
  } = options;

  // Build query
  const query = { category };

  // Add availability and verification filters
  if (options.includeUnavailable !== true) {
    query["status.isAvailable"] = true;
  }

  if (verified === true) {
    query["status.isVerified"] = true;
  }

  // Add price range if specified
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  // Add dataset-specific filters
  if (category === "Dataset" && options.datasetFilters) {
    const { containsPHI, tags, format } = options.datasetFilters;

    if (containsPHI !== undefined) {
      query["datasetMetadata.containsPHI"] = containsPHI;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      query["datasetMetadata.tags"] = { $in: tags };
    }

    if (format) {
      query["datasetMetadata.format"] = format;
    }
  }

  // Apply sorting
  const sort = {};
  sort[sortBy] = sortOrder;

  // Execute query with pagination if specified
  let queryBuilder = this.find(query).sort(sort);

  if (options.limit) {
    const page = options.page || 1;
    const skip = (page - 1) * options.limit;
    queryBuilder = queryBuilder.skip(skip).limit(options.limit);
  }

  return queryBuilder.exec();
};

// Method to find all datasets
healthDataSchema.statics.findDatasets = function (options = {}) {
  // Add dataset category to ensure we only get datasets
  return this.findByCategory("Dataset", options);
};

// Method to find datasets by owner
healthDataSchema.statics.findDatasetsByOwner = function (
  ownerAddress,
  options = {}
) {
  if (!ownerAddress) throw new Error("Owner address is required");

  return this.find({
    owner: ownerAddress.toLowerCase(),
    category: "Dataset",
    ...options,
  }).sort({ createdAt: -1 });
};

// Virtual for formatted price
healthDataSchema.virtual("formattedPrice").get(function () {
  return `${this.price} ETH`;
});

// Virtual for data age in days
healthDataSchema.virtual("ageInDays").get(function () {
  const createdDate = this.createdAt || new Date();
  const now = new Date();
  const diffTime = Math.abs(now - createdDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for access status summary
healthDataSchema.virtual("accessSummary").get(function () {
  return {
    totalAccessGrants: this.accessControl.length,
    activeGrants: this.accessControl.filter(
      (ac) => !ac.expiresAt || ac.expiresAt > new Date()
    ).length,
    expiredGrants: this.accessControl.filter(
      (ac) => ac.expiresAt && ac.expiresAt <= new Date()
    ).length,
  };
});

// Virtual for whether this is a dataset
healthDataSchema.virtual("isDataset").get(function () {
  return this.category === "Dataset";
});

// Create the model
const HealthData = mongoose.model("HealthData", healthDataSchema);

export default HealthData;
