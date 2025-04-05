// src/pages/TransactionsPage.js
import React, { useState } from "react";
import { Download, FileText } from "lucide-react";
import TransactionHistory from "../components/TransactionHistory.js";
import useWalletConnect from "../hooks/useWalletConnect.js";
import WalletStatus from "../components/WalletStatus.js";

const TransactionsPage = () => {
  const { isConnected } = useWalletConnect();
  const [exportFormat, setExportFormat] = useState("csv");

  // This would be implemented with actual functionality in a production app
  const handleExportHistory = () => {
    console.log(`Exporting transaction history as ${exportFormat}`);
    // Implementation would be added here
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage your blockchain transactions and data exchanges
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <div className="flex items-center gap-3">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white text-sm"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              aria-label="Export format"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>

            <button
              onClick={handleExportHistory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export History
            </button>
          </div>
        </div>
      </div>

      {/* Display wallet status */}
      <div className="mb-6">
        <WalletStatus
          showBalance={true}
          showNetwork={true}
          showCopy={true}
          showExplorer={true}
        />
      </div>

      {isConnected ? (
        <TransactionHistory showFilters={true} compact={false} />
      ) : (
        <div className="bg-gray-50 rounded-lg p-10 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Wallet Connected
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Please connect your wallet to view your transaction history.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
