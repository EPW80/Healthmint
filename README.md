Healthmint 🏥
=============

A blockchain-powered health data platform enabling secure and HIPAA-compliant health information exchange.

Overview
--------

Healthmint is a decentralized application (dApp) where patients and researchers can securely interact with health data:

-   **Patients** can upload, manage, and selectively share their health records
-   **Researchers** can discover, purchase, and analyze anonymized health datasets
-   All transactions are securely recorded on the blockchain with complete audit trails
-   HIPAA compliance is maintained throughout the entire platform

Key Features
------------

### User Roles & Management

-   **Dual-role system**: Users can register as either patients or researchers
-   **Wallet-based authentication**: Connect securely with MetaMask
-   **Personalized dashboards**: Role-specific interfaces and functionality
-   **Comprehensive profile management**: Control privacy settings and data sharing preferences

### For Patients 👤

-   **Health record uploads**: Securely store medical documents and data
-   **Granular access control**: Choose what data is shared and with whom
-   **Data anonymization**: Share data while protecting personal information
-   **Monetization options**: Set pricing for researcher access to your data
-   **Complete audit trails**: See who accessed your data and when

### For Researchers 🔬

-   **Dataset discovery**: Browse available health datasets
-   **Advanced filtering**: Find exactly the data you need
-   **Secure purchasing**: Buy access to datasets using ETH
-   **Research credentials**: Showcase your qualifications and publications
-   **Ethics compliance**: Built-in research ethics guidelines

### Security & Compliance 🔐

-   **HIPAA-compliant design**: Full regulatory compliance baked in
-   **Blockchain verification**: Immutable record of all data transactions
-   **Consent management**: Explicit patient consent tracking for all data access
-   **Privacy-preserving tools**: Data anonymization and access controls
-   **Comprehensive audit logging**: Track all system interactions

Technology Stack
----------------

-   **Frontend**: React.js with Redux for state management
-   **UI**: Tailwind CSS with responsive design
-   **Blockchain**: Ethereum (Sepolia testnet) integration
-   **Wallet**: MetaMask integration for authentication and transactions
-   **Security**: HIPAA compliance layer for all data interactions

Project Structure
-----------------

```
healthmint/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── dashboard/   # Dashboard components
│   │   │   ├── profile/     # Profile management
│   │   │   ├── ui/          # Reusable UI elements
│   │   │   └── providers/   # Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── redux/           # Redux state management
│   │   │   └── slices/      # Redux toolkit slices
│   │   ├── services/        # API and blockchain services
│   │   └── utils/           # Utility functions
├── contracts/               # Ethereum smart contracts
├── server/                  # Backend API (Node.js)

```

Getting Started
---------------

### Prerequisites

-   Node.js (v16+)
-   npm or yarn
-   MetaMask browser extension
-   Ethereum on Sepolia testnet

### Installation

1.  Clone the repository

```
git clone https://github.com/EPW80/Healthmint.git
cd Healthmint

```

1.  Install dependencies

```
# Install client dependencies
cd client && npm install

```

1.  Set up environment variables

Create a `.env` file in the client directory:

```
REACT_APP_INFURA_PROJECT_ID=your_infura_project_id
REACT_APP_CHAIN_ID=0xaa36a7  # Sepolia testnet
REACT_APP_NETWORK_ID=11155111

```

1.  Start the development server

```
npm start

```

User Guide
----------

### Connecting Your Wallet

1.  Ensure MetaMask is installed in your browser
2.  Visit the Healthmint website and click "Connect Wallet"
3.  Approve the connection in MetaMask
4.  Complete registration by selecting your role (Patient or Researcher)

### For Patients

-   **Upload health records**: Navigate to the Upload section and follow the prompts
-   **Manage privacy**: Use the Profile section to control data sharing preferences
-   **View access history**: Monitor who has accessed your data in the Dashboard

### For Researchers

-   **Browse datasets**: Use the Browse section to discover available health data
-   **Purchase access**: Use ETH to purchase access to relevant datasets
-   **Manage studies**: Keep track of your research in the Dashboard

Security Features
-----------------

Healthmint takes security and HIPAA compliance seriously:

-   **Data encryption**: All sensitive information is encrypted
-   **Blockchain verification**: All transactions are recorded immutably
-   **Explicit consent**: Patient consent is required and tracked for all data access
-   **Comprehensive audit logs**: All system interactions are logged for compliance
-   **Role-based access control**: Different permissions for different user types

Contributing
------------

We welcome contributions to Healthmint! Please follow these steps:

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

License
-------

This project is licensed under the MIT License - see the [LICENSE](https://claude.ai/chat/LICENSE) file for details.

Contact
-------

Erik Williams - erikpw009@gmail.com

Project Link: <https://github.com/EPW80/Healthmint>

* * * * *

Healthmint - Secure, Private, Compliant Health Data Exchange on the Blockchain