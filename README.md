# Healthmint - Decentralized Health Data Marketplace

Healthmint is a blockchain-based marketplace that enables secure trading of health data between individuals and researchers. Built with React, Ethereum, and IPFS, it provides a transparent and secure platform for health data transactions.

## Features

- **Secure Authentication**

  - MetaMask wallet integration
  - Age verification system
  - User profile management

- **Data Management**

  - Upload health records securely to IPFS
  - Set custom pricing for data
  - Manage data access permissions
  - View transaction history

- **Marketplace Features**

  - Browse available health records
  - Filter by age, category, and verification status
  - Purchase data using ETH
  - Verify data authenticity

- **Security & Privacy**
  - Age verification (18+)
  - Data encryption
  - Smart contract-based access control
  - Transparent transaction tracking

## Technology Stack

- **Frontend**

  - React.js
  - Material-UI
  - Redux Toolkit
  - Web3.js/Ethers.js

- **Backend**

  - Node.js
  - Express
  - MongoDB

- **Blockchain & Storage**
  - Ethereum (Sepolia Testnet)
  - IPFS/Piñata
  - Infura

## Prerequisites

- Node.js (v14 or higher)
- npm/yarn
- MetaMask browser extension
- MongoDB (local or Atlas)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/healthmint.git
cd healthmint
```

2. Install dependencies:

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Configure environment variables:

Create `.env` files in both client and server directories:

```env
# client/.env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_INFURA_PROJECT_ID=your_infura_project_id
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key

# server/.env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

4. Start the development servers:

```bash
# From root directory
npm run dev
```

## Smart Contract Deployment

1. Install Truffle globally:

```bash
npm install -g truffle
```

2. Configure your network in `truffle-config.js`

3. Deploy contracts:

```bash
truffle migrate --network sepolia
```

## Project Structure

```
healthmint/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # React components
│       ├── redux/         # Redux state management
│       ├── contracts/     # Contract ABIs
│       └── utils/         # Helper functions
├── server/                # Node.js backend
│   ├── config/           # Server configuration
│   ├── controllers/      # Route controllers
│   ├── models/          # MongoDB models
│   └── routes/          # API routes
├── contracts/            # Solidity smart contracts
└── migrations/           # Truffle migrations
```

## Usage

1. Connect your MetaMask wallet
2. Complete age verification
3. Upload health data or browse available records
4. Purchase data using ETH
5. View transaction history and manage your data

## Security Considerations

- All uploaded data is encrypted before being stored on IPFS
- Smart contracts are audited for security vulnerabilities
- Age verification is required for all users
- Data access is controlled by smart contracts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<!-- ## Support

For support, email support@healthmint.com or create an issue in the repository.

## Authors

- Your Name (@yourgithub) -->

## Acknowledgments

- OpenZeppelin for smart contract libraries
- IPFS team for decentralized storage
- Ethereum community for blockchain infrastructure
