# Healthmint - Secure Health Data Marketplace

Healthmint is a **decentralized health data platform** that allows users to securely **connect their wallets**, manage their **health records**, and interact with **healthcare providers and researchers**. Built with **React, Redux, Node.js, and Ethereum**, the platform ensures secure transactions, privacy, and **user control over their data**.

---

## **🚀 Features**

### 🔐 **Secure Authentication**

- **MetaMask Wallet Integration**
- **Ethereum-based Login & Identity Verification**
- **Role-based Access Control (Patients, Providers, Researchers)**

### 📂 **Health Data Management**

- **Upload & Store Health Records**
- **Encrypted Data Sharing & Ownership**
- **Manage Access Permissions**
- **Track Transaction History on Blockchain**

### 🛒 **Marketplace Features**

- **Browse Available Health Records**
- **Set Custom Pricing for Data**
- **Purchase Data Using Ethereum**
- **Filter Records by Age, Verification Status, & Category**

### 🔒 **Security & Privacy**

- **Blockchain-based Access Control**
- **Smart Contracts for Data Transactions**
- **Age Verification Enforcement**
- **Transaction Transparency & Logging**

---

## **🛠️ Technology Stack**

### **Frontend**

- React.js (Hooks & Context API)
- Redux Toolkit for State Management
- Material-UI for UI Components
- Ethers.js for Ethereum Integration

### **Backend**

- Node.js & Express.js for API
- MongoDB (Mongoose ODM)
- JWT Authentication & Role Management

### **Blockchain & Storage**

- Ethereum (Sepolia Testnet)
- Solidity Smart Contracts
- Truffle & Hardhat for Blockchain Deployment

---

## **📌 Prerequisites**

Before running the project, ensure you have the following installed:

- **Node.js** (v16+)
- **npm / yarn**
- **MongoDB** (v6.0+)
- **MetaMask Extension**
- **Git**

---

## **📥 Installation & Setup**

### **1️⃣ Clone the Repository**

```bash
git clone https://github.com/EPW80/Healthmint.git
cd Healthmint

2️⃣ Install Dependencies
```

npm install

```

3️⃣ Configure Environment Variables
Create .env files:

📂 Backend (server/.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healthmint
JWT_SECRET=<your_generated_jwt_secret>

📂 Frontend (client/.env)

REACT_APP_API_URL=http://localhost:5000

4️⃣ Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

5️⃣ Start the Development Servers
npm run dev

📂 Project Structure
Healthmint/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── redux/         # Redux state management
│   │   ├── utils/         # Helper functions
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── .env               # Frontend environment variables
├── server/                 # Node.js backend
│   ├── config/            # Server configuration
│   ├── controllers/       # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── package.json       # Backend dependencies
│   ├── server.js          # Entry point
│   └── .env               # Backend environment variables
├── contracts/              # Solidity smart contracts
├── migrations/             # Truffle migrations
├── truffle-config.js       # Truffle configuration
└── README.md               # Project documentation

📌 Development Scripts
Command	Description
npm run dev	Start both client & server in development mode
npm run client	Start only the React frontend
npm run server	Start only the Node.js backend
npm run install-all	Install dependencies for all parts
npm run clean	Remove all node_modules folders

🛠️ Usage Guide
Ensure MongoDB is running
Start the application with npm run dev
Connect your MetaMask wallet
Complete registration & browse health records
Manage & transact securely with Ethereum

📩 API Endpoints
Method	Endpoint	Description
GET	/data/browse	Browse available health records
POST	/auth/wallet/connect	Connect a MetaMask wallet
POST	/auth/register	Register a new user
POST	/data/upload	Upload health data
GET	/transactions	View transaction history

📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

🚀 Get Started & Secure Your Health Data Today!
Connect, share, and trade securely on Healthmint. 🏥 🔐 💡
```
