// DataKey — server-held custody of per-dataset symmetric keys.
//
// Replaces the previous (broken) practice of storing the symmetric key on
// chain in HealthDataMarketplace.HealthData.encryptionKey, where any reader
// of contract state could decrypt the corresponding IPFS payload.
//
// One document per CID. The wrappedKey is AES-256-GCM-encrypted with the
// server's HEALTHMINT_KEK (see utils/keyWrap.js). The CID is bound to the
// wrap via AAD, so a swapped wrappedKey from a different document will fail
// authentication on unwrap.
//
// accessList is an embedded allowlist of addresses authorized to fetch the
// unwrapped key in addition to the owner. The purchase flow appends to it.

import mongoose from "mongoose";

const accessGrantSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    grantedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    purpose: String,
  },
  { _id: false }
);

const dataKeySchema = new mongoose.Schema(
  {
    cid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    ownerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    wrappedKey: { type: String, required: true }, // hex
    iv: { type: String, required: true }, // hex, 12 bytes
    authTag: { type: String, required: true }, // hex, 16 bytes
    accessList: { type: [accessGrantSchema], default: [] },
  },
  { timestamps: true }
);

dataKeySchema.methods.isAuthorized = function (address) {
  if (!address) return false;
  const addr = address.toLowerCase();
  if (this.ownerAddress === addr) return true;
  const now = Date.now();
  return this.accessList.some(
    (g) => g.address === addr && (!g.expiresAt || g.expiresAt.getTime() > now)
  );
};

const DataKey = mongoose.model("DataKey", dataKeySchema);
export default DataKey;
