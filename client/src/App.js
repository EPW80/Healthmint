import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";

// Components
import Navigation from "./components/Navigation";
import DataUpload from "./components/DataUpload";
import DataBrowser from "./components/DataBrowser";
import WalletConnect from "./components/WalletConnect";
import Footer from "./components/Footer";
import ProfileSettings from "./components/ProfileSettings";

// Redux actions and selectors
import {
  updateWalletConnection,
  clearWalletConnection,
  selectWallet,
} from "./redux/slices/authSlice";

import { clearUserProfile, updateUserProfile } from "./redux/slices/userSlice";
import { addNotification } from "./redux/slices/uiSlice";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated ? children : null;
};

function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, account: address } = useSelector(
    (state) => state.auth
  );
  const { isConnected } = useSelector(selectWallet);
  const userData = useSelector((state) => state.user.userData);

  useEffect(() => {
    if (isAuthenticated && window.location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleConnect = async (walletData) => {
    try {
      dispatch(
        updateWalletConnection({
          isConnected: true,
          address: walletData.account,
          provider: walletData.provider,
          signer: walletData.signer,
          walletType: walletData.walletType || "metamask",
        })
      );

      if (walletData.userData) {
        dispatch(
          updateUserProfile({
            address: walletData.account,
            ...walletData.userData,
          })
        );

        dispatch(
          addNotification({
            type: "success",
            message: "Welcome back!",
          })
        );

        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Connection error:", error);
      dispatch(
        addNotification({
          type: "error",
          message: "Failed to connect. Please try again.",
        })
      );
    }
  };

  const handleLogout = () => {
    dispatch(clearWalletConnection());
    dispatch(clearUserProfile());
    dispatch(
      addNotification({
        type: "info",
        message: "Successfully logged out",
      })
    );
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isAuthenticated && (
        <Navigation
          account={address}
          onLogout={handleLogout}
          userName={userData?.name}
        />
      )}
      <div className="flex-1 p-5">
        <Routes>
          <Route
            path="/login"
            element={
              isConnected ? (
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
                <DataBrowser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <DataUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/browse"
            element={
              <ProtectedRoute>
                <DataBrowser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={isConnected ? "/" : "/login"} replace />}
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
