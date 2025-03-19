// src/components/AppContent.js
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";

// Components
import Navigation from "./Navigation.js";
import DataUpload from "./DataUpload.js";
import DataBrowser from "./DataBrowser.js";
import WalletConnect from "./WalletConnect.js";
import Footer from "./Footer.js";
import ProfileSettings from "./ProfileSettings.js";
import RoleSelector from "./roles/RoleSelector.js";
import PatientDashboard from "./dashboard/PatientDashboard.js";
import ResearcherDashboard from "./dashboard/ResearcherDashboard.js";
import NotificationsContainer from "./ui/NotificationsContainer.js";
import ProtectedRoute from "./ProtectedRoute.js";

// Custom hooks
import useWalletConnection from "../hooks/useWalletConnect.js";
import useNavigation from "../hooks/useNavigation.js";

// Redux actions and selectors
import {
  loginAsync,
  updateActivity,
  selectIsAuthenticated,
  logoutAsync,
} from "../redux/slices/authSlice.js";

import { selectRole, selectIsRoleSelected } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * Main application content with routing and state management
 */
function AppContent() {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();

  // Use our custom wallet hook for wallet state
  const {
    isConnected: isWalletConnected,
    address,
    network,
    switchNetwork,
    disconnectWallet,
  } = useWalletConnection({
    navigateOnDisconnect: true,
  });

  // Auth and role state from Redux
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // User profile data
  const userData = useSelector((state) => state.user.profile);

  // Update auth activity timestamp periodically to keep session alive
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(
        () => {
          dispatch(updateActivity());
        },
        5 * 60 * 1000
      ); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dispatch]);

  // Prompt user to switch networks if not on supported network
  useEffect(() => {
    if (isWalletConnected && network && !network.isSupported) {
      dispatch(
        addNotification({
          type: "warning",
          message: `Please switch to Sepolia Testnet for full functionality`,
          persistent: true,
        })
      );
    }
  }, [isWalletConnected, network, dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isWalletConnected && window.location.pathname === "/login") {
      navigateTo("/select-role", { replace: true });
    }
  }, [isWalletConnected, navigateTo]);

  // Handle successful wallet connection
  const handleConnect = async (walletAddress) => {
    try {
      if (walletAddress) {
        // Attempt to authenticate with backend
        const result = await dispatch(
          loginAsync({
            address: walletAddress,
            // Include any additional auth params needed
          })
        );

        if (loginAsync.fulfilled.match(result)) {
          // Authentication succeeded
          dispatch(
            addNotification({
              type: "success",
              message: "Authentication successful!",
            })
          );
        }

        // Navigate to role selection
        navigateTo("/select-role", { replace: true });
      }
    } catch (error) {
      console.error("Connection handling error:", error);
      dispatch(
        addNotification({
          type: "error",
          message: "Failed to process connection. Please try again.",
        })
      );
    }
  };

  // Handle logout - clear both wallet and auth state
  const handleLogout = () => {
    // Logout from authentication system
    dispatch(logoutAsync());

    // Disconnect wallet using our hook
    disconnectWallet();

    // Navigate to login is handled by the hook
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isWalletConnected && (
        <Navigation
          account={address}
          onLogout={handleLogout}
          userName={userData?.name}
          role={role}
          network={network}
          onSwitchNetwork={switchNetwork}
        />
      )}
      <div className="flex-1 p-5">
        <Routes>
          <Route
            path="/login"
            element={
              isWalletConnected ? (
                <Navigate to="/select-role" replace />
              ) : (
                <WalletConnect onConnect={handleConnect} />
              )
            }
          />

          <Route
            path="/select-role"
            element={
              !isWalletConnected ? (
                <Navigate to="/login" replace />
              ) : isRoleSelected ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <RoleSelector />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {role === "patient" ? (
                  <PatientDashboard onNavigate={navigateTo} />
                ) : (
                  <ResearcherDashboard onNavigate={navigateTo} />
                )}
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
            element={
              <Navigate
                to={
                  !isWalletConnected
                    ? "/login"
                    : !isRoleSelected
                      ? "/select-role"
                      : "/dashboard"
                }
                replace
              />
            }
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
