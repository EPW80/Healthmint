const mongoose = require("mongoose");
const hipaaCompliance = require("../middleware/hipaaCompliance");

const healthDataSchema = new mongoose.Schema(
  {
    // Non-PHI Fields
    owner: {
      type: String,
      required: true,
      lowercase: true,
      ref: "User",
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
      },
    },

    // Market-related fields
    price: {
      type: Number,
      required: true,
      min: 0,
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
      ],
    },

    // Verification and availability
    status: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      isAvailable: {
        type: Boolean,
        default: true,
      },
      verifiedBy: String,
      verificationDate: Date,
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
          enum: ["read", "write", "admin"],
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
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and security
healthDataSchema.index({ owner: 1, category: 1 });
healthDataSchema.index({ "accessControl.address": 1 });
healthDataSchema.index({ "status.isAvailable": 1, "status.isVerified": 1 });

// Pre-save middleware for encryption and updates
healthDataSchema.pre("save", async function (next) {
  try {
    // Update modification timestamp
    this.metadata.lastModified = new Date();

    // Encrypt PHI if modified
    if (this.isModified("protectedData")) {
      if (this.isModified("protectedData.description")) {
        const encrypted = hipaaCompliance.encrypt(
          this.protectedData.description
        );
        this.protectedData.description = encrypted;
      }
      if (this.isModified("protectedData.patientAge")) {
        const encrypted = hipaaCompliance.encrypt(
          this.protectedData.patientAge.toString()
        );
        this.protectedData.patientAge = encrypted;
      }
      if (this.isModified("protectedData.medicalData")) {
        const encrypted = hipaaCompliance.encrypt(
          JSON.stringify(this.protectedData.medicalData)
        );
        this.protectedData.medicalData = encrypted;
      }
    }

    // Generate integrity hash
    this.metadata.integrityHash = await this.generateIntegrityHash();

    next();
  } catch (error) {
    next(error);
  }
});

// Method to decrypt protected data
healthDataSchema.methods.decryptField = async function (fieldName) {
  try {
    const encryptedField = this.protectedData[fieldName];
    if (!encryptedField || !encryptedField.encryptedData) {
      return null;
    }

    return hipaaCompliance.decrypt(
      encryptedField.encryptedData,
      encryptedField.iv,
      encryptedField.authTag
    );
  } catch (error) {
    throw new Error(`Failed to decrypt ${fieldName}`);
  }
};

// Enhanced access verification
healthDataSchema.methods.hasAccess = async function (
  address,
  requiredAccess = "read"
) {
  address = address.toLowerCase();

  // Owner has full access
  if (this.owner === address) return true;

  // Check access control list
  const access = this.accessControl.find(
    (ac) =>
      ac.address === address &&
      ac.accessType === requiredAccess &&
      (!ac.expiresAt || ac.expiresAt > new Date())
  );

  if (!access) return false;

  // Log access attempt
  await this.addAuditLog("access_attempt", address, {
    accessType: requiredAccess,
    granted: !!access,
  });

  return !!access;
};

// Grant access with HIPAA compliance
healthDataSchema.methods.grantAccess = async function (
  address,
  accessType = "read",
  duration = null,
  purpose
) {
  address = address.toLowerCase();

  const access = {
    address,
    accessType,
    grantedAt: new Date(),
    purpose,
    consentObtained: true,
  };

  if (duration) {
    access.expiresAt = new Date(Date.now() + duration);
  }

  this.accessControl.push(access);

  await this.addAuditLog("access_granted", this.owner, {
    grantedTo: address,
    accessType,
    duration,
    purpose,
  });

  return this.save();
};

// Add audit log entry
healthDataSchema.methods.addAuditLog = async function (
  action,
  performedBy,
  details = {}
) {
  this.auditLog.push({
    action,
    performedBy,
    timestamp: new Date(),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    details: JSON.stringify(details),
  });
};

// Generate integrity hash
healthDataSchema.methods.generateIntegrityHash = async function () {
  const content = JSON.stringify({
    protectedData: this.protectedData,
    metadata: this.metadata,
    category: this.category,
    owner: this.owner,
  });

  return hipaaCompliance.generateHash(content);
};

// Static method to find available data by category
healthDataSchema.statics.findByCategory = function (category) {
  return this.find({
    category,
    "status.isAvailable": true,
    "status.isVerified": true,
  }).sort("-createdAt");
};

// Virtual for formatted price
healthDataSchema.virtual("formattedPrice").get(function () {
  return `${this.price} ETH`;
});

const HealthData = mongoose.model("HealthData", healthDataSchema);

module.exports = HealthData;
