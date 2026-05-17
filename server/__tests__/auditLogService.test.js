// W1 #6 fix has a hard safety contract: an audit-log write must NEVER crash
// request handling, even if the database is unreachable. We disable Mongoose
// command buffering so AuditLog.create() rejects immediately when there is no
// connection (instead of buffering for 10s), then assert write() still
// resolves and swallows the error.

import mongoose from "mongoose";
import auditLogService from "../services/auditLogService.js";

beforeAll(() => {
  mongoose.set("bufferCommands", false);
});

describe("auditLogService.write", () => {
  it("resolves without throwing when the database is unavailable", async () => {
    await expect(
      auditLogService.write("API_ACCESS", {
        userId: "0xabc",
        address: "0xABC",
        ip: "127.0.0.1",
      })
    ).resolves.toBeUndefined();
  });

  it("is safe to call with no details", async () => {
    await expect(auditLogService.write("LOGIN")).resolves.toBeUndefined();
  });
});
