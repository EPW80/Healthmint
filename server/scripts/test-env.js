#!/usr/bin/env node
/**
 * Validates and live-tests every variable in server/.env.
 * Run from the server/ directory: node scripts/test-env.js
 */

import "dotenv/config";
import https from "node:https";
import http from "node:http";
import mongoose from "mongoose";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m";

let failures = 0;

function check(label, ok, detail = "") {
  const icon = ok ? PASS : FAIL;
  if (!ok) failures++;
  console.log(`  ${icon} ${label}${detail ? "  — " + detail : ""}`);
  return ok;
}

function warn(label, detail = "") {
  console.log(`  ${WARN} ${label}${detail ? "  — " + detail : ""}`);
}

function info(label, detail = "") {
  console.log(`  ${INFO} ${label}${detail ? "  — " + detail : ""}`);
}

function isHex(str, expectedBytes) {
  return (
    typeof str === "string" &&
    new RegExp(`^[0-9a-fA-F]{${expectedBytes * 2}}$`).test(str)
  );
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers, timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

// ── 1. Crypto keys ────────────────────────────────────────────────────────────
console.log("\n[1] Crypto keys");
check(
  "HEALTHMINT_KEK is 32-byte hex",
  isHex(process.env.HEALTHMINT_KEK, 32),
  `length=${process.env.HEALTHMINT_KEK?.length ?? 0}`
);
check(
  "ENCRYPTION_KEY is 32-byte hex",
  isHex(process.env.ENCRYPTION_KEY, 32),
  `length=${process.env.ENCRYPTION_KEY?.length ?? 0}`
);
check(
  "JWT_SECRET present and ≥ 32 chars",
  typeof process.env.JWT_SECRET === "string" &&
    process.env.JWT_SECRET.length >= 32,
  `length=${process.env.JWT_SECRET?.length ?? 0}`
);

// ── 2. Server basics ──────────────────────────────────────────────────────────
console.log("\n[2] Server");
const port = Number(process.env.PORT);
check("PORT is a valid number", Number.isInteger(port) && port > 0, `${port}`);
check(
  "NODE_ENV is set",
  ["development", "production", "test"].includes(process.env.NODE_ENV),
  process.env.NODE_ENV
);
check(
  "ALLOWED_ORIGINS present",
  Boolean(process.env.ALLOWED_ORIGINS),
  process.env.ALLOWED_ORIGINS
);

// ── 3. Auth / session ─────────────────────────────────────────────────────────
console.log("\n[3] Auth");
check(
  "JWT_EXPIRY present",
  Boolean(process.env.JWT_EXPIRY),
  process.env.JWT_EXPIRY
);
check(
  "REFRESH_TOKEN_EXPIRY present",
  Boolean(process.env.REFRESH_TOKEN_EXPIRY),
  process.env.REFRESH_TOKEN_EXPIRY
);

// ── 4. Pinata ─────────────────────────────────────────────────────────────────
console.log("\n[4] Pinata / IPFS");
const pinataJwt = process.env.PINATA_JWT ?? "";
const jwtParts = pinataJwt.split(".");
check(
  "PINATA_JWT looks like a JWT (3 parts)",
  jwtParts.length === 3,
  `parts=${jwtParts.length}`
);
check(
  "PINATA_GATEWAY present",
  Boolean(process.env.PINATA_GATEWAY),
  process.env.PINATA_GATEWAY
);
check(
  "IPFS_PROVIDER is pinata",
  process.env.IPFS_PROVIDER === "pinata",
  process.env.IPFS_PROVIDER
);

// live Pinata auth test
process.stdout.write("  … testing Pinata JWT against api.pinata.cloud …\r");
try {
  const res = await httpGet(
    "https://api.pinata.cloud/data/testAuthentication",
    {
      Authorization: `Bearer ${pinataJwt}`,
    }
  );
  check("Pinata JWT authenticates", res.status === 200, `HTTP ${res.status}`);
  if (res.status === 200) info("Pinata response", res.body.trim());
} catch (err) {
  check("Pinata JWT authenticates", false, err.message);
}

// ── 5. Blockchain / RPC ───────────────────────────────────────────────────────
console.log("\n[5] Blockchain");
check(
  "NETWORK_ID present",
  Boolean(process.env.NETWORK_ID),
  process.env.NETWORK_ID
);
check(
  "BLOCKCHAIN_NETWORK present",
  Boolean(process.env.BLOCKCHAIN_NETWORK),
  process.env.BLOCKCHAIN_NETWORK
);

const rpcUrl = process.env.SEPOLIA_RPC_URL ?? "";
check("SEPOLIA_RPC_URL present", Boolean(rpcUrl), rpcUrl);

// live RPC reachability test (eth_blockNumber JSON-RPC)
if (rpcUrl) {
  process.stdout.write("  … probing Sepolia RPC …\r");
  try {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    });
    const result = await new Promise((resolve, reject) => {
      const mod = rpcUrl.startsWith("https") ? https : http;
      const url = new URL(rpcUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 8000,
      };
      const req = mod.request(options, (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
      req.write(body);
      req.end();
    });
    let ok = result.status === 200;
    let detail = `HTTP ${result.status}`;
    if (ok) {
      const json = JSON.parse(result.body);
      if (json.result) {
        const block = parseInt(json.result, 16);
        detail = `block #${block.toLocaleString()}`;
      } else if (json.error) {
        ok = false;
        detail = json.error.message;
      }
    }
    check("Sepolia RPC responds", ok, detail);
  } catch (err) {
    check("Sepolia RPC responds", false, err.message);
  }
}

if (!process.env.PRIVATE_KEY) {
  warn("PRIVATE_KEY not set", "contract deploy / signing unavailable");
}
if (!process.env.CONTRACT_ADDRESS) {
  warn("CONTRACT_ADDRESS not set", "blockchain features may be limited");
}

// ── 6. MongoDB ────────────────────────────────────────────────────────────────
console.log("\n[6] MongoDB");
const mongoUri = process.env.MONGODB_URI ?? "";
check("MONGODB_URI present", Boolean(mongoUri));

if (mongoUri) {
  process.stdout.write("  … connecting to MongoDB …\r");
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    const state = mongoose.connection.readyState; // 1 = connected
    check("MongoDB connection succeeds", state === 1, `readyState=${state}`);
    await mongoose.disconnect();
  } catch (err) {
    check("MongoDB connection succeeds", false, err.message);
  }
}

// ── 7. Logging ────────────────────────────────────────────────────────────────
console.log("\n[7] Logging");
check(
  "LOG_LEVEL present",
  Boolean(process.env.LOG_LEVEL),
  process.env.LOG_LEVEL
);
check("LOG_DIR present", Boolean(process.env.LOG_DIR), process.env.LOG_DIR);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
if (failures === 0) {
  console.log(`\x1b[32mAll checks passed.\x1b[0m`);
} else {
  console.log(`\x1b[31m${failures} check(s) failed.\x1b[0m`);
  process.exit(1);
}
