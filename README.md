# Healthmint

Healthmint is a decentralized application (dApp) built on Ethereum for secure, HIPAA-compliant health information exchange. It connects patients, providers, and researchers through blockchain technology, enabling privacy-preserving, regulatory-compliant data sharing.

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

- HIPAA-compliant design
- End-to-end encryption
- Blockchain-verified transactions
- Explicit consent management
- Comprehensive audit logs

## Technology Stack

- **Frontend**: React.js, Redux, Tailwind CSS, Web3.js/Ethers.js, MetaMask
- **Backend**: Node.js, Express, MongoDB Atlas, Web3Storage (IPFS), JWT, Winston
- **Blockchain**: Ethereum (Sepolia), Solidity, Truffle, OpenZeppelin
- **Storage**: Web3Storage (IPFS) + MongoDB Atlas metadata
- **Auth**: UCAN tokens, JWT

## Project Structure

```
healthmint/ ├── client/ ├── contracts/ ├── migrations/ ├── server/ └── truffle-config.js
```

## Server Highlights

- Hybrid storage (MongoDB + IPFS)
- End-to-end encrypted file uploads
- Consent and audit management
- Secure authentication with JWT and UCAN
- Rate limiting, CORS protection, validation

## API Overview

```
| Category          | Endpoints (examples)                     |
|-------------------|------------------------------------------|
| Authentication    | `/api/auth/wallet/connect`, `/register`   |
| Health Data       | `/api/data/upload`, `/browse`, `/purchase`|
| Storage           | `/api/storage/upload`, `/get/:id`         |
| Users             | `/api/users/profile`, `/settings`, `/access-log`|
| Tests             | `/api/test/mongodb`, `/test/web3storage`  |
```

## Getting Started

### Prerequisites

- Node.js v16+
- MongoDB Atlas account
- Web3Storage account
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

```
npm install -g truffle
truffle compile
truffle migrate --network sepolia
node server/scripts/deploy.js
```

### User Guide

#### Connecting Wallet

```
Connect MetaMask

Register as Patient or Researcher

Patients
Upload health records

Manage data sharing

View access history

Researchers
Browse and filter datasets

Purchase datasets
```

### Contributing

We welcome any contributions to the application.

````
git checkout -b feature/my-feature
git commit -m "Add feature"
git push origin feature/my-feature```
````

- Submit request

### Licence

- MIT license
