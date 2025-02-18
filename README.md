# Healthmint 🏥

A decentralized health data marketplace built on Ethereum, enabling secure and private health data transactions.

## Overview

Healthmint is a blockchain-based platform where users can securely:

- Connect their Ethereum wallets
- Upload and manage health records
- Share data with healthcare providers
- Participate in a secure data marketplace

## Features

### Authentication & Security 🔐

- MetaMask wallet integration
- Ethereum-based identity verification
- Role-based access control
- HIPAA-compliant data handling

### Data Management 📊

- Encrypted health record storage
- Granular access controls
- Complete audit trails
- Blockchain-verified ownership

### Marketplace 🛒

- Set custom data pricing
- Purchase records with ETH
- Verified provider status
- Advanced search & filtering

## Tech Stack

### Frontend

- React.js + Redux
- Material-UI components
- Ethers.js for blockchain
- Web3 wallet integration

### Backend

- Node.js & Express
- MongoDB database
- JWT authentication
- HIPAA compliance layer

### Blockchain

- Ethereum (Sepolia Testnet)
- Solidity smart contracts
- Truffle development suite
- IPFS for data storage

## Getting Started

### Prerequisites

- Node.js v16+
- MongoDB v6.0+
- MetaMask browser extension
- Sepolia testnet ETH

### Installation

1. Clone the repository

```bash
git clone https://github.com/EPW80/Healthmint.git
cd Healthmint
```

2. Install dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

3. Set up environment variables

Create `.env` files:

**Server (.env)**

```
PORT=5000
MONGODB_URI=your mongodb url
JWT_SECRET=your_jwt_secret
```

**Client (.env)**

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_INFURA_PROJECT_ID=your_infura_id
```

4. Start development servers

```bash
# Start both client & server
npm run dev

# Start client only
npm run client

# Start server only
npm run server
```

## Project Structure

```
healthmint/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── redux/        # State management
│   │   └── services/     # API services
├── server/                # Node.js backend
│   ├── controllers/      # Route controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── services/        # Business logic
├── contracts/            # Solidity contracts
└── migrations/           # Contract migrations
```

## API Endpoints

| Method | Endpoint                   | Description        |
| ------ | -------------------------- | ------------------ |
| POST   | `/api/auth/wallet/connect` | Connect wallet     |
| POST   | `/api/auth/register`       | Register new user  |
| POST   | `/api/data/upload`         | Upload health data |
| GET    | `/api/data/browse`         | Browse marketplace |
| GET    | `/api/profile/stats`       | Get user stats     |

## Security Measures

- End-to-end encryption
- Smart contract access control
- HIPAA-compliant storage
- Comprehensive audit logging
- Multi-factor authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Erik Williams - erikpw009@gmail.com

Project Link: [https://github.com/EPW80/Healthmint](https://github.com/EPW80/Healthmint)

---

Built with ❤️ by [EPW80](https://github.com/EPW80)
