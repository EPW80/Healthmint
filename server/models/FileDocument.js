import mongoose from "mongoose";
import hipaaConfig from "../config/hipaaConfig.js";

const fileDocumentSchema = new mongoose.Schema(
  {
    // File metadata
    fileName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    extension: {
      type: String,
      trim: true,
    },

    // IPFS storage details
    cid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ipfsUrl: {
      type: String,
      required: true,
    },
    storageMethod: {
      type: String,
      enum: ["ipfs", "local", "backup", "hybrid"],
      default: "ipfs",
    },

    // Relationships
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dataset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      default: null,
    },
    relatedDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileDocument",
      },
    ],

    // Classification
    category: {
      type: String,
      default: "General Health",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // HIPAA and PHI information
    containsPHI: {
      type: Boolean,
      default: true,
      index: true,
    },
    sensitivity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    dataTypes: [
      {
        type: String,
        enum: [
          "demographic",
          "clinical",
          "lab",
          "imaging",
          "billing",
          "insurance",
          "notes",
          "other",
        ],
      },
    ],

    // Access control
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    authorizedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    authorizedRoles: [
      {
        type: String,
        enum: ["doctor", "patient", "researcher", "admin"],
      },
    ],
    accessPassphrase: {
      type: String,
      sensitive: true, // Will be encrypted by your middleware
    },

    // Blockchain integration
    registeredOnChain: {
      type: Boolean,
      default: false,
      index: true,
    },
    transactionHash: {
      type: String,
      sparse: true,
    },
    blockNumber: {
      type: Number,
      default: null,
    },
    smartContractAddress: {
      type: String,
      default: null,
    },

    // Monetization
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "ETH",
    },
    purchaseCount: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },

    // Verification and integrity
    checksum: {
      algorithm: {
        type: String,
        enum: ["sha256", "md5", "blake2b"],
        default: "sha256",
      },
      value: {
        type: String,
      },
    },

    // Status tracking
    status: {
      type: String,
      enum: ["processing", "available", "archived", "deleted"],
      default: "processing",
      index: true,
    },

    // Version control
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        cid: String,
        version: Number,
        updatedAt: Date,
        reason: String,
      },
    ],

    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive info
        delete ret.__v;
        delete ret.accessPassphrase;
        return ret;
      },
    },
  }
);

// Text search index
fileDocumentSchema.index({ 
  fileName: "text", 
  description: "text", 
  tags: "text" 
});

// Custom method to securely validate access passphrase
fileDocumentSchema.methods.validatePassphrase = async function (passphrase) {
  if (!this.accessPassphrase) return true;
  
  // Decrypt stored passphrase
  const decryptedStored = await hipaaConfig.encryption.decrypt(this.accessPassphrase);
  return decryptedStored === passphrase;
};

// Method to generate secure access URL
fileDocumentSchema.methods.generateAccessUrl = function (expiresInMinutes = 30) {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const token = hipaaConfig.encryption.generateToken({
    fileId: this._id.toString(),
    cid: this.cid,
    expiresAt,
  });
  
  return `${process.env.API_URL || 'http://localhost:5000'}/api/files/access/${token}`;
};

// Static method to find accessible files for a user
fileDocumentSchema.statics.findAccessibleByUser = function (userId, options = {}) {
  const query = {
    $or: [
      { owner: userId },
      { authorizedUsers: userId },
      { isPublic: true },
    ],
    isDeleted: false,
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.containsPHI === true || options.containsPHI === false) {
    query.containsPHI = options.containsPHI;
  }
  
  return this.find(query);
};

// Middleware: Mark document as available when saved with CID
fileDocumentSchema.pre("save", function (next) {
  if (this.isModified("cid") && this.cid && this.status === "processing") {
    this.status = "available";
  }
  next();
});

// Middleware: Log file access for HIPAA compliance
fileDocumentSchema.pre("findOne", async function () {
  const fileId = this.getQuery()._id;
  
  try {
    await hipaaConfig.audit.logEvent({
      type: "file_access",
      resourceId: fileId,
      timestamp: new Date(),
      details: {
        operation: "file_view",
        collection: "FileDocument",
      },
    });
  } catch (err) {
    console.error("Error logging file access:", err);
  }
});

// Middleware: Soft delete implementation
fileDocumentSchema.statics.softDelete = async function (fileId, userId) {
  const result = await this.findByIdAndUpdate(
    fileId,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "deleted",
    },
    { new: true }
  );
  
  await hipaaConfig.audit.logEvent({
    type: "file_deleted",
    resourceId: fileId,
    userId,
    timestamp: new Date(),
    details: {
      fileName: result.fileName,
      cid: result.cid,
    },
  });
  
  return result;
};

const FileDocument = mongoose.model("FileDocument", fileDocumentSchema);

export default FileDocument;