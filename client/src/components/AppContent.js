// src/components/AppContent.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// Components
import WalletConnect from "./WalletConnect.js";
import Navigation from "./Navigation.js";
import Footer from "./Footer.js";
import RoleSelector from "./roles/RoleSelector.js";
import ProtectedRoute from "./ProtectedRoute.js";
import PatientDashboard from "./dashboard/PatientDashboard.js";
import ResearcherDashboard from "./dashboard/ResearcherDashboard.js";
import ProfileSettings from "./ProfileSettings.js";
import DataUpload from "./DataUpload.js";
import DataBrowser from "./DataBrowser.js";

// Hooks and Redux
import useWalletConnect from "../hooks/useWalletConnect.js";
import {
  selectRole,
  selectIsRoleSelected,
  setRole,
  clearRole,
} from "../redux/slices/roleSlice.js";
import {
  updateUserProfile,
  clearUserProfile,
} from "../redux/slices/userSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { clearWalletConnection } from "../redux/slices/walletSlice.js";

/**
 * Main content component with routing
 */
function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();

  // Debug pathname to track navigation
  console.log("Current pathname:", location.pathname);

  // Get wallet connection state
  const {
    isConnected,
    address,
    network,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWalletConnect({
    autoConnect: false, // Force explicit login
  });

  // Get role information from Redux
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceLogout, setForceLogout] = useState(false);

  // First useEffect - Check if we need to force logout on startup (development mode)
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === "development";

    // Always force logout in development mode when starting the app
    if (isDevelopment) {
      console.log("Development mode detected - clearing auth state on startup");
      setForceLogout(true);
    }
  }, []);

  // Second useEffect - Handle initialization and potential forced logout
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (forceLogout) {
          // Clear all auth data for development mode
          console.log("Performing forced logout for clean development start");

          // Clear wallet connection
          await disconnectWallet();
          dispatch(clearWalletConnection());

          // Clear role and user profile
          dispatch(clearRole());
          dispatch(clearUserProfile());

          // Clear localStorage items
          localStorage.removeItem("healthmint_wallet_address");
          localStorage.removeItem("healthmint_wallet_connection");
          localStorage.removeItem("healthmint_user_role");
          localStorage.removeItem("healthmint_user_profile");
          localStorage.removeItem("healthmint_auth_token");
          localStorage.removeItem("healthmint_wallet_state");
          localStorage.removeItem("healthmint_refresh_token");
          localStorage.removeItem("healthmint_token_expiry");

          console.log("Auth state cleared for development");
        } else {
          // Normal initialization flow

          // Load any stored wallet connection info
          const storedAddress = localStorage.getItem(
            "healthmint_wallet_address"
          );
          const storedConnection = localStorage.getItem(
            "healthmint_wallet_connection"
          );

          // If we have stored connection info, update the state
          if (storedAddress && storedConnection) {
            // You may need to call connectWallet() here with the stored info
            // or update the connection state directly
          }

          // Try to load stored role
          const storedRole = localStorage.getItem("healthmint_user_role");
          if (storedRole && !isRoleSelected) {
            dispatch(setRole(storedRole));
          }
        }
      } catch (err) {
        console.error("Error during app initialization:", err);
      } finally {
        // Mark initialization as complete
        setIsInitialized(true);
        // Reset force logout flag
        setForceLogout(false);
      }
    };

    initializeApp();
  }, [dispatch, disconnectWallet, forceLogout, isRoleSelected]);

  // Handle logout - Complete reset of all auth states
  const handleLogout = async () => {
    try {
      console.log("Logging out and clearing all auth state...");

      // 1. Disconnect wallet first
      await disconnectWallet();

      // 2. Clear Redux states
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      // 3. Clear all related localStorage items directly
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_wallet_state");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");

      // 4. Notification of success
      dispatch(
        addNotification({
          type: "info",
          message: "Logged out successfully",
        })
      );

      // 5. Hard redirect to login page
      console.log("Redirecting to login page...");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);

      // Even on error, clear everything and redirect
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_wallet_state");

      window.location.href = "/login";
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      const result = await connectWallet();
      if (result.success) {
        dispatch(updateUserProfile({ address: result.address }));
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully",
          })
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error("Wallet connection error:", error);
      return false;
    }
  };

  // Determine dashboard component based on role
  const getDashboardComponent = () => {
    if (userRole === "researcher") {
      return <ResearcherDashboard />;
    }
    return <PatientDashboard />;
  };

  // Show loading state on initial render
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Only show navigation when authenticated */}
      {isConnected && (
        <Navigation
          account={address}
          onLogout={handleLogout}
          role={userRole}
          network={network}
          onSwitchNetwork={switchNetwork}
        />
      )}

      <div className="flex-1">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={
              isConnected ? (
                // Redirect depending on role selection status
                <Navigate
                  to={isRoleSelected ? "/dashboard" : "/select-role"}
                  replace
                />
              ) : (
                <WalletConnect onConnect={handleConnect} />
              )
            }
          />

          {/* Role Selection Route */}
          <Route
            path="/select-role"
            element={
              !isConnected ? <Navigate to="/login" replace /> : <RoleSelector />
            }
          />

          {/* Dashboard Route - Specifically handle based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[]} requireBackendAuth={false}>
                {getDashboardComponent()}
              </ProtectedRoute>
            }
          />

          {/* Other protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <DataUpload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <DataBrowser />
              </ProtectedRoute>
            }
          />

          {/* Root path */}
          <Route
            path="/"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
              ) : !isRoleSelected ? (
                <Navigate to="/select-role" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* Default redirect - Catch all other routes */}
          <Route
            path="*"
            element={
              !isInitialized ? (
                // Show loading while initializing
                <div className="flex justify-center items-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : !isConnected ? (
                <Navigate to="/login" replace />
              ) : !isRoleSelected ? (
                <Navigate to="/select-role" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
        </Routes>
      </div>

      <Footer />
    </>
  );
}

export default AppContent;
