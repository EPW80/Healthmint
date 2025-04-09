// src/pages/TransactionPage.js
import React, { useState, useCallback, useEffect } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import TransactionHistory from "../components/TransactionHistory.js";
import useWalletConnect from "../hooks/useWalletConnect.js";
import WalletStatus from "../components/WalletStatus.js";
import { useSelector } from "react-redux";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import mockPaymentService from "../services/mockPaymentService.js";

/**
 * TransactionsPage Component
 *
 * Display all blockchain transactions with filtering, export capabilities,
 * and HIPAA-compliant logging
 */
const TransactionsPage = () => {
  // Get wallet connection state
  const { isConnected, address } = useWalletConnect();
  const userRole = useSelector((state) => state.role.role);

  // Local state
  const [exportFormat, setExportFormat] = useState("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh the TransactionHistory component

  // Initialize HIPAA logging for page view
  useEffect(() => {
    const logPageView = async () => {
      try {
        await hipaaComplianceService.createAuditLog("PAGE_VIEW", {
          page: "transactions",
          userRole,
          walletAddress: address,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to log page view:", error);
      }
    };

    if (isConnected && address) {
      logPageView();
    }
  }, [isConnected, address, userRole]);

  // Refresh transaction history
  const handleRefresh = useCallback(() => {
    // Increment key to force the component to re-render and refetch data
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Export transaction history in different formats
  const handleExportHistory = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      // Log the export attempt
      await hipaaComplianceService.createAuditLog("TRANSACTION_EXPORT", {
        action: "EXPORT",
        format: exportFormat,
        userRole,
        walletAddress: address,
        timestamp: new Date().toISOString(),
      });

      // Fetch transaction data for export
      if (!mockPaymentService.isInitialized) {
        await mockPaymentService.initializeProvider();
      }

      const transactions = await mockPaymentService.getPaymentHistory();

      if (!transactions || transactions.length === 0) {
        setExportError("No transactions available to export");
        return;
      }

      // Process data based on export format
      switch (exportFormat) {
        case "csv": {
          // Create CSV headers
          const headers = [
            "Transaction ID",
            "Amount",
            "Date",
            "Dataset ID",
            "Transaction Hash",
            "Block Number",
          ];
          const csvRows = [headers.join(",")];

          // Add transaction data rows
          transactions.forEach((tx) => {
            const row = [
              tx.paymentId,
              tx.amount,
              new Date(tx.timestamp).toISOString(),
              tx.datasetId,
              tx.transactionHash || "N/A",
              tx.blockNumber || "Pending",
            ];
            csvRows.push(row.join(","));
          });

          // Create and download file
          const csvContent = csvRows.join("\n");
          const blob = new Blob([csvContent], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `transaction-history-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }

        case "json": {
          // Format JSON data
          const jsonData = JSON.stringify(transactions, null, 2);
          const blob = new Blob([jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `transaction-history-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }

        case "pdf":
          // For PDF, we'd typically use a library like jsPDF
          // This is a simplified placeholder implementation
          setExportError("PDF export functionality coming soon");
          break;

        default:
          setExportError("Unsupported export format");
          break;
      }

      // Log successful export
      await hipaaComplianceService.createAuditLog(
        "TRANSACTION_EXPORT_SUCCESS",
        {
          action: "EXPORT_COMPLETE",
          format: exportFormat,
          recordCount: transactions.length,
          userRole,
          walletAddress: address,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Export error:", error);
      setExportError(error.message || "Failed to export transaction history");

      // Log export error
      await hipaaComplianceService.createAuditLog("TRANSACTION_EXPORT_ERROR", {
        action: "EXPORT_ERROR",
        format: exportFormat,
        errorMessage: error.message || "Unknown export error",
        userRole,
        walletAddress: address,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, userRole, address]);

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

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            aria-label="Refresh transaction history"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>

          <div className="flex items-center gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white text-sm"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              aria-label="Export format"
              disabled={isExporting}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>

            <button
              onClick={handleExportHistory}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[125px]"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export History
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export error message */}
      {exportError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {exportError}
        </div>
      )}

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
        <TransactionHistory
          key={refreshKey} // Force re-render on refresh
          showFilters={true}
          compact={false}
          limit={0} // Show all transactions
        />
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
