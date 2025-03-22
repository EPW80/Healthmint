// src/components/AppContent.js - Extremely simplified to break infinite loops
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Basic components only
import WalletConnect from "./WalletConnect.js";
import Footer from "./Footer.js";
import NotificationsContainer from "./ui/NotificationsContainer.js";

/**
 * Simplified AppContent to diagnose and fix update loops
 */
function AppContent() {
  // Minimal state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  // Simple connect handler
  const handleConnect = (address) => {
    if (address) {
      console.log("Connected to wallet:", address);
      setIsWalletConnected(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-5">
        <Routes>
          <Route
            path="/login"
            element={
              isWalletConnected ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <WalletConnect onConnect={handleConnect} />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <div className="max-w-4xl mx-auto p-8">
                <h1 className="text-3xl font-bold mb-6">Healthmint Dashboard</h1>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-xl">Welcome to Healthmint!</p>
                  <p className="mt-4">This is a simplified dashboard for debugging.</p>
                  {isWalletConnected && <p className="mt-2 text-green-600">Your wallet is connected.</p>}
                </div>
              </div>
            }
          />

          <Route
            path="*"
            element={<Navigate to={isWalletConnected ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>

      {/* Notifications container */}
      <NotificationsContainer />

      <Footer />
    </div>
  );
}

export default AppContent;