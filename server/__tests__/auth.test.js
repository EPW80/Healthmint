// Regression tests for the W1 #2 fix: the unauthenticated wallet bypass must
// stay gone. We mount only the auth router on a bare Express app — the routes
// exercised here (the removed bypass, and challenge-input validation) return
// before any Mongo call, so no database is required.

import express from "express";
import request from "supertest";
import authRoutes from "../routes/auth.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  // Minimal error shim so thrown AppErrors become real HTTP responses.
  app.use((err, _req, res, _next) => {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  });
  return app;
}

describe("POST /api/auth/wallet/connect — bypass removed (W1 #2)", () => {
  const app = makeApp();

  it("no longer issues a token for an arbitrary address (was the bypass)", async () => {
    const res = await request(app)
      .post("/api/auth/wallet/connect")
      .send({ address: "0x1111111111111111111111111111111111111111" });

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body).not.toHaveProperty("token");
    expect(JSON.stringify(res.body)).toMatch(/challenge/i);
  });
});

describe("POST /api/auth/wallet/challenge — input validation", () => {
  const app = makeApp();

  it("rejects a request with no address before touching the database", async () => {
    const res = await request(app).post("/api/auth/wallet/challenge").send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body).not.toHaveProperty("token");
  });
});
