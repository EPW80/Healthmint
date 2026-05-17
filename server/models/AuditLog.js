import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    address: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    requestId: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Audit logs are immutable — no updatedAt needed.
    timestamps: false,
  }
);

// Compound indexes for the most common query patterns.
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ address: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
