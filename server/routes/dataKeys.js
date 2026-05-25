// /api/data/keys — server-side custody of per-dataset symmetric keys.
//
// This route is the off-chain replacement for the removed
// HealthData.encryptionKey field on HealthDataMarketplaceContract. The client
// uploads encrypted payloads to IPFS as before, then POSTs the data key here.
// The server wraps it with HEALTHMINT_KEK and stores it. Only the owner
// (or an address present on the per-record accessList) can fetch the
// unwrapped key.
//
// Endpoints (all require authMiddleware; owner of the token must match):
//   POST   /api/data/keys                          register a new key
//   GET    /api/data/keys/:cid                     fetch the unwrapped key
//   POST   /api/data/keys/:cid/grant               grant fetch access to another address

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { asyncHandler } from "../errors/index.js";
import { createError } from "../errors/errorFactory.js";
import DataKey from "../models/DataKey.js";
import { wrapKey, unwrapKey } from "../utils/keyWrap.js";

const router = express.Router();

router.use(authMiddleware);

const isHexCid = (s) =>
  typeof s === "string" && s.length > 0 && s.length <= 256;

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { cid, dataKey } = req.body || {};
    if (!isHexCid(cid) || !dataKey || typeof dataKey !== "string") {
      throw createError.validation(undefined, "cid and dataKey are required");
    }

    const ownerAddress = req.user?.address?.toLowerCase();
    if (!ownerAddress) {
      throw createError.unauthorized("Authentication required");
    }

    const existing = await DataKey.findOne({ cid }).lean();
    if (existing) {
      // Idempotency: an owner re-registering is a no-op. A different address
      // attempting to claim an existing CID is rejected.
      if (existing.ownerAddress !== ownerAddress) {
        throw createError.forbidden("CID already registered by another owner");
      }
      return res.status(200).json({ success: true, alreadyRegistered: true });
    }

    const wrapped = wrapKey(dataKey, cid);
    await DataKey.create({
      cid,
      ownerAddress,
      wrappedKey: wrapped.wrappedKey,
      iv: wrapped.iv,
      authTag: wrapped.authTag,
    });

    res.status(201).json({ success: true });
  })
);

router.get(
  "/:cid",
  asyncHandler(async (req, res) => {
    const { cid } = req.params;
    if (!isHexCid(cid)) {
      throw createError.validation(undefined, "Invalid cid");
    }

    const callerAddress = req.user?.address?.toLowerCase();
    if (!callerAddress) {
      throw createError.unauthorized("Authentication required");
    }

    const record = await DataKey.findOne({ cid });
    if (!record) {
      throw createError.notFound("Key not found");
    }
    if (!record.isAuthorized(callerAddress)) {
      throw createError.forbidden("Not authorized to access this key");
    }

    let dataKey;
    try {
      dataKey = unwrapKey(
        {
          wrappedKey: record.wrappedKey,
          iv: record.iv,
          authTag: record.authTag,
        },
        cid
      );
    } catch (err) {
      // Tampering, KEK rotation without re-wrap, or AAD mismatch.
      throw createError.api(
        "KEY_UNWRAP_FAILED",
        "Unable to unwrap stored key",
        { reason: err.message }
      );
    }

    res.json({ success: true, dataKey });
  })
);

router.post(
  "/:cid/grant",
  asyncHandler(async (req, res) => {
    const { cid } = req.params;
    const { address, expiresAt, purpose } = req.body || {};
    if (!isHexCid(cid) || !address || typeof address !== "string") {
      throw createError.validation(
        undefined,
        "cid (path) and address (body) are required"
      );
    }

    const callerAddress = req.user?.address?.toLowerCase();
    if (!callerAddress) {
      throw createError.unauthorized("Authentication required");
    }

    const record = await DataKey.findOne({ cid });
    if (!record) {
      throw createError.notFound("Key not found");
    }
    if (record.ownerAddress !== callerAddress) {
      throw createError.forbidden("Only the owner may grant access");
    }

    const grantee = address.toLowerCase();
    const existingIdx = record.accessList.findIndex(
      (g) => g.address === grantee
    );
    const grant = {
      address: grantee,
      grantedAt: new Date(),
      purpose,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    };
    if (existingIdx >= 0) {
      record.accessList[existingIdx] = grant;
    } else {
      record.accessList.push(grant);
    }
    await record.save();

    res.json({ success: true });
  })
);

export default router;
