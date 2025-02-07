const mongoose = require("mongoose");
const hipaaCompliance = require("../middleware/hipaaCompliance");

const userSchema = new mongoose.Schema(
  {
    // Non-PHI Fields (not encrypted)
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Protected Health Information (PHI) - Encrypted
    protectedInfo: {
      name: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
      email: {
        encryptedData: String,
        iv: String,
        authTag: String,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      age: {
        encryptedData: String,
        iv: String,
        authTag: String,
      },
    },

    role: {
      type: String,
      required: true,
      enum: ["patient", "provider", "researcher"],
      default: "patient",
    },

    profileImageHash: {
      type: String,
      required: false,
    },

    statistics: {
      totalUploads: {
        type: Number,
        default: 0,
      },
      totalPurchases: {
        type: Number,
        default: 0,
      },
      dataQualityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    security: {
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      twoFactorSecret: String,
      lastLogin: {
        type: Date,
        default: Date.now,
      },
      lastActive: Date,
      failedLoginAttempts: {
        type: Number,
        default: 0,
      },
      lockoutUntil: Date,
      passwordLastChanged: Date,
    },

    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      dataRetentionPeriod: {
        type: Number,
        default: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years in milliseconds
      },
    },

    // Access Control
    accessControl: [
      {
        grantedTo: {
          type: String,
          required: true,
        },
        accessLevel: {
          type: String,
          enum: ["read", "write", "admin"],
          required: true,
        },
        grantedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        purpose: String,
      },
    ],

    // Audit Trail
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
            "login",
            "logout",
            "access_granted",
            "access_revoked",
          ],
        },
        performedBy: {
          type: String,
          required: true,
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
        userAgent: String,
        details: String,
      },
    ],

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to encrypt PHI
userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("protectedInfo")) {
      // Encrypt name if modified
      if (this.isModified("protectedInfo.name")) {
        const nameEncrypted = hipaaCompliance.encrypt(this.protectedInfo.name);
        this.protectedInfo.name = nameEncrypted;
      }

      // Encrypt email if modified
      if (this.isModified("protectedInfo.email")) {
        const emailEncrypted = hipaaCompliance.encrypt(
          this.protectedInfo.email.toLowerCase()
        );
        this.protectedInfo.email = emailEncrypted;
      }

      // Encrypt age if modified
      if (this.isModified("protectedInfo.age")) {
        const ageEncrypted = hipaaCompliance.encrypt(
          this.protectedInfo.age.toString()
        );
        this.protectedInfo.age = ageEncrypted;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to decrypt PHI fields
userSchema.methods.decryptField = async function (fieldName) {
  try {
    const encryptedField = this.protectedInfo[fieldName];
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

// Method to get public profile (no PHI)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();

  // Remove sensitive/private information
  delete userObject.protectedInfo;
  delete userObject.security;
  delete userObject.settings;
  delete userObject.accessControl;
  delete userObject.auditLog;
  delete userObject.__v;

  return userObject;
};

// Method to get full profile (with decrypted PHI)
userSchema.methods.getFullProfile = async function (requestedBy) {
  const hasAccess = this.verifyAccess(requestedBy, "read");
  if (!hasAccess) {
    throw new Error("Unauthorized access attempt");
  }

  const profile = this.toObject();

  // Decrypt PHI fields
  profile.name = await this.decryptField("name");
  profile.email = await this.decryptField("email");
  profile.age = parseInt(await this.decryptField("age"));

  delete profile.protectedInfo;
  delete profile.__v;

  return profile;
};

// Method to add audit log
userSchema.methods.addAuditLog = async function (
  action,
  performedBy,
  details = {}
) {
  this.auditLog.push({
    action,
    performedBy,
    performedAt: new Date(),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    details: JSON.stringify(details),
  });

  await this.save();
};

// Method to verify access
userSchema.methods.verifyAccess = function (requestedBy, requiredLevel) {
  // Owner always has full access
  if (this.address === requestedBy) {
    return true;
  }

  // Check access control list
  const access = this.accessControl.find(
    (access) =>
      access.grantedTo === requestedBy &&
      access.accessLevel === requiredLevel &&
      access.expiresAt > new Date()
  );

  return !!access;
};

// Static method to find by wallet address
userSchema.statics.findByAddress = function (address) {
  return this.findOne({ address: address.toLowerCase() });
};

// Indexes for performance and security
userSchema.index({ role: 1 });
userSchema.index({
  "accessControl.grantedTo": 1,
  "accessControl.expiresAt": 1,
});
userSchema.index({ "security.lastActive": 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
