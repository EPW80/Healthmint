import AuditLog from "../models/AuditLog.js";
import { logger } from "../config/loggerConfig.js";

// Audit failures must NEVER crash the application. Every write is fire-and-
// forget from the caller's perspective; errors are logged but not rethrown.
async function write(action, details = {}) {
  try {
    await AuditLog.create({
      action,
      userId: details.userId,
      address: details.address,
      requestId: details.requestId,
      ipAddress: details.ipAddress || details.ip,
      userAgent: details.userAgent,
      details,
      timestamp: details.timestamp ? new Date(details.timestamp) : new Date(),
    });
  } catch (err) {
    logger.error("Audit log write failed", { action, error: err.message });
  }
}

export default { write };
