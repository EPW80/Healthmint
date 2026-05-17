# Security

Healthmint is a portfolio project: a decentralized health-data marketplace on
Ethereum (Sepolia) with a React/Redux client and a Node/Express + MongoDB +
IPFS backend. This document is deliberately candid. It records a security
self-audit I performed on my own code, the bugs I found and fixed, and — just
as importantly — what this project still does **not** do.

The honest version up front: **Healthmint is HIPAA-*aware*, not
HIPAA-compliant.** It demonstrates the engineering patterns a compliant system
needs (encryption, consent, access control, audit logging). It has not been
certified, formally audited, or operated under a compliance program, and it
should not be used with real protected health information.

## Security self-audit — findings & fixes

I reviewed the codebase as if I were a reviewer seeing it for the first time
and found six issues a careful reader would catch quickly. Each was fixed in a
focused commit; the "before" state is the initial commit, so every fix below is
a real diff you can read.

> **On history.** This `main` branch presents the audit as a clean,
> commit-per-fix narrative. The original, unpolished development history —
> including the genuine pre-audit vulnerable code — is preserved verbatim on
> the [`archive/pre-audit`](https://github.com/EPW80/Healthmint/tree/archive/pre-audit)
> branch (tag `pre-audit-2025-05`). The findings below were reconstructed
> faithfully from that real code; nothing was invented.

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **On-chain encryption key leak.** The `HealthData` struct stored the symmetric `encryptionKey` as a public string next to the IPFS CID. Anyone reading contract state on Sepolia could fetch ciphertext + key and decrypt every dataset. | Critical | [`b305766`](https://github.com/EPW80/Healthmint/commit/b305766) |
| 2 | **Wallet auth bypass.** `POST /api/auth/wallet/connect` issued a JWT for any address in the request body, with no proof of wallet control. | Critical | [`b97f1dd`](https://github.com/EPW80/Healthmint/commit/b97f1dd) |
| 3 | **Hardcoded JWT fallback secret.** Token signing fell back to a literal string committed to the repo when `JWT_SECRET` was unset — forgeable sessions. | High | [`8fe197a`](https://github.com/EPW80/Healthmint/commit/8fe197a) |
| 4 | **Hardcoded Infura key in source.** `deploy-direct.js` embedded an Infura project URL in the committed source. | Medium | [`a62c384`](https://github.com/EPW80/Healthmint/commit/a62c384) |
| 5 | **Auth tokens persisted to `localStorage`.** JWT + refresh token were written to `localStorage` and restored on load — long-lived bearer tokens exposed to any XSS or shared machine. | High | [`b91a653`](https://github.com/EPW80/Healthmint/commit/b91a653) |
| 6 | **Audit log was a no-op.** HIPAA "audit logging" only `console.log`-ed and vanished on process exit. | High | [`660b786`](https://github.com/EPW80/Healthmint/commit/660b786) |

### What the fixes actually do

1. **Off-chain key custody.** `encryptionKey` is removed from the contract
   struct and `listHealthData` signature. The already-encrypted symmetric key
   now lives in MongoDB next to the CID, wrapped with a server-held KEK, and is
   released only to authorized callers via `GET /api/data/keys/:cid`.
2. **Signed-nonce challenge flow.** `POST /wallet/challenge` issues a
   single-use, TTL'd 32-byte nonce (persisted in a `WalletNonce` collection; a
   new challenge supersedes any outstanding one). `POST /wallet/authenticate`
   verifies an EIP-191 signature over the server-issued message. The nonce is
   consumed regardless of signature validity to block online brute-forcing, and
   failed attempts write a `FAILED_AUTHENTICATION` audit entry.
3. **Fail fast on missing secret.** No fallback; token generation throws and
   the server is expected to refuse to boot without `JWT_SECRET`.
4. **Env-loaded RPC.** `SEPOLIA_RPC_URL` is read from `.env` (placeholder in
   `.env.example`); deploy exits with a clear error if it is unset. The
   previously-committed Infura key has been rotated out of band.
5. **In-memory tokens.** Tokens are never written to `localStorage`. A page
   refresh re-establishes the session via wallet reconnect + signature. An
   HTTP-only cookie path (`USE_COOKIE_AUTH`) remains available for deployments
   that want refresh-survival without JS-readable tokens.
6. **Persistent audit trail.** An immutable `AuditLog` Mongoose model
   (compound-indexed on `(userId, timestamp)`, `(address, timestamp)`,
   `(action, timestamp)`) plus a fire-and-forget `auditLogService.write()` that
   swallows its own errors so an audit failure can never crash a request.

## Known limitations (read this before judging the HIPAA framing)

These are deliberate trade-offs for a portfolio project, stated openly rather
than hidden:

- **No HIPAA certification or compliance program.** No BAAs, no risk
  assessment, no breach-notification process, no Security Rule attestation.
  The HIPAA framing is *aspirational design*, not a claim of compliance.
- **No formal smart-contract audit.** The contract uses OpenZeppelin
  primitives (`ReentrancyGuard`, `Pausable`, `AccessControl`) but has not been
  professionally audited or formally verified.
- **Key custody is server-held, not hardened.** The KEK wrapping the symmetric
  keys is a single env-loaded secret. A production system would use threshold/
  Shamir secret sharing or a managed KMS/HSM. This is a documented gap, not an
  oversight.
- **Audit log retention/tamper-evidence is minimal.** Rows are immutable at the
  model level but there is no WORM storage, no retention policy, no log
  signing, and no off-box shipping.
- **Pinned dependencies.** `ethers`, `web3.js`, and `crypto-js` are
  intentionally pinned and not upgraded — this was a surgical hardening pass,
  not a dependency-modernization pass. They would be upgraded in a non-surgical
  follow-up. (The IPFS client stack is a separate planned migration off a
  sunsetted SDK.)
- **Sepolia testnet only.** No mainnet deployment, no real funds, no real
  patients or PHI.

## Reporting

This is a personal portfolio project with no production deployment. If you are
reviewing it and spot something, an issue or a note is welcome — there is no
formal disclosure process and none is warranted for a testnet demo.
