# Healthmint

[![CI](https://github.com/EPW80/Healthmint/actions/workflows/ci.yml/badge.svg)](https://github.com/EPW80/Healthmint/actions/workflows/ci.yml)

Healthmint is a decentralized health-data marketplace on Ethereum (Sepolia)
that connects patients, providers, and researchers for consent-driven,
encrypted data sharing. It's a portfolio project demonstrating **full-stack
Web3 engineering** (React/Redux + Node/Express + MongoDB + IPFS + a Solidity
marketplace contract) and **security awareness** — I audited my own code,
found six real vulnerabilities, and fixed each in a focused commit.

> **HIPAA-aware, not HIPAA-compliant.** This project implements the patterns a
> compliant system needs (encryption, consent, access control, audit logging)
> but is not certified, audited, or production-defensible. See
> [SECURITY.md](./SECURITY.md) for the self-audit write-up and an honest list
> of limitations.

## Features

### Patients 👤

- Securely upload and manage health records
- Set detailed access controls
- Share anonymized data
- Monetize data access
- Track access history

### Researchers 🔬

- Discover and filter health datasets
- Purchase data with ETH
- Showcase credentials
- Follow research ethics guidelines

### Security 🔐

- HIPAA-*aware* design (see [SECURITY.md](./SECURITY.md))
- Off-chain encryption-key custody (keys never touch the chain)
- Signed-nonce wallet authentication (EIP-191)
- Blockchain-verified transactions
- Explicit consent management
- Persistent, indexed audit log

## Technology Stack

- **Frontend**: React.js, Redux, Tailwind CSS, Web3.js/Ethers.js, MetaMask
- **Backend**: Node.js, Express, MongoDB Atlas, Web3Storage (IPFS), JWT, Winston
- **Blockchain**: Ethereum (Sepolia), Solidity, Truffle, OpenZeppelin
- **Storage**: Web3Storage (IPFS) + MongoDB Atlas metadata
- **Auth**: UCAN tokens, JWT

## Project Structure

```text
healthmint/ ├── client/ ├── contracts/ ├── migrations/ ├── server/ └── truffle-config.js
```

## Server Highlights

- Hybrid storage (MongoDB + IPFS)
- End-to-end encrypted file uploads
- Consent and audit management
- Secure authentication with JWT and UCAN
- Rate limiting, CORS protection, validation

## API Overview

| Category       | Endpoints (examples)                                    |
|----------------|---------------------------------------------------------|
| Authentication | `/api/auth/wallet/connect`, `/register`                 |
| Health Data    | `/api/data/upload`, `/browse`, `/purchase`              |
| Storage        | `/api/storage/upload`, `/get/:id`                       |
| Users          | `/api/users/profile`, `/settings`, `/access-log`        |
| Tests          | `/api/test/mongodb`, `/test/web3storage`                |

## Getting Started

### Prerequisites

- Node.js v16+
- MongoDB Atlas account
- [Pinata](https://pinata.cloud) account (free tier — for IPFS pinning)
- MetaMask
- Sepolia ETH

### Installation

```bash
git clone https://github.com/EPW80/Healthmint.git
cd Healthmint

# Server Setup
cd server
npm install
cp .env.example .env   # Fill in your environment variables
npm run dev

# Client Setup
cd ../client
npm install
cp .env.example .env   # Fill in API URL and network IDs
npm start

```

### Smart Contracts

```bash
npm install -g truffle
truffle compile
truffle migrate --network sepolia
node server/scripts/deploy.js
```

### User Guide

#### Connecting Wallet

```text
Connect MetaMask → Register as Patient or Researcher

Patients: Upload health records · Manage data sharing · View access history
Researchers: Browse and filter datasets · Purchase datasets
```

### Contributing

We welcome any contributions to the application.

```bash
git checkout -b feature/my-feature
git commit -m "Add feature"
git push origin feature/my-feature
```

- Open a pull request

## What I'd do next

This was a deliberately surgical hardening pass. Done so far: six security
fixes (W1), security write-up + README rewrite (W2), contract + backend tests
and CI (W3), server Winston sweep + client logger shim + dead-code removal (W4),
IPFS provider migration to Pinata (W5). Remaining:

- **Sepolia redeploy** (W6) — update `contractInfo.json` and re-verify artifacts
  against the live Pinata-backed deployment.
- **Harden key custody** — threshold/Shamir or a managed KMS instead of a
  single server-held KEK (see [SECURITY.md](./SECURITY.md)).
- **Modernize pinned deps** (`ethers` v5→v6, `web3.js`, `crypto-js`) — out of
  scope for a surgical pass, intentionally deferred.

### Licence

- MIT license

![Healthmint demo](./client/public/images/0411.gif)
