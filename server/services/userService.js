// server/services/userService.js
// Direct Mongoose DB service — replaces the former HTTP-wrapper that called back
// into our own API (/users/{address}), which was always broken.
import User from "../models/User.js";
import HealthData from "../models/HealthData.js";
import hipaaComplianceService from "./hipaaComplianceService.js";
import { logger } from "../config/loggerConfig.js";

// Map caller-supplied flat fields onto the User schema's nested paths.
// PHI (name, email, age) lives in protectedInfo; security timestamps live in security.
const mapToSchemaFields = (data) => {
  const doc = {};

  // Direct schema fields
  const direct = ["role", "profileImageHash", "walletConnected"];
  direct.forEach((k) => {
    if (data[k] !== undefined) doc[k] = data[k];
  });

  // PHI → protectedInfo
  if (data.name !== undefined) doc["protectedInfo.name"] = data.name;
  if (data.email !== undefined) doc["protectedInfo.email"] = data.email;
  if (data.age !== undefined) doc["protectedInfo.age"] = String(data.age);

  // Security timestamps
  if (data.lastLogin !== undefined) doc["security.lastLogin"] = data.lastLogin;
  if (data.lastActive !== undefined)
    doc["security.lastActive"] = data.lastActive;

  // Statistics
  if (data.statistics !== undefined) doc.statistics = data.statistics;
  if (data.settings !== undefined) doc.settings = data.settings;

  return doc;
};

class ServerUserService {
  async getUserByAddress(address, metadata = {}) {
    if (!address) throw new Error("Address is required");

    const lowerAddress = address.toLowerCase();

    try {
      const user = await User.findOne({ address: lowerAddress });

      if (metadata.requestedBy) {
        await hipaaComplianceService.createAuditLog("VIEW_USER_PROFILE", {
          viewedAddress: lowerAddress,
          requestedBy: metadata.requestedBy,
          timestamp: new Date().toISOString(),
        });
      }

      return user || null;
    } catch (error) {
      logger.error("getUserByAddress failed", {
        error: error.message,
        address: lowerAddress,
      });
      throw error;
    }
  }

  async createUser(userData) {
    if (!userData?.address)
      throw new Error("User data with address is required");

    const lowerAddress = userData.address.toLowerCase();

    try {
      // Build doc — map flat PHI fields into protectedInfo for the schema pre-save hook.
      const doc = {
        address: lowerAddress,
        role: userData.role || "patient",
        ...(userData.profileImageHash && {
          profileImageHash: userData.profileImageHash,
        }),
      };

      if (userData.name)
        doc.protectedInfo = { ...doc.protectedInfo, name: userData.name };
      if (userData.email)
        doc.protectedInfo = { ...doc.protectedInfo, email: userData.email };
      if (userData.age)
        doc.protectedInfo = { ...doc.protectedInfo, age: String(userData.age) };

      const user = await User.create(doc);

      await hipaaComplianceService.createAuditLog("USER_REGISTERED", {
        address: lowerAddress,
        timestamp: new Date().toISOString(),
      });

      return user;
    } catch (error) {
      logger.error("createUser failed", {
        error: error.message,
        address: lowerAddress,
      });
      throw error;
    }
  }

  async updateUser(address, data, metadata = {}) {
    if (!address) throw new Error("Address is required");

    const lowerAddress = address.toLowerCase();

    try {
      const update = mapToSchemaFields(data);
      update.updatedAt = new Date();

      const user = await User.findOneAndUpdate(
        { address: lowerAddress },
        { $set: update },
        { new: true, runValidators: true }
      );

      if (metadata.requestedBy) {
        await hipaaComplianceService.createAuditLog("PROFILE_UPDATED", {
          address: lowerAddress,
          requestedBy: metadata.requestedBy,
          updatedFields: Object.keys(data),
          timestamp: new Date().toISOString(),
        });
      }

      return user;
    } catch (error) {
      logger.error("updateUser failed", {
        error: error.message,
        address: lowerAddress,
      });
      throw error;
    }
  }

  async getUserStats(address, metadata = {}) {
    if (!address) throw new Error("Address is required");

    const lowerAddress =
      typeof address === "string" ? address.toLowerCase() : null;

    try {
      const query = lowerAddress ? { address: lowerAddress } : {};
      const user = lowerAddress ? await User.findOne(query) : null;

      return (
        user?.statistics ?? {
          totalUploads: 0,
          totalPurchases: 0,
          dataQualityScore: 0,
        }
      );
    } catch (error) {
      logger.error("getUserStats failed", { error: error.message, address });
      throw error;
    }
  }

  async getUserHealthData(requestedBy, ownerOrId, metadata = {}) {
    if (!requestedBy) throw new Error("requestedBy is required");

    try {
      const query = { owner: requestedBy.toLowerCase() };
      if (ownerOrId && ownerOrId !== requestedBy) {
        // dataId was passed — look up by ID
        query._id = ownerOrId;
        delete query.owner;
      }

      const records = await HealthData.find(query).lean();

      await hipaaComplianceService.createAuditLog("ACCESS_HEALTH_DATA", {
        requestedBy,
        timestamp: new Date().toISOString(),
        recordCount: records.length,
      });

      return records.length > 0 ? records : null;
    } catch (error) {
      logger.error("getUserHealthData failed", {
        error: error.message,
        requestedBy,
      });
      throw error;
    }
  }

  async getUserAccessLogs(address, metadata = {}) {
    if (!address) throw new Error("Address is required");

    const lowerAddress = address.toLowerCase();

    try {
      const user = await User.findOne({ address: lowerAddress }).select(
        "auditLog accessControl"
      );
      return user?.auditLog ?? [];
    } catch (error) {
      logger.error("getUserAccessLogs failed", {
        error: error.message,
        address: lowerAddress,
      });
      throw error;
    }
  }
}

export const userService = new ServerUserService();
export default userService;
