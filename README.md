# Healthmint - Decentralized Health Data Marketplace

Healthmint is a blockchain-based marketplace that enables secure trading of health data between individuals and researchers. Built with React, Ethereum, and IPFS, it provides a transparent and secure platform for health data transactions.

## Features

### Secure Authentication

- MetaMask wallet integration
- Age verification system (18+)
- User profile management with role-based access

### Data Management

- Upload health records securely
- Set custom pricing for data
- Manage data access permissions
- Track transaction history

### Marketplace Features

- Browse available health records
- Filter by age, verification status, and category
- Purchase data using ETH
- Verify data authenticity

### Security & Privacy

- Secure wallet connection
- Age verification enforcement
- Smart contract-based access control
- Transparent transaction tracking

## Technology Stack

### Frontend

- React.js with Hooks
- Material-UI components
- Redux Toolkit for state management
- Ethers.js for blockchain integration

### Backend

- Node.js/Express server
- MongoDB database
- JWT authentication

### Blockchain & Storage

- Ethereum (Sepolia Testnet)
- Smart Contracts (Solidity)
- Truffle framework

## Prerequisites

- Node.js (v16 or higher)
- npm/yarn
- MongoDB (v6.0 or higher)
- MetaMask browser extension
- Git

## Installation

### Clone the repository:

```bash
git clone https://github.com/EPW80/Healthmint.git
cd Healthmint
```

### Install dependencies:

```bash
# Install all dependencies (root, client, and server)
npm install
```

### Configure environment variables:

Create `.env` files:

**root/.env**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healthmint
JWT_SECRET=<your_generated_jwt_secret>
```

**client/.env**

```env
REACT_APP_API_URL=http://localhost:5000
```

### Start MongoDB:

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Start the development servers:

```bash
npm run dev
```

## Project Structure

```
Healthmint/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── redux/         # Redux state management
│   │   └── utils/         # Helper functions
├── server/                 # Node.js backend
│   ├── config/            # Server configuration
│   ├── controllers/       # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   └── services/          # Business logic
├── contracts/              # Solidity smart contracts
├── migrations/             # Truffle migrations
└── truffle-config.js       # Truffle configuration
```

## Development Scripts

- `npm run dev`: Start both client and server in development mode
- `npm run client`: Start only the React client
- `npm run server`: Start only the Node.js server
- `npm run install-all`: Install dependencies for all parts of the application
- `npm run clean`: Remove all `node_modules` folders

## Usage

1. Ensure MongoDB is running
2. Start the application with `npm run dev`
3. Connect your MetaMask wallet
4. Complete the registration process
5. Browse or upload health records
6. Manage your data and transactions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and Material-UI
- Powered by Ethereum blockchain
- MongoDB for data storage
- Express.js backend framework
