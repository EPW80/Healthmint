## Overview

Healthmint is a decentralized application (dApp) built on Ethereum that enables secure and HIPAA-compliant health information exchange. The platform connects patients, healthcare providers, and researchers through blockchain technology, providing a secure marketplace for health data while maintaining regulatory compliance and protecting user privacy.

## Key Features

### For Patients 👤

- **Health record uploads**: Securely store medical documents and data
- **Detailed access control**: Choose what data is shared and with whom
- **Data anonymization**: Share data while protecting personal information
- **Monetization options**: Set pricing for researcher access to your data
- **Complete audit trails**: See who accessed your data and when

### For Researchers 🔬

- **Dataset discovery**: Browse available health datasets
- **Advanced filtering**: Find exactly the data you need
- **Secure purchasing**: Buy access to datasets using ETH
- **Research credentials**: Showcase your qualifications and publications
- **Ethics compliance**: Built-in research ethics guidelines

### Security & Compliance 🔐

- **HIPAA-compliant architecture**: Full regulatory compliance throughout
- **End-to-end encryption**: All sensitive data is encrypted
- **Blockchain verification**: Immutable record of all data transactions
- **Consent management**: Explicit patient consent tracking for all data access
- **Privacy-preserving tools**: Data anonymization and access controls
- **Comprehensive audit logging**: Track all system interactions

## Technology Stack

### Frontend

- **React.js** with Redux for state management
- **Tailwind CSS** for responsive design
- **Web3.js/Ethers.js** for blockchain integration
- **MetaMask** integration for authentication and transactions

### Backend

- **Node.js/Express** for the API server
- **MongoDB** with Mongoose for database
- **IPFS** for decentralized, secure file storage
- **Ethers.js** for blockchain interactions
- **JWT** for authentication
- **Winston** for centralized logging

### Blockchain

- **Ethereum** (Sepolia testnet)
- **Solidity** smart contracts
- **Truffle** development framework
- **OpenZeppelin** for secure contracts

## Project Structure

```
healthmint/
├── client/ # React frontend
│ ├── src/
│ │ ├── components/ # UI components
│ │ ├── hooks/ # Custom React hooks
│ │ ├── redux/ # Redux state management
│ │ ├── services/ # API and blockchain services
│ │ └── utils/ # Utility functions
├── contracts/ # Ethereum smart contracts
│ ├── HealthDataMarketplace.sol # Main marketplace contract
│ └── Migrations.sol # Migration contract
├── migrations/ # Truffle migrations
├── server/ # Backend API server
│ ├── config/ # Configuration files
│ │ ├── hipaaConfig.js # HIPAA compliance settings
│ │ ├── loggerConfig.js # Logging configuration
│ │ └── networkConfig.js # Blockchain network settings
│ ├── middleware/ # Express middleware
│ │ ├── authMiddleware.js # Authentication middleware
│ │ ├── hipaaCompliance.js # HIPAA compliance middleware
│ │ ├── rateLimiter.js # Rate limiting
│ │ └── validation.js # Request validation
│ ├── models/ # Database models
│ │ ├── User.js # User model
│ │ └── HealthData.js # Health data model
│ ├── routes/ # API routes
│ │ ├── auth.js # Authentication routes
│ │ ├── data.js # Health data routes
│ │ ├── profile.js # User profile routes
│ │ └── users.js # User management routes
│ ├── services/ # Business logic
│ │ ├── apiService.js # External API client
│ │ ├── authService.js # Authentication service
│ │ ├── profileService.js # Profile management
│ │ ├── secureStorageService.js # HIPAA-compliant storage
│ │ ├── transactionService.js # Blockchain transactions
│ │ └── userService.js # User management
│ ├── utils/ # Utility functions
│ │ ├── apiError.js # Error handling
│ │ ├── asyncHandler.js # Async route handling
│ │ ├── errorUtils.js # Centralized error utilities
│ │ ├── sanitizers.js # Data sanitization
│ │ └── validators.js # Data validation
│ ├── scripts/ # Helper scripts
│ ├── server.js # Express server entry point
│ └── index.js # Application bootstrapping
└── truffle-config.js # Truffle configuration
```

## Server Features

### HIPAA Compliance Layer

- **Data encryption**: End-to-end encryption for PHI (Protected Health Information)
- **Access control**: Role-based access with granular permissions
- **Audit logging**: Comprehensive tracking of all data access and operations
- **Consent management**: Explicit tracking of patient consent
- **Data sanitization**: Automated removal of sensitive information

### API Endpoints

#### Authentication

- `/api/auth/wallet/connect`: Connect Ethereum wallet
- `/api/auth/register`: Register new user
- `/api/auth/verify`: Verify user wallet

#### Health Data

- `/api/data/upload`: Upload health data
- `/api/data/browse`: Browse available health data
- `/api/data/browse/:id`: Get specific health data details
- `/api/data/purchase`: Purchase access to health data
- `/api/data/emergency-access`: Request emergency access

#### User Management

- `/api/users/profile`: Get/update user profile
- `/api/users/settings`: Get/update user settings
- `/api/users/role`: Set/update user role
- `/api/users/access-log`: Get user access log

#### Profile Management

- `/api/profile/stats`: Get profile statistics
- `/api/profile/update`: Update profile information
- `/api/profile/image`: Update profile image
- `/api/profile/audit`: Get profile audit log
- `/api/profile/delete`: Delete user profile

### Security Features

- **Request rate limiting**: Prevent abuse through rate limiting
- **JWT authentication**: Secure token-based authentication
- **Middleware validation**: Input validation on all endpoints
- **Error handling**: Standardized error responses
- **CORS protection**: Configured for security

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB
- MetaMask browser extension
- Ethereum on Sepolia testnet
- IPFS node (optional, uses Infura by default)

### Installation

1.  Clone the repository

`git clone https://github.com/EPW80/Healthmint.git cd Healthmint`

1.  Install server dependencies

`cd server npm  install`

1.  Set up environment variables Create a `.env` file in the server directory:

`NODE_ENV=development PORT=5000 MONGODB_URI=mongodb://localhost:27017/healthmint JWT_SECRET=your_jwt_secret_key ENCRYPTION_KEY=your_encryption_key_32_bytes_hex SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key PRIVATE_KEY=your_ethereum_private_key CONTRACT_ADDRESS=your_deployed_contract_address`

1.  Start the server

`npm start`

For development with auto-reload:

`npm run dev`

### Smart Contract Deployment

1.  Install Truffle globally

`npm  install -g truffle`

1.  Compile and migrate the contracts

`truffle compile truffle migrate --network sepolia`

1.  Run the deployment script

`node server/scripts/deploy.js`

### Testing Blockchain Connectivity

`node server/scripts/testConnection.js`

## Client Setup

1.  Install client dependencies

`cd client npm  install`

1.  Set up environment variables Create a `.env` file in the client directory:

`REACT_APP_API_URL=http://localhost:5000 REACT_APP_CHAIN_ID=0xaa36a7  # Sepolia testnet REACT_APP_NETWORK_ID=11155111`

1.  Start the development server

`npm start`

## User Guide

### Connecting Your Wallet

- Ensure MetaMask is installed in your browser
- Visit the Healthmint website and click "Connect Wallet"
- Approve the connection in MetaMask
- Complete registration by selecting your role (Patient or Researcher)

### For Patients

- Upload health records: Navigate to the Upload section and follow the prompts
- Manage privacy: Use the Profile section to control data sharing preferences
- View access history: Monitor who has accessed your data in the Dashboard

### For Researchers

- Browse datasets: Use the Browse section to discover available health data
- Purchase access: Use ETH to purchase access to relevant datasets
- Manage studies: Keep track of your research in the Dashboard

## Contributing

We welcome contributions to Healthmint! Please follow these steps:

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the <LICENSE> file for details.

## Contact

Erik Williams - <erikpw009@gmail.com>

Project Link: <https://github.com/EPW80/Healthmint>
