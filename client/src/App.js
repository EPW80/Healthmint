import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navigation from "./components/Navigation";
import DataUpload from "./components/DataUpload";
import DataBrowser from "./components/DataBrowser";
import WalletConnect from "./components/WalletConnect";
import Footer from "./components/Footer";
import ProfileSettings from "./components/ProfileSettings";

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    account: null,
    provider: null,
    signer: null,
  });

  const handleConnect = ({ account, provider, signer }) => {
    setAuth({
      isAuthenticated: true,
      account,
      provider,
      signer,
    });
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      account: null,
      provider: null,
      signer: null,
    });
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!auth.isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {auth.isAuthenticated && (
          <Navigation account={auth.account} onLogout={handleLogout} />
        )}
        <div
          style={{
            flex: "1 0 auto",
            padding: "20px",
          }}
        >
          <Routes>
            <Route
              path="/login"
              element={
                auth.isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <WalletConnect onConnect={handleConnect} />
                )
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DataBrowser
                    provider={auth.provider}
                    signer={auth.signer}
                    account={auth.account}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <DataUpload
                    provider={auth.provider}
                    signer={auth.signer}
                    account={auth.account}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/browse"
              element={
                <ProtectedRoute>
                  <DataBrowser
                    provider={auth.provider}
                    signer={auth.signer}
                    account={auth.account}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings account={auth.account} />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <Navigate to={auth.isAuthenticated ? "/" : "/login"} replace />
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
