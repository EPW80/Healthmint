// Server-side KEK wrap/unwrap for per-dataset symmetric keys.
//
// The KEK ("Key Encryption Key") is loaded once from HEALTHMINT_KEK at boot
// and never logged or returned to clients. Per-dataset data keys (generated
// client-side at upload time) are wrapped with this KEK using AES-256-GCM and
// stored in the DataKey collection. Unwrapping happens only inside the
// authorized /api/data/keys/:cid handler.
//
// Limitations (documented in SECURITY.md):
//   - The KEK is a single env-loaded secret, not stored in an HSM/KMS and not
//     split via Shamir/threshold. This is "honest improvement", not production
//     custody. A real deployment would use AWS KMS, HashiCorp Vault, or
//     threshold decryption.

import crypto from "crypto";
import { logger } from "../config/loggerConfig.js";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256-bit
const IV_LEN = 12; // 96-bit nonce recommended for GCM

let cachedKek = null;

function loadKek() {
  if (cachedKek) return cachedKek;
  const raw = process.env.HEALTHMINT_KEK;
  if (!raw) {
    throw new Error(
      "HEALTHMINT_KEK is not set. Refusing to operate without a KEK. " +
        "Generate one with: node -e \"logger.info(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `HEALTHMINT_KEK must be ${KEY_LEN} bytes (${KEY_LEN * 2} hex chars); got ${buf.length} bytes.`
    );
  }
  cachedKek = buf;
  return cachedKek;
}

// Wrap a per-dataset data key.
//   dataKey: string | Buffer  — the symmetric key the client generated for IPFS payload encryption.
//   aad:     optional Buffer/string bound to the wrap (e.g. cid) to defeat substitution.
// Returns { wrappedKey, iv, authTag } as hex strings, suitable for Mongo storage.
export function wrapKey(dataKey, aad) {
  const kek = loadKek();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, kek, iv);
  if (aad !== undefined && aad !== null) {
    cipher.setAAD(
      Buffer.isBuffer(aad) ? aad : Buffer.from(String(aad), "utf8")
    );
  }
  const plaintext = Buffer.isBuffer(dataKey)
    ? dataKey
    : Buffer.from(String(dataKey), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    wrappedKey: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Unwrap. Throws on tampering / wrong AAD / wrong KEK.
//   wrapped: { wrappedKey, iv, authTag } (hex)
//   aad:     same AAD used at wrap time.
// Returns the original data key as a UTF-8 string.
export function unwrapKey(wrapped, aad) {
  const kek = loadKek();
  const iv = Buffer.from(wrapped.iv, "hex");
  const ciphertext = Buffer.from(wrapped.wrappedKey, "hex");
  const authTag = Buffer.from(wrapped.authTag, "hex");
  const decipher = crypto.createDecipheriv(ALGO, kek, iv);
  decipher.setAuthTag(authTag);
  if (aad !== undefined && aad !== null) {
    decipher.setAAD(
      Buffer.isBuffer(aad) ? aad : Buffer.from(String(aad), "utf8")
    );
  }
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Test-only escape hatch; never call from production code.
export function _resetCacheForTests() {
  cachedKek = null;
}
