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
- Track access history with full audit log

### Researchers 🔬

- Discover, filter, and preview health datasets
- Purchase data with ETH via on-chain contract
- Showcase credentials and research profile
- Follow research ethics and citation guidelines

### Security 🔐

- HIPAA-_aware_ design (see [SECURITY.md](./SECURITY.md))
- Off-chain encryption-key custody (keys never touch the chain)
- Signed-nonce wallet authentication (EIP-191)
- Purchase records anchored on-chain via `purchaseData()` events
- Explicit consent management
- Persistent, indexed audit log

### Accessibility

- WCAG-oriented: keyboard navigation, skip links, focus trap in modals
- `aria-live` regions on search results and paginated tables
- `<caption>` on all data tables; semantic landmark structure
- Zero `eslint-plugin-jsx-a11y` violations enforced in CI

## Technology Stack

- **Frontend**: React 18, Redux Toolkit, Tailwind CSS (design token layer), Web3.js/Ethers.js, MetaMask
- **Backend**: Node.js, Express, MongoDB Atlas, Pinata (IPFS), JWT, Winston
- **Blockchain**: Ethereum (Sepolia), Solidity, Truffle, OpenZeppelin
- **Storage**: Pinata (IPFS pinning) + MongoDB Atlas metadata
- **Auth**: Signed-nonce (EIP-191), JWT
- **UI Quality**: `eslint-plugin-jsx-a11y`, Inter + JetBrains Mono fonts, CSS custom property design tokens

## Project Structure

```text
healthmint/ ├── client/ ├── contracts/ ├── migrations/ ├── server/ └── truffle-config.js
```

## Server Highlights

- Hybrid storage (MongoDB + IPFS via Pinata)
- Encrypted-at-rest file uploads (server-mediated key release)
- Consent and audit management
- Signed-nonce wallet authentication with JWT
- Rate limiting, CORS protection, validation

## API Overview

| Category       | Endpoints (examples)                                              |
| -------------- | ----------------------------------------------------------------- |
| Authentication | `/api/auth/wallet/challenge`, `/wallet/authenticate`, `/register` |
| Health Data    | `/api/data/upload`, `/browse`, `/purchase`                        |
| Storage        | `/api/storage/upload`, `/get/:id`                                 |
| Users          | `/api/users/profile`, `/settings`, `/access-log`                  |
| Tests          | `/api/test/mongodb`                                               |

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

Issues and PRs are welcome — see [SECURITY.md](./SECURITY.md) for the project's scope.

```bash
git checkout -b feature/my-feature
git commit -m "Add feature"
git push origin feature/my-feature
```

- Open a pull request

## What I'd do next

Done so far across focused passes:

| Pass | Work |
| ---- | ---- |
| W1 | Six security fixes (self-audit) |
| W2 | Security write-up + README rewrite |
| W3 | Contract + backend tests and CI |
| W4 | Server Winston sweep, client logger shim, dead-code removal |
| W5 | IPFS provider migration to Pinata |
| W6 | Frontend redesign — design token system, UI component overhaul, auth surfaces, Redux consolidation, code splitting |
| W7 | A11y polish — gray token sweep, `aria-live` regions, table captions, `eslint-plugin-jsx-a11y` (0 violations) |

Still remaining:

- **Sepolia redeploy** — update `contractInfo.json` and re-verify artifacts against the live Pinata-backed deployment.
- **Harden key custody** — threshold/Shamir or a managed KMS instead of a single server-held KEK (see [SECURITY.md](./SECURITY.md)).
- **Modernize pinned deps** (`ethers` v5→v6, `web3.js`, `crypto-js`) — out of scope for a surgical pass, intentionally deferred.
- **Dark mode** — design token layer is structured for it; needs a `prefers-color-scheme` media query pass and a toggled `.dark` class on `<html>`.

### License

- MIT

![Healthmint demo](./client/public/images/0411.gif)
