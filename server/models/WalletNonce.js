// WalletNonce — single-use challenge nonces for EIP-191 wallet authentication.
//
// Replaces the previous (broken) practice of:
//   1. POST /wallet/connect auto-issuing a JWT for any claimed address, and
//   2. POST /wallet/challenge stashing the challenge in `req.session` while no
//      session middleware was wired up, so the challenge silently evaporated
//      before /wallet/authenticate could check it.
//
// One document per (address, nonce). Mongo's TTL monitor deletes expired
// records automatically via the expiresAt index. We also explicitly delete a
// nonce on successful use, so replay is defeated even before TTL fires.

import mongoose from "mongoose";

const walletNonceSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    nonce: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      // The full canonical message the client is asked to sign. Stored so
      // authentication is a strict equality check rather than message
      // reconstruction, eliminating a class of mismatch bugs.
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index — Mongo background sweep removes expired docs.
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const WalletNonce = mongoose.model("WalletNonce", walletNonceSchema);
export default WalletNonce;
